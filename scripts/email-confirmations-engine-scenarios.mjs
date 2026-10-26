import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function startControlledEmailProvider() {
  const requests = [], accepted = new Map(), plans = new Map(), held = [];
  const server = createServer(async (req, res) => {
    let body = ""; for await (const chunk of req) body += chunk;
    const payload = JSON.parse(body), key = req.headers["idempotency-key"];
    assert.equal(req.method, "POST"); assert.equal(req.url, "/emails");
    assert.equal(req.headers.authorization, "Bearer re_synthetic_confirmation_only");
    const record = { key, body, receivedAt: Date.now(), recipient: payload.to[0], userAgentPresent: !!req.headers["user-agent"] };
    requests.push(record);
    const plan = plans.get(payload.to[0])?.shift() ?? {};
    const answer = (status, value) => { record.response = status; if (!res.destroyed) { res.writeHead(status, { "Content-Type": "application/json", ...(plan.headers ?? {}) }); res.end(plan.raw ?? JSON.stringify(value)); } };
    if (plan.status && plan.status >= 400) return answer(plan.status, { name: plan.name ?? "synthetic_error", message: "Synthetic provider rejection" });
    const prior = accepted.get(key);
    if (prior && prior.body !== body) return answer(409, { name: "invalid_idempotent_request" });
    const value = prior ?? { body, id: randomUUID() };
    if (!plan.disconnect || plan.accept) accepted.set(key, value);
    if (plan.disconnect) { record.response = "connection-lost"; return req.socket.destroy(); }
    if (plan.hold) { held.push({ key, release: () => answer(200, { id: value.id }) }); return; }
    answer(200, { id: value.id });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}/emails`, requests, accepted,
    plan: (email, steps) => plans.set(email, [...steps]),
    release: key => { for (const entry of held.filter(h => h.key === key)) entry.release(); },
    close: async () => { for (const h of held) h.release(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); },
  };
}

export async function confirmationEmailScenarios({ setup, date, start, makeClient, race, report, provider, setEmailEnvironment, restart }) {
  const serial = [], raw = who => who.client.query("engineFixtures:emailRaw", {}), events = who => who.client.query("engineFixtures:mailRaw", {});
  const client = who => makeClient(who?.identity, undefined, false);
  const context = { name: "Synthetic 30", durationMinutes: 30, version: 0 };
  const email = () => `mail-${randomUUID()}@example.test`;
  const privateCommand = (who, to = email(), offset = 0) => ({ operationId: randomUUID(), serviceId: who.serviceId, date, start: start + offset, clientName: "Reservation snapshot", email: to, expectedService: context });
  const publicCommand = (who, command) => { const { operationId, ...rest } = command; return { ...rest, slug: who.slug, attemptKey: operationId }; };
  const op = (who, name, args, kind) => ({ who, name, args, ...(kind ? { kind } : {}) });
  const ok = result => result.status === "fulfilled" && result.value?.ok !== false;
  const label = result => result.status === "rejected" ? String(result.reason).match(/"code":"([A-Z_]+)"/)?.[1] ?? "rejected"
    : result.value?.outcome ?? (result.value?.ok ? "public-ack" : result.value?.code ?? (result.value?.generation ? "claimed" : result.value));
  async function until(read, predicate, message, timeout = 12_000) {
    const end = Date.now() + timeout; let value;
    do { value = await read(); if (predicate(value)) return value; await delay(40); } while (Date.now() < end);
    throw Error(`${message}: ${JSON.stringify(value)}`);
  }
  async function owner(enabled = true, name = "Synthetic mail business") {
    const who = await setup(name); who.slug = (await who.client.mutation("bookingLinks:setMyBookingLink", { enabled: true })).slug;
    if (enabled) await client(who).mutation("emailConfirmations:setMySettings", { enabled: true, expectedVersion: 0 });
    return who;
  }
  const event = async (who, id) => (await events(who)).find(e => e._id === id);
  const settled = (who, id, state) => until(() => event(who, id), e => e?.state === state, `Expected ${state}`);
  const calls = e => provider.requests.filter(r => r.key === e.providerKey);
  const immutable = e => ({ businessId: e.businessId, appointmentId: e.appointmentId, snapshot: e.snapshot, recipient: e.recipient, payloadJson: e.payloadJson, providerKey: e.providerKey, createdAt: e.createdAt });
  async function deferred(who, to = email(), offset = 0, name) {
    const result = await client(who).mutation("engineFixtures:mailDeferred", { serviceId: who.serviceId, date, start: start + offset, email: to, ...(name ? { name } : {}) });
    const e = await event(who, result.eventId); assert.equal(e.attempts, 0); assert.equal(calls(e).length, 0); return { ...result, initial: e };
  }
  const run = (who, id) => client(who).mutation("emailConfirmations:start", { eventId: id });
  async function due(who, id) { await client(who).mutation("engineFixtures:mailDue", { eventId: id }); await run(who, id); }
  function samePayload(e) { const sent = calls(e); assert(sent.length > 0); assert(sent.every(r => r.body === e.payloadJson && r.key === e.providerKey && r.userAgentPresent)); }
  function contextSame(a, b) { for (const key of ["services", "weeklySchedules", "specialDates", "timeBlocks", "notices"]) assert.deepEqual(b[key], a[key]); }
  async function record(name, who, details = {}) { serial.push({ name, fullDocumentsVerified: true, ...details, documents: { context: await raw(who), events: await events(who) } }); }

  await setEmailEnvironment(true);
  if (process.argv.includes("--confirmation-orders-only")) {
    for (const kind of ["private-payload", "public-payload", "slot-public-private"]) for (const first of [0, 1]) {
      const who = await owner(), command = privateCommand(who), publicArgs = publicCommand(who, command);
      const operations = kind === "public-payload" ? [op({}, "publicBooking:confirm", publicArgs), op({}, "publicBooking:confirm", { ...publicArgs, email: email() })]
        : [op(who, "appointments:createMyAppointment", command), kind === "private-payload" ? op(who, "appointments:createMyAppointment", { ...command, email: email() }) : op({}, "publicBooking:confirm", publicCommand(who, { ...command, operationId: randomUUID(), email: email() }))];
      const execute = operation => client(operation.who).mutation(operation.name, operation.args, { skipQueue: true });
      const initial = await execute(operations[first]); assert(initial?.ok !== false);
      const saved = await until(() => events(who), rows => rows.length === 1 && rows[0].state === "sent", "Serial winner sent"), original = await raw(who);
      const losing = await Promise.allSettled([execute(operations[1 - first])]); assert.equal(losing.filter(ok).length, 0);
      assert.deepEqual(await raw(who), original); assert.deepEqual(await events(who), saved); assert.equal(calls(saved[0]).length, 1);
      await record(`serial-${kind}-participant-${first + 1}-first`, who, { serialOrder: [first + 1, 2 - first], rejectedResult: label(losing[0]) });
    }
    {
      const who=await owner(),to=email();provider.plan(to,[{status:429,raw:"null",headers:{"retry-after":"120"}},{}]);const seed=await deferred(who,to);await run(who,seed.eventId);
      const queued=await until(()=>event(who,seed.eventId),e=>e.state==="queued"&&e.attempts===1,"429 with null JSON body");assert(queued.nextAttemptAt-queued.updatedAt>=120000);
      await due(who,seed.eventId);const e=await settled(who,seed.eventId,"sent");assert.equal(e.attempts,2);samePayload(e);assert(JSON.parse(e.payloadJson).html.includes("overflow-wrap:anywhere"));await record("429-null-body-retains-retry-after-and-final-template",who);
    }
    report.confirmationOrders = { serialGroups: serial.length, serial, races: 0, requestsInRaces: 0, realEmailsSent: 0, providerRequests: provider.requests, logicalProviderAcceptances: provider.accepted.size };
    return;
  }
  const cases = ["private-replay", "public-replay", "slot-public-private", "private-two-slots", "private-payload", "public-payload", "claims", "finalization", "settings", "settings-creation"];
  for (let round = 1; round <= 3; round++) for (const scenario of cases) {
    const who = await owner(scenario !== "settings-creation"), command = privateCommand(who);
    let operations, seeded, before;
    if (scenario === "claims" || scenario === "finalization") {
      const to = email(); provider.plan(to, [{ hold: true, accept: true }]); seeded = await deferred(who, to);
      if (scenario === "claims") operations = [op(who,"emailConfirmations:start",{eventId:seeded.eventId}),op(who,"emailConfirmations:start",{eventId:seeded.eventId})];
      else {
        await run(who, seeded.eventId);
        const active = await until(() => event(who, seeded.eventId), e => e.dispatchedAt !== undefined && calls(e).length === 1, "Provider request entered");
        const args = { eventId: seeded.eventId, generation: active.generation, outcome: "accepted", providerMessageId: provider.accepted.get(active.providerKey).id };
        operations = [op(who,"emailConfirmations:finish",args),op(who,"emailConfirmations:finish",args)];
      }
    } else if (scenario === "settings") operations = [op(who,"emailConfirmations:setMySettings",{enabled:false,expectedVersion:1}),op(who,"emailConfirmations:setMySettings",{enabled:false,expectedVersion:1})];
    else if (scenario === "settings-creation") operations = [op(who,"emailConfirmations:setMySettings",{enabled:true,expectedVersion:0}),op(who,"appointments:createMyAppointment",command)];
    else if (scenario === "public-replay" || scenario === "public-payload") {
      const pub = publicCommand(who, command); operations = [op({},"publicBooking:confirm",pub),op({},"publicBooking:confirm",scenario === "public-payload" ? {...pub,email:email()} : pub)];
    } else operations = [op(who,"appointments:createMyAppointment",command), scenario === "slot-public-private" ? op({},"publicBooking:confirm",publicCommand(who,{...command,operationId:randomUUID(),email:email()}))
      : op(who,"appointments:createMyAppointment",scenario === "private-two-slots" ? {...command,operationId:randomUUID(),start:start+60*60000} : scenario === "private-payload" ? {...command,email:email()} : command)];
    before = await raw(who);
    const {results,maxInFlight}=await race(operations);
    if (["private-payload","public-payload","slot-public-private","settings"].includes(scenario)) assert.equal(results.filter(ok).length,1);
    else assert(results.every(ok));
    if(scenario === "claims") {
      assert.equal(results.filter(r=>r.status==="fulfilled"&&r.value?.generation).length,1);
      const active=await until(()=>event(who,seeded.eventId),e=>calls(e).length===1,"Single claimed send"); provider.release(active.providerKey); await settled(who,seeded.eventId,"sent");
    } else if(scenario === "finalization") { assert.deepEqual(results.map(r=>r.value).sort(),["applied","stale"]); provider.release(seeded.initial.providerKey); }
    else if(scenario !== "settings") await until(()=>events(who),rows=>rows.length===(scenario==="private-two-slots"?2:1)&&rows.every(e=>e.state==="sent"||e.state==="disabled"),"Creation events settled");
    const after=await raw(who), rows=await events(who);contextSame(before,after);
    if(!scenario.startsWith("settings"))assert.deepEqual(after.business,before.business);
    if(scenario!=="settings"){
      assert.equal(after.appointments.length,scenario==="private-two-slots"?2:1);assert.equal(rows.length,after.appointments.length);
      for(const e of rows){const a=after.appointments.find(a=>a._id===e.appointmentId);assert(a);assert.equal(e.snapshot.start,a.start);assert.equal(e.snapshot.end,a.end);assert.equal(e.snapshot.clientName,a.clientName);if(e.state==="sent"){samePayload(e);assert.equal(calls(e).length,1);}else assert.equal(calls(e).length,0);}
    } else {assert.equal(rows.length,0);assert.equal(after.business.emailConfirmationsEnabled,false);assert.equal(after.business.emailConfirmationsVersion,2);}
    const effects = results.map((result, index) => ({ participant: index + 1, result: label(result) }));
    report.scenarios.push({round,scenario:`confirmation-${scenario}`,requests:2,maxInFlight,observedResults:results.map(label),participantEffects:effects,
      serializationOrder:"not measured; Promise.allSettled preserves participant order", ...(scenario === "settings-creation" ? { enabledAtBookingCommit: rows[0].state !== "disabled" } : {}),
      fullDocumentsVerified:true,documents:{before,after,events:rows},otherScheduledExecutorsNotCounted:true});
    if (scenario === cases.at(-1)) console.log(`Confirmaciones: ronda ${round}/3 de carreras completada.`);
  }

  // Defaults, readiness and legacy are exercised without provider traffic.
  {
    const who=await owner(false), command=privateCommand(who);assert.deepEqual(await client(who).query("emailConfirmations:getMySettings",{}),{enabled:false,version:0,configured:true});
    await client(who).mutation("appointments:createMyAppointment",command);const e=(await events(who))[0];assert.equal(e.state,"disabled");assert.equal(e.attempts,0);assert.equal(calls(e).length,0);
    await client(who).mutation("emailConfirmations:setMySettings",{enabled:true,expectedVersion:0});await run(who,e._id);assert.deepEqual((await events(who))[0],e);
    const before=await events(who);await client(who).mutation("clients:createMyClient",{name:"Manual only",email:email(),operationId:randomUUID()});await client(who).query("emailConfirmations:getMyAppointmentStatus",{appointmentId:e.appointmentId});assert.deepEqual(await events(who),before);
    await record("default-off-no-backfill-or-events-from-reads-and-manual-client",who);
  }
  {
    await setEmailEnvironment(false);const who=await owner(false);assert.equal((await client(who).query("emailConfirmations:getMySettings",{})).configured,false);
    await assert.rejects(client(who).mutation("emailConfirmations:setMySettings",{enabled:true,expectedVersion:0}),/EMAIL_NOT_CONFIGURED/);
    await client(who).mutation("engineFixtures:mailLegacyFlag",{enabled:true});await client(who).mutation("appointments:createMyAppointment",privateCommand(who));
    const e=(await events(who))[0];assert.equal(e.state,"not_configured");assert.equal(e.attempts,0);assert.equal(calls(e).length,0);await record("missing-configuration-blocks-activation-never-booking",who);await setEmailEnvironment(true);
  }
  {
    const who=await owner(), id=await client(who).mutation("engineFixtures:emailLegacyClient",{name:"Legacy without email",operationId:randomUUID()});
    const {email:unused,...command}=privateCommand(who);void unused;await client(who).mutation("appointments:createMyAppointment",{...command,clientId:id});
    const e=(await events(who))[0];assert.equal(e.state,"no_recipient");assert.equal(e.recipient,undefined);assert.equal(e.attempts,0);assert.equal(calls(e).length,0);assert.equal((await raw(who)).clients[0].email,undefined);await record("explicit-legacy-id-valid-booking-no-recipient-no-profile-write",who);
  }
  {
    const who=await owner(), before=await raw(who);await assert.rejects(client(who).mutation("engineFixtures:mailRollback",{serviceId:who.serviceId,date,start,email:email()}),/Synthetic transaction rollback/);assert.deepEqual(await raw(who),before);assert.deepEqual(await events(who),[]);
    await assert.rejects(client(who).mutation("appointments:createMyAppointment",{...privateCommand(who),expectedService:{...context,version:500}}),/SERVICE_CHANGED/);assert.deepEqual(await raw(who),before);assert.deepEqual(await events(who),[]);await record("transaction-rollback-and-rejected-booking-no-event-or-orphans",who);
  }
  for(const change of ["cancel","move","ABA","disable","claimed-cancel","claimed-disable"]){
    const who=await owner(), seed=await deferred(who), initial=seed.initial;
    if(change.startsWith("claimed"))await client(who).mutation("engineFixtures:mailPhase",{eventId:seed.eventId,phase:"claimed"});
    if(change.includes("disable"))await client(who).mutation("emailConfirmations:setMySettings",{enabled:false,expectedVersion:1});
    else if(change.includes("cancel"))await client(who).mutation("appointments:cancelMyAppointment",{appointmentId:seed.appointmentId,expectedVersion:0});
    else {await client(who).mutation("appointments:rescheduleMyAppointment",{appointmentId:seed.appointmentId,expectedVersion:0,date,start:start+60*60000});if(change==="ABA")await client(who).mutation("appointments:rescheduleMyAppointment",{appointmentId:seed.appointmentId,expectedVersion:1,date,start});}
    const original=await raw(who);
    if(change.startsWith("claimed"))assert.equal(await client(who).mutation("emailConfirmations:authorize",{eventId:seed.eventId,generation:1}),null);else await run(who,seed.eventId);
    const e=await event(who,seed.eventId);assert.equal(e.state,change.includes("disable")?"disabled":"suppressed");assert.equal(calls(e).length,0);assert.deepEqual(immutable(e),immutable(initial));assert.deepEqual(await raw(who),original);await record(`before-dispatch-${change}`,who);
  }
  for(const specification of [
    {name:"500-backoff",steps:[{status:500},{}],delay:30000},
    {name:"408-request-timeout",steps:[{status:408},{}],delay:30000},
    {name:"429-retry-after",steps:[{status:429,headers:{"Retry-After":"120"}},{}],delay:120000},
    {name:"409-concurrent-idempotency",steps:[{status:409,name:"concurrent_idempotent_requests"},{}],delay:30000},
    {name:"lost-accepted-response",steps:[{disconnect:true,accept:true},{}],delay:30000},
    {name:"real-http-timeout",steps:[{hold:true,accept:true},{}],delay:30000},
  ]){
    const who=await owner(), to=email();provider.plan(to,specification.steps);const seed=await deferred(who,to), original=await raw(who);await run(who,seed.eventId);
    let e=await until(()=>event(who,seed.eventId),e=>e.state==="queued"&&e.attempts===1,specification.name,21000);
    assert(e.nextAttemptAt-e.updatedAt>=specification.delay);const frozen=e;await run(who,seed.eventId);assert.deepEqual(await event(who,seed.eventId),frozen);assert.equal(calls(e).length,1);
    await due(who,seed.eventId);e=await settled(who,seed.eventId,"sent");provider.release(e.providerKey);assert.equal(e.attempts,2);samePayload(e);assert.equal(calls(e).length,2);assert.equal(provider.accepted.get(e.providerKey).id,e.providerMessageId);assert.deepEqual(await raw(who),original);assert.deepEqual(immutable(e),immutable(seed.initial));await record(specification.name,who,{backoffObserved: frozen.nextAttemptAt-frozen.updatedAt,secondAttemptDueSetOnlyBySyntheticFixture:true});
  }
  for(const [status,name]of [[400,"validation_error"],[401,"unauthorized"],[403,"forbidden"],[422,"suppressed_recipient"],[409,"invalid_idempotent_request"],[429,"daily_quota_exceeded"],[429,"monthly_quota_exceeded"]]){
    const who=await owner(),to=email();provider.plan(to,[{status,name}]);const seed=await deferred(who,to), original=await raw(who);await run(who,seed.eventId);const e=await settled(who,seed.eventId,"failed");assert.equal(e.attempts,1);assert.equal(calls(e).length,1);await run(who,e._id);assert.deepEqual(await event(who,e._id),e);assert.deepEqual(await raw(who),original);await record(`permanent-${status}-${name}`,who);
  }
  for(const uncertain of [false,true]){
    const who=await owner(),to=email();provider.plan(to,Array.from({length:3},()=>uncertain?{disconnect:true}:{status:503}));const seed=await deferred(who,to),original=await raw(who);await run(who,seed.eventId);
    for(let attempt=1;attempt<=3;attempt++){const e=await until(()=>event(who,seed.eventId),e=>e.attempts===attempt&&e.state!="sending","Attempt settled");if(attempt<3){assert.equal(e.state,"queued");assert(e.nextAttemptAt-e.updatedAt>=30000*2**(attempt-1));await due(who,seed.eventId);}}
    const e=await event(who,seed.eventId);assert.equal(e.state,uncertain?"review":"failed");assert.equal(e.attempts,3);samePayload(e);assert.equal(calls(e).length,3);await run(who,e._id);assert.deepEqual(await event(who,e._id),e);assert.deepEqual(await raw(who),original);await record(`three-total-attempts-${uncertain?"uncertain":"503"}`,who);
  }
  for(const later of ["permanent","configuration","disable","cancel","window"]){
    const who=await owner(),to=email();provider.plan(to,[{disconnect:true,accept:true},{status:403}]);const seed=await deferred(who,to),original=await raw(who);await run(who,seed.eventId);let e=await until(()=>event(who,seed.eventId),e=>e.state==="queued"&&e.uncertain,"Uncertain attempt");
    if(later==="configuration")await setEmailEnvironment(false);
    if(later==="disable")await client(who).mutation("emailConfirmations:setMySettings",{enabled:false,expectedVersion:1});
    if(later==="cancel")await client(who).mutation("appointments:cancelMyAppointment",{appointmentId:seed.appointmentId,expectedVersion:0});
    if(later==="window")await client(who).mutation("engineFixtures:mailPhase",{eventId:seed.eventId,phase:"expired-window"});
    else await client(who).mutation("engineFixtures:mailDue",{eventId:seed.eventId});
    await run(who,seed.eventId);e=await settled(who,seed.eventId,"review");assert.equal(e.attempts,later==="permanent"?2:1);assert.equal(calls(e).length,later==="permanent"?2:1);assert(provider.accepted.has(e.providerKey));assert.deepEqual(immutable(e),immutable(seed.initial));
    if(later!=="cancel"&&later!=="disable")assert.deepEqual(await raw(who),original);await record(`uncertain-then-${later}-remains-review`,who);if(later==="configuration")await setEmailEnvironment(true);
  }
  {
    const who=await owner(),to=email();provider.plan(to,[{status:429,headers:{"retry-after":"86400"}}]);const seed=await deferred(who,to);await run(who,seed.eventId);const e=await settled(who,seed.eventId,"review");assert.equal(e.lastError,"idempotency_window_elapsed");assert.equal(e.attempts,1);assert.equal(calls(e).length,1);await record("retry-after-outside-retention-never-scheduled",who);
  }
  {
    const who=await owner(),to=email();provider.plan(to,[{hold:true,accept:true},{}]);const seed=await deferred(who,to),original=await raw(who);await run(who,seed.eventId);let old=await until(()=>event(who,seed.eventId),e=>e.dispatchedAt!==undefined&&calls(e).length===1,"First worker dispatched");
    const duplicate=await race([op(who,"emailDispatch:send",{eventId:old._id,generation:old.generation},"action"),op(who,"emailDispatch:send",{eventId:old._id,generation:old.generation},"action")]);assert(duplicate.results.every(ok));assert.equal(calls(old).length,1);
    report.scenarios.push({round:1,scenario:"confirmation-duplicate-actions",requests:2,maxInFlight:duplicate.maxInFlight,observedResults:duplicate.results.map(label),fullDocumentsVerified:true});
    await client(who).mutation("engineFixtures:mailPhase",{eventId:old._id,phase:"expired-lease"});await run(who,old._id);const final=await settled(who,old._id,"sent");assert.equal(final.generation,2);assert.equal(final.attempts,2);samePayload(final);assert.equal(calls(final).length,2);provider.release(old.providerKey);
    assert.equal(await client(who).mutation("emailConfirmations:finish",{eventId:old._id,generation:old.generation,outcome:"permanent",error:"provider_rejected"}),"stale");assert.deepEqual(await event(who,old._id),final);assert.deepEqual(await raw(who),original);await record("expired-lease-fencing-old-worker-and-duplicate-action",who);
  }
  {
    const who=await owner(),to=email();provider.plan(to,[{status:503},{}]);const seed=await deferred(who,to);await run(who,seed.eventId);const e=await until(()=>event(who,seed.eventId),e=>e.state==="queued"&&e.attempts===1,"Durable retry queued"), original=await raw(who);
    await restart();assert.deepEqual(await event(who,e._id),e);assert.deepEqual(await raw(who),original);const final=await until(()=>event(who,e._id),e=>e.state==="sent","Scheduler retry after actual wait and restart",45000);assert.equal(final.attempts,2);assert(final.acceptedAt>=e.nextAttemptAt);samePayload(final);assert.deepEqual(await raw(who),original);await record("durable-sqlite-restart-and-real-scheduled-backoff",who,{realScheduledRetry:true});
  }
  {
    const who=await owner(),seed=await deferred(who),other=await owner();for(const outsider of [makeClient(),client(other)])await assert.rejects(outsider.query("emailConfirmations:getMyAppointmentStatus",{appointmentId:seed.appointmentId}),/UNAUTHENTICATED|APPOINTMENT_NOT_FOUND/);
    await assert.rejects(makeClient().query("emailConfirmations:getMySettings",{}),/UNAUTHENTICATED/);await assert.rejects(makeClient().mutation("emailConfirmations:setMySettings",{enabled:true,expectedVersion:1}),/UNAUTHENTICATED/);
    await assert.rejects(makeClient().mutation("emailConfirmations:start",{eventId:seed.eventId}));await assert.rejects(makeClient().action("emailDispatch:send",{eventId:seed.eventId,generation:1}));
    const publicBusiness=await makeClient().query("publicBooking:getBusiness",{slug:who.slug});assert.deepEqual(Object.keys(publicBusiness).sort(),["name","timeZone"]);await run(who,seed.eventId);await settled(who,seed.eventId,"sent");const status=await client(who).query("emailConfirmations:getMyAppointmentStatus",{appointmentId:seed.appointmentId});assert.deepEqual(Object.keys(status).sort(),["attempts","state"]);await record("owner-only-status-and-settings-internal-send-public-privacy",who);
  }
  {
    const who=await owner(true,'Business <img src=x>\r\nInjected: value'),seed=await deferred(who,email(),0,'Client <script>bad</script> & "quoted"');const body=JSON.parse(seed.initial.payloadJson);assert(!body.html.includes("<script>"));assert(!body.html.includes("<img src=x>"));assert(body.html.includes("&lt;script&gt;"));assert(body.html.includes("&lt;img src=x&gt;"));assert(!/[\r\n]/.test(body.subject));assert(body.html.includes('lang="es-UY" dir="ltr"'));assert(body.html.includes("<title>"));assert(body.text.includes("09:30–10:00"));assert(body.text.includes("America/Montevideo"));
    await client(who).mutation("engineFixtures:mailRenameBusiness",{name:"Different business now"});await run(who,seed.eventId);const e=await settled(who,seed.eventId,"sent");assert.deepEqual(immutable(e),immutable(seed.initial));samePayload(e);await record("escaped-html-headers-text-accessibility-immutable-rendered-snapshot",who);
  }
  // Explicit serial orders complement the recorded races; they are not races.
  {
    const who=await owner(),command={...privateCommand(who),serviceId:who.secondServiceId,expectedService:{name:"Synthetic 46",durationMinutes:46,version:0}};
    await client(who).mutation("appointments:createMyAppointment",command);const e=await until(()=>events(who),e=>e[0]?.state==="sent","46-minute confirmation");
    assert.equal(e[0].snapshot.end-e[0].snapshot.start,46*60000);assert(JSON.parse(e[0].payloadJson).text.includes("09:30–10:16"));samePayload(e[0]);await record("server-46-minute-snapshot-in-email",who);
  }
  {
    const who=await owner(),to=email();await client(who).mutation("clients:createMyClient",{name:"Stored profile must stay private",email:to,operationId:randomUUID()});
    const profiles=(await raw(who)).clients,command=privateCommand(who,to);await client(who).mutation("appointments:createMyAppointment",command);
    const pub=publicCommand(who,{...privateCommand(who,to,60*60000),clientName:"Public reservation snapshot"});const accepted=await makeClient().mutation("publicBooking:confirm",pub);
    await until(()=>events(who),rows=>rows.length===2&&rows.every(e=>e.state==="sent"),"Snapshots accepted");
    const original=await raw(who),originalEvents=await events(who);assert.deepEqual(original.clients,profiles);
    for(const e of originalEvents){const payload=JSON.parse(e.payloadJson);assert(!payload.html.includes("Stored profile must stay private"));assert(payload.text.includes(e.snapshot.clientName));samePayload(e);}
    assert(await client(who).query("appointments:getMyAppointmentCreation",command));assert.equal((await client(who).mutation("appointments:createMyAppointment",command)).outcome,"already_applied");
    assert.deepEqual(await raw(who),original);assert.deepEqual(await events(who),originalEvents);
    const publicAppointment=original.receipts.find(r=>r.attemptKey===pub.attemptKey).appointmentId;await client(who).mutation("appointments:cancelMyAppointment",{appointmentId:publicAppointment,expectedVersion:0});
    const cancelled=await raw(who);assert.deepEqual(await makeClient().mutation("publicBooking:confirm",pub),accepted);assert.deepEqual(await raw(who),cancelled);assert.deepEqual(await events(who),originalEvents);assert.deepEqual(Object.keys(accepted.receipt).sort(),["date","end","serviceName","start","timeZone"]);
    await record("reservation-snapshots-not-existing-profile-private-recovery-public-replay-after-cancel",who);
  }
  {
    const who=await owner(),key=randomUUID();const id=await client(who).mutation("engineFixtures:emailLegacyBooking",{serviceId:who.serviceId,date,start,attemptKey:key}),original=await raw(who);
    assert.deepEqual(await client(who).query("emailConfirmations:getMyAppointmentStatus",{appointmentId:id}),{state:"not_requested",attempts:0});
    assert((await client().mutation("publicBooking:confirm",{slug:who.slug,attemptKey:key,serviceId:who.serviceId,date,start,clientName:"Legacy email-free"})).ok);assert.deepEqual(await raw(who),original);assert.deepEqual(await events(who),[]);await record("legacy-public-receipt-no-retroactive-event",who);
  }
  {
    const who=await owner(),to=email();provider.plan(to,Array.from({length:3},()=>({hold:true,accept:true})));const seed=await deferred(who,to);await run(who,seed.eventId);
    for(let count=1;count<=3;count++){
      await until(()=>event(who,seed.eventId),e=>e.attempts===count&&e.dispatchedAt!==undefined&&calls(e).length===count,"Lease attempt dispatched");
      await client(who).mutation("engineFixtures:mailPhase",{eventId:seed.eventId,phase:"expired-lease"});await run(who,seed.eventId);
    }
    const e=await settled(who,seed.eventId,"review");assert.equal(e.attempts,3);assert.equal(calls(e).length,3);samePayload(e);provider.release(e.providerKey);await client(who).action("emailDispatch:send",{eventId:e._id,generation:1});assert.deepEqual(await event(who,e._id),e);assert.equal(calls(e).length,3);await record("watchdog-three-claims-and-stale-authorize-no-fourth-request",who);
  }
  {
    const who=await owner(),seed=await deferred(who);await client(who).mutation("engineFixtures:mailPhase",{eventId:seed.eventId,phase:"claimed"});await client(who).mutation("engineFixtures:mailPhase",{eventId:seed.eventId,phase:"expired-window"});
    assert.equal(await client(who).mutation("emailConfirmations:authorize",{eventId:seed.eventId,generation:1}),null);const e=await event(who,seed.eventId);assert.equal(e.state,"review");assert.equal(calls(e).length,0);await record("retention-deadline-rechecked-at-dispatch-boundary",who);
  }
  for(const first of ["enable","booking"]){
    const who=await owner(false),command=privateCommand(who);const enable=()=>client(who).mutation("emailConfirmations:setMySettings",{enabled:true,expectedVersion:0}),book=()=>client(who).mutation("appointments:createMyAppointment",command);
    if(first==="enable"){await enable();await book();await until(()=>events(who),e=>e[0]?.state==="sent","Enabled first");}else{await book();await enable();}
    const e=(await events(who))[0];assert.equal(e.state,first==="enable"?"sent":"disabled");await record(`serial-${first}-first`,who,{serialOrder:first});
  }
  report.confirmations={serialGroups:serial.length,serial,providerRequests:provider.requests,logicalProviderAcceptances:provider.accepted.size,
    provider:'controlled HTTP loopback stub ONLY in owned temporary engine workspace',realEmailsSent:0,appDatabase:'real Convex/SQLite',keyAndPayloadFrozen:true,productionProviderUrlNotConfigurable:true,
    limits:'No inbox delivery, real Resend account, cloud concurrency, Clerk, or native email-client certification. Synthetic fixtures defer jobs/seed worker phases and adjust due/lease timestamps only in the temporary database; one actual scheduled backoff is awaited across restart.'};
}
