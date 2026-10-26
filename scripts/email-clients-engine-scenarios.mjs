import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";

// Integration only: actual temporary Convex/SQLite, independent HTTP callers.
export async function emailClientsScenarios({ setup, date, start, makeClient, race, report, restart }) {
  const minute = 60000, serial = [], raw = who => who.client.query("engineFixtures:emailRaw", {});
  const plain = who => makeClient(who?.identity, undefined, false);
  const email = suffix => `person${suffix}@example.test`;
  async function owner() { const who = await setup("Synthetic email identity"); who.slug = (await who.client.mutation("bookingLinks:setMyBookingLink", { enabled: true })).slug; return who; }
  const context = (who, legacy = false) => ({ name: legacy ? "Synthetic 46" : "Synthetic 30", durationMinutes: legacy ? 46 : 30, version: 0 });
  const priv = (who, contact = email(""), offset = 0, operationId = randomUUID(), name = "Nombre A") => ({ operationId,
    serviceId: who.serviceId, date, start: start + offset, clientName: name, email: contact, expectedService: context(who) });
  const pub = (who, contact = email(""), offset = 0, attemptKey = randomUUID(), name = "Nombre B") => ({ slug: who.slug,
    attemptKey, serviceId: who.serviceId, date, start: start + offset, clientName: name, email: contact, expectedService: context(who) });
  const manual = (contact = email(""), operationId = randomUUID(), name = "Nombre C") => ({ name, email: contact, operationId });
  const op = (who, name, args, kind) => ({ who, name, args, ...(kind ? { kind } : {}) });
  const ok = r => r.status === "fulfilled" && r.value?.ok !== false;
  const label = r => r.status === "rejected" ? String(r.reason).match(/"code":"([A-Z_]+)"/)?.[1] ?? String(r.reason)
    : r.value?.ok === false ? r.value.code : r.value?.outcome ?? (r.value?.ok ? "public-ack" : r.value === null ? "absent" : "found");
  const digest = v => createHash("sha256").update(JSON.stringify(v)).digest("hex");
  function unchangedContext(before, after) { for (const key of ["business", "services", "weeklySchedules", "specialDates", "timeBlocks", "notices"]) assert.deepEqual(after[key], before[key]); }
  function uniqueContacts(state) { const keys = state.clients.filter(c => c.email).map(c => c.businessId + ":" + c.email); assert.equal(new Set(keys).size, keys.length); }
  function verifyLinks(state) {
    for (const row of state.appointments.filter(a => a.automationEnabled)) {
      assert.ok(state.clients.some(c => c._id === row.clientId && c.businessId === row.businessId));
      assert.ok(state.privateReceipts.some(r => r.appointmentId === row._id) || state.receipts.some(r => r.appointmentId === row._id));
    }
    for (const c of state.clients.filter(c => c.email)) assert.ok(state.appointments.some(a => a.clientId === c._id) || state.clientReceipts.some(r => r.clientId === c._id), "No orphan from failed booking");
  }
  async function serialOrders() {
    const controls=[];
    for(const kind of ['manual-private','manual-public','private-public','slot-private-public'])for(const first of [0,1]){
      const who=await owner(),same=email('serial'),left=kind.startsWith('manual')
        ? op(who,'clients:createMyClient',manual(same)) : op(who,'appointments:createMyAppointment',priv(who,same));
      const right=kind==='manual-private' ? op(who,'appointments:createMyAppointment',priv(who,same))
        : op({},'publicBooking:confirm',pub(who,kind.startsWith('slot')?email('loser'):same,kind==='private-public'?60*minute:0));
      const commands=first===0?[left,right]:[right,left],before=await raw(who);
      const invoke=command=>plain(command.who).mutation(command.name,command.args,{skipQueue:true});
      const initial=await invoke(commands[0]),middle=await raw(who);
      assert.notEqual(initial.ok,false);
      const outcome=await Promise.allSettled([invoke(commands[1])]);
      if(kind.startsWith('slot')) {assert.equal(ok(outcome[0]),false);assert.equal(label(outcome[0]),'SLOT_TAKEN');assert.deepEqual(await raw(who),middle);}
      else {assert.equal(ok(outcome[0]),true);assert.deepEqual((await raw(who)).clients,middle.clients);}
      const after=await raw(who);unchangedContext(before,after);uniqueContacts(after);verifyLinks(after);
      assert.equal(after.clients.length,1);assert.equal(after.appointments.length,kind==='private-public'?2:1);
      controls.push({kind,first:first===0?'left-first':'right-first',secondResult:label(outcome[0]),fullDocumentsVerified:true,clients:after.clients,appointments:after.appointments});
    }
    const who=await owner(),command=priv(who);
    await plain(who).mutation('clients:createMyClient',manual(command.email));
    assert.equal(await plain(who).query('appointments:getMyAppointmentCreation',command),null);
    const created=await plain(who).mutation('appointments:createMyAppointment',command),stable=await raw(who);
    assert.equal((await plain(who).query('appointments:getMyAppointmentCreation',command)).appointmentId,created.appointmentId);
    assert.deepEqual(await plain(who).mutation('appointments:createMyAppointment',command),{outcome:'already_applied',appointmentId:created.appointmentId});
    assert.deepEqual(await raw(who),stable);
    controls.push({kind:'exact-query-before-and-after-existing-email-is-not-a-receipt',fullDocumentsVerified:true});
    return controls;
  }
  if(process.argv.includes('--email-orders-only')){report.emailOrders={serialGroups:9,controls:await serialOrders()};return;}

  const cases = ["private-private", "public-private", "public-public", "manual-private", "manual-public", "manual-manual",
    "private-replay", "private-payload", "public-replay", "public-payload", "slot-distinct-emails", "slot-same-email",
    "manual-replay", "manual-payload", "private-recovery", "manual-reused-recovery", "other-business", "homonyms"];
  for (let round = 1; round <= 3; round++) for (const scenario of cases) {
    const a = await owner(), b = scenario === "other-business" ? await owner() : a;
    const c = priv(a), m = manual(), p = pub(a);
    if (scenario === "manual-reused-recovery") await plain(a).mutation("clients:createMyClient", manual(email(""), randomUUID(), "Existing original"));
    let operations;
    switch (scenario) {
      case "private-private": operations = [op(a,"appointments:createMyAppointment",c),op(a,"appointments:createMyAppointment",priv(a," PERSON@EXAMPLE.TEST ",60*minute,randomUUID(),"Nombre B"))]; break;
      case "public-private": operations = [op({},"publicBooking:confirm",p),op(a,"appointments:createMyAppointment",priv(a,email(""),60*minute))]; break;
      case "public-public": operations = [op({},"publicBooking:confirm",p),op({},"publicBooking:confirm",pub(a,email(""),60*minute,randomUUID(),"Otro nombre"))]; break;
      case "manual-private": operations = [op(a,"clients:createMyClient",m),op(a,"appointments:createMyAppointment",c)]; break;
      case "manual-public": operations = [op(a,"clients:createMyClient",m),op({},"publicBooking:confirm",p)]; break;
      case "manual-manual": operations = [op(a,"clients:createMyClient",m),op(a,"clients:createMyClient",manual(email(""),randomUUID(),"Otro nombre"))]; break;
      case "private-replay": operations = [op(a,"appointments:createMyAppointment",c),op(a,"appointments:createMyAppointment",c)]; break;
      case "private-payload": operations = [op(a,"appointments:createMyAppointment",c),op(a,"appointments:createMyAppointment",{...c,email:email("2")})]; break;
      case "public-replay": operations = [op({},"publicBooking:confirm",p),op({},"publicBooking:confirm",p)]; break;
      case "public-payload": operations = [op({},"publicBooking:confirm",p),op({},"publicBooking:confirm",{...p,email:email("2")})]; break;
      case "slot-distinct-emails": operations = [op(a,"appointments:createMyAppointment",c),op({},"publicBooking:confirm",pub(a,email("2")))]; break;
      case "slot-same-email": operations = [op(a,"appointments:createMyAppointment",c),op(a,"appointments:createMyAppointment",priv(a))]; break;
      case "manual-replay": operations = [op(a,"clients:createMyClient",m),op(a,"clients:createMyClient",m)]; break;
      case "manual-payload": operations = [op(a,"clients:createMyClient",m),op(a,"clients:createMyClient",{...m,email:email("2")})]; break;
      case "private-recovery": operations = [op(a,"appointments:createMyAppointment",c),op(a,"appointments:getMyAppointmentCreation",c,"query")]; break;
      case "manual-reused-recovery": operations = [op(a,"clients:createMyClient",m),op(a,"clients:getMyClientCreation",m,"query")]; break;
      case "other-business": operations = [op(a,"appointments:createMyAppointment",c),op(b,"appointments:createMyAppointment",priv(b))]; break;
      case "homonyms": operations = [op(a,"appointments:createMyAppointment",c),op(a,"appointments:createMyAppointment",priv(a,email("2"),60*minute,randomUUID(),c.clientName))]; break;
    }
    if (round === 2) operations.reverse();
    const before = await raw(a), { results, maxInFlight } = await race(operations), after = await raw(a), names = results.map(label);
    unchangedContext(before, after); uniqueContacts(after); verifyLinks(after);
    const conflict = scenario.endsWith("payload") || scenario.startsWith("slot-");
    assert.equal(results.filter(ok).length, conflict ? 1 : 2, scenario + ": " + names.join(","));
    const clients = scenario === "homonyms" ? 2 : 1;
    assert.equal(after.clients.length, clients);
    const expectedAppointments = ["manual-manual","manual-replay","manual-payload","manual-reused-recovery"].includes(scenario) ? 0
      : ["private-private","public-private","public-public","homonyms"].includes(scenario) ? 2 : 1;
    assert.equal(after.appointments.length, expectedAppointments);
    if (scenario === "private-replay" || scenario === "manual-replay") assert.deepEqual([...names].sort(),["already_applied","created"]);
    if (scenario === "manual-manual") assert.deepEqual([...names].sort(),["created","reused"]);
    if (scenario === "private-payload") assert.ok(names.includes("APPOINTMENT_OPERATION_CONFLICT"));
    if (scenario === "manual-payload") assert.ok(names.includes("CLIENT_OPERATION_CONFLICT"));
    if (scenario === "public-payload") assert.ok(names.includes("ATTEMPT_CONFLICT"));
    if (scenario.startsWith("slot-")) assert.ok(names.includes("SLOT_TAKEN"));
    if (scenario === "manual-reused-recovery") assert.deepEqual(after.clients,before.clients);
    if (b !== a) { const other = await raw(b); assert.equal(other.clients.length,1); assert.notEqual(other.clients[0]._id,after.clients[0]._id); verifyLinks(other); }
    for (const operation of operations.filter(o=>o.name === "appointments:createMyAppointment")) {
      const found = await plain(a).query("appointments:getMyAppointmentCreation",operation.args).catch(e=>String(e));
      const prior = after.privateReceipts.find(r=>r.operationId === operation.args.operationId);
      if (prior && prior.requestHash === after.privateReceipts.find(r=>r.operationId === operation.args.operationId)?.requestHash && typeof found !== "string") {
        assert.equal(found.appointmentId,prior.appointmentId);
      }
    }
    const queryIndex = operations.findIndex(o=>o.kind === "query");
    const observedOrder = queryIndex >= 0 ? results[queryIndex].value === null ? "query-before-receipt" : "receipt-before-query"
      : conflict ? `operation-${results.findIndex(ok)+1}-won`
        : names.includes("created") ? `operation-${names.indexOf("created")+1}-created`
          : "both-acknowledged; first-write-order-not-identifiable";
    report.scenarios.push({round,scenario:"email-"+scenario,requests:2,maxInFlight,observedResults:names,observedOrder,
      fullDocumentsVerified:true,contextUnchanged:true,clientCount:after.clients.length,appointmentCount:after.appointments.length,
      clients:after.clients,appointments:after.appointments,clientReceipts:after.clientReceipts,privateReceipts:after.privateReceipts,publicReceipts:after.receipts});
  }

  const who = await owner(), anonymous = makeClient(undefined,undefined,false), foreign = await owner();
  const command = manual("  ANA+tag@EXAMPLE.TEST  ",randomUUID(),"  A\u0301na   Pérez ");
  const first = await plain(who).mutation("clients:createMyClient",command), beforeReuse = await raw(who);
  assert.equal(first.client.email,"ana+tag@example.test"); assert.equal(first.client.name,"Ána Pérez");
  const reuse = manual("ana+tag@example.test",randomUUID(),"Nombre diferente"), reused = await plain(who).mutation("clients:createMyClient",reuse);
  assert.equal(reused.outcome,"reused"); assert.deepEqual(reused.client,first.client);
  assert.deepEqual((await raw(who)).clients,beforeReuse.clients);
  assert.deepEqual(await plain(who).query("clients:getMyClientCreation",reuse),first.client);
  assert.deepEqual(await plain(who).mutation("clients:createMyClient",reuse),{outcome:"already_applied",client:first.client});
  await assert.rejects(plain(who).mutation("clients:createMyClient",{...reuse,name:"Otro"}),/CLIENT_OPERATION_CONFLICT/);
  assert.equal(await plain(who).query("clients:getMyClientCreation",{...reuse,operationId:randomUUID()}),null);
  serial.push("normalized-email-manual-reuse-exact-command-and-immutable-client");

  for (const contact of ["ana@example.test","a.na@example.test","ana+other@example.test"]) await plain(who).mutation("clients:createMyClient",manual(contact));
  assert.equal((await raw(who)).clients.length,4); serial.push("provider-dots-and-tags-are-distinct");
  const invalids=[undefined,"","no-address","a@b","a..b@example.test","a@example.test\n","a\u200b@example.test","a".repeat(255)+"@example.test"];
  for (const contact of invalids) {
    const before = await raw(who);
    await assert.rejects(plain(who).mutation("clients:createMyClient",{...manual(),email:contact}),/INVALID_CLIENT_EMAIL/);
    await assert.rejects(plain(who).mutation("appointments:createMyAppointment",{...priv(who),email:contact}),/INVALID_CLIENT_EMAIL/);
    const publicResult = await anonymous.mutation("publicBooking:confirm",{...pub(who),email:contact});
    assert.equal(publicResult.code,"INVALID_CLIENT_EMAIL"); assert.deepEqual(await raw(who),before);
  }
  serial.push("invalid-or-missing-email-rejected-without-root-documents");

  const legacyKey=randomUUID(),legacyId=await who.client.mutation("engineFixtures:emailLegacyClient",{name:"Legacy Twin",operationId:legacyKey});
  const legacyBefore=(await raw(who)).clients.find(c=>c._id===legacyId);
  const replay=await plain(who).mutation("clients:createMyClient",{name:"Legacy Twin",operationId:legacyKey});
  assert.equal(replay.outcome,"already_applied"); assert.equal(replay.client.email,undefined);
  await assert.rejects(plain(who).mutation("clients:createMyClient",{name:"Legacy Twin",operationId:legacyKey,email:"legacy@example.test"}),/CLIENT_OPERATION_CONFLICT/);
  const selected={...priv(who),clientId:legacyId,clientName:"Caller name ignored"};delete selected.email;
  const linked=await plain(who).mutation("appointments:createMyAppointment",selected),linkedRaw=(await raw(who)).appointments.find(a=>a._id===linked.appointmentId);
  assert.equal(linkedRaw.clientName,"Legacy Twin");assert.equal(linkedRaw.clientId,legacyId);
  assert.deepEqual((await raw(who)).clients.find(c=>c._id===legacyId),legacyBefore);
  await assert.rejects(plain(who).mutation("appointments:createMyAppointment",{...selected,operationId:randomUUID(),email:"x@example.test"}),/CLIENT_IDENTITY_CONFLICT/);
  serial.push("legacy-client-command-and-explicit-id-without-email-preserved");

  const success=priv(who,first.client.email,60*minute,randomUUID(),"Snapshot de reserva"), created=await plain(who).mutation("appointments:createMyAppointment",success);
  const found=await plain(who).query("appointments:getMyAppointmentCreation",success);
  assert.equal(found.clientId,first.client._id);assert.equal(found.clientName,"Snapshot de reserva");
  await who.client.mutation("appointments:rescheduleMyAppointment",{appointmentId:created.appointmentId,expectedVersion:0,date,start:start+90*minute});
  await who.client.mutation("appointments:rescheduleMyAppointment",{appointmentId:created.appointmentId,expectedVersion:1,date,start:start+60*minute});
  await who.client.mutation("appointments:cancelMyAppointment",{appointmentId:created.appointmentId,expectedVersion:2});
  const cancelled=await raw(who);
  assert.deepEqual(await plain(who).mutation("appointments:createMyAppointment",success),{outcome:"already_applied",appointmentId:created.appointmentId});
  assert.deepEqual(await plain(who).query("appointments:getMyAppointmentCreation",success),found);
  assert.deepEqual(await raw(who),cancelled);
  assert.equal(await plain(who).query("appointments:getMyAppointmentCreation",{...success,operationId:randomUUID()}),null);
  for(const change of [{email:"different@example.test"},{clientName:"Another"},{start:success.start+minute},{expectedService:{...success.expectedService,version:1}}])
    await assert.rejects(plain(who).query("appointments:getMyAppointmentCreation",{...success,...change}),/APPOINTMENT_OPERATION_CONFLICT/);
  serial.push("private-receipt-after-move-ABA-cancel-never-reopens-or-matches-another-command");

  const legacyOwner=await owner(),legacyAttempt=randomUUID(),legacyStart=start;
  const legacyAppointment=await legacyOwner.client.mutation("engineFixtures:emailLegacyBooking",{serviceId:legacyOwner.serviceId,date,start:legacyStart,attemptKey:legacyAttempt});
  const oldArgs={slug:legacyOwner.slug,attemptKey:legacyAttempt,serviceId:legacyOwner.serviceId,date,start:legacyStart,clientName:"Legacy email-free"};
  const legacyState=await raw(legacyOwner),receipt=await anonymous.mutation("publicBooking:confirm",oldArgs);
  assert.equal(receipt.ok,true);assert.deepEqual(await raw(legacyOwner),legacyState);
  assert.equal((await anonymous.mutation("publicBooking:confirm",{...oldArgs,email:"extra@example.test"})).code,"ATTEMPT_CONFLICT");
  await legacyOwner.client.mutation("appointments:cancelMyAppointment",{appointmentId:legacyAppointment,expectedVersion:0});
  const afterLegacyCancel=await raw(legacyOwner);
  assert.deepEqual(await anonymous.mutation("publicBooking:confirm",oldArgs),receipt);
  assert.deepEqual(await raw(legacyOwner),afterLegacyCancel);assert.equal(afterLegacyCancel.clients.length,0);
  serial.push("legacy-public-receipt-replays-without-email-or-new-client-after-cancellation");

  const publicOwner=await owner(), publicCommand=pub(publicOwner,"public@example.test"), acknowledged=await anonymous.mutation("publicBooking:confirm",publicCommand);
  assert.equal(acknowledged.ok,true);assert.deepEqual(Object.keys(acknowledged).sort(),["ok","receipt"]);
  assert.deepEqual(Object.keys(acknowledged.receipt).sort(),["date","end","serviceName","start","timeZone"]);
  const publicState=await raw(publicOwner),original=publicState.appointments[0];
  await publicOwner.client.mutation("appointments:rescheduleMyAppointment",{appointmentId:original._id,expectedVersion:0,date,start:start+60*minute});
  await publicOwner.client.mutation("appointments:cancelMyAppointment",{appointmentId:original._id,expectedVersion:1});
  const publicCancelled=await raw(publicOwner);
  assert.deepEqual(await anonymous.mutation("publicBooking:confirm",publicCommand),acknowledged);
  assert.equal((await anonymous.mutation("publicBooking:confirm",{...publicCommand,email:"changed@example.test"})).code,"ATTEMPT_CONFLICT");
  assert.deepEqual(await raw(publicOwner),publicCancelled);assert.deepEqual(publicCancelled.receipts,publicState.receipts);
  serial.push("new-public-immutable-contact-free-receipt-after-move-cancel-and-email-conflict");

  for(const args of [{...priv(foreign),clientId:legacyId,email:undefined},{...priv(who),serviceId:foreign.serviceId}]) {
    const caller=args.serviceId===foreign.serviceId&&args.clientId?foreign:who,before=await raw(caller);
    await assert.rejects(plain(caller).mutation("appointments:createMyAppointment",args),/CLIENT_NOT_FOUND|SERVICE_NOT_FOUND/);assert.deepEqual(await raw(caller),before);
  }
  await assert.rejects(anonymous.mutation("appointments:createMyAppointment",priv(who)),/UNAUTHENTICATED/);
  await assert.rejects(anonymous.mutation("clients:createMyClient",manual()),/UNAUTHENTICATED/);
  await assert.rejects(anonymous.query("appointments:getMyAppointmentCreation",success),/UNAUTHENTICATED/);
  await assert.rejects(anonymous.query("clients:getMyClientCreation",reuse),/UNAUTHENTICATED/);
  await assert.rejects(anonymous.query("clients:listMyClients",{search:"",paginationOpts:{cursor:null,numItems:20}}),/UNAUTHENTICATED/);
  await assert.rejects(plain(foreign).query("clients:getMyClient",{clientId:legacyId}),/CLIENT_NOT_FOUND/);
  await assert.rejects(plain(foreign).query("clients:listMyClientAppointments",{clientId:legacyId,paginationOpts:{cursor:null,numItems:20}}),/CLIENT_NOT_FOUND/);
  assert.equal(await plain(foreign).query("appointments:getMyAppointmentCreation",success),null);
  serial.push("no-auth-cross-owner-and-command-scope-denials");

  const failed=await owner(),failureBefore=await raw(failed);
  for(const bad of [{start:start+1},{date:"2026-02-30"},{expectedService:{...context(failed),version:7}},{clientName:"bad\u200bname"}]) {
    await assert.rejects(plain(failed).mutation("appointments:createMyAppointment",{...priv(failed),...bad}));
    assert.equal((await anonymous.mutation("publicBooking:confirm",{...pub(failed),...bad})).ok,false);assert.deepEqual(await raw(failed),failureBefore);
  }
  serial.push("validation-service-context-and-availability-failures-leave-no-client-or-receipt");
  const capacity=await owner();await capacity.client.mutation("engineFixtures:emailDenseCapacity",{serviceId:capacity.serviceId,date,start});const denseBefore=await raw(capacity);
  await assert.rejects(plain(capacity).mutation("appointments:createMyAppointment",priv(capacity)),/DAY_CAPACITY_EXCEEDED/);
  assert.equal((await anonymous.mutation("publicBooking:confirm",pub(capacity))).code,"DAY_CAPACITY_EXCEEDED");assert.deepEqual(await raw(capacity),denseBefore);
  serial.push("complete-day-capacity-rejection-without-orphans");
  const quota=await owner(),quotaBefore=await raw(quota);
  for(let i=0;i<10;i++)assert.equal((await anonymous.mutation("publicBooking:confirm",pub(quota,"invalid"))).code,"INVALID_CLIENT_EMAIL");
  assert.equal((await anonymous.mutation("publicBooking:confirm",pub(quota))).code,"RATE_LIMITED");assert.deepEqual(await raw(quota),quotaBefore);
  serial.push("public-rate-quota-policy-retained-without-client-side-effects");

  const catalog=await owner(),revisionArgs={slug:catalog.slug,serviceId:catalog.serviceId,date},digestBefore=await anonymous.query("publicBooking:getAvailabilityRevision",revisionArgs);
  await plain(catalog).mutation("clients:createMyClient",manual("secret@example.test"));
  assert.equal(await anonymous.query("publicBooking:getAvailabilityRevision",revisionArgs),digestBefore);
  assert.deepEqual(Object.keys(await anonymous.query("publicBooking:getBusiness",{slug:catalog.slug})).sort(),["name","timeZone"]);
  serial.push("client-data-does-not-enter-public-dto-or-availability-digest");

  await catalog.client.mutation("engineFixtures:emailDenseClients",{});
  let cursor=null,ids=[],sizes=[];do{const page=await plain(catalog).query("clients:listMyClients",{search:" ERÍCA ",paginationOpts:{numItems:1000,cursor}});assert.ok(page.page.length<=20);ids.push(...page.page.map(c=>c._id));sizes.push(page.page.length);cursor=page.isDone?null:page.continueCursor;}while(cursor);
  assert.equal(ids.length,145);assert.equal(new Set(ids).size,145);const all=await raw(catalog);assert.equal(all.clients.length,206);
  const firstPage=await plain(catalog).query("clients:listMyClients",{search:"",paginationOpts:{numItems:20,cursor:null}}),secondPage=await plain(catalog).query("clients:listMyClients",{search:"",paginationOpts:{numItems:20,cursor:firstPage.continueCursor}});
  async function expanded(cursor,endCursor){const page=await plain(catalog).query("clients:listMyClients",{search:"",paginationOpts:{numItems:1000,cursor,endCursor}});assert.ok(page.page.length<=20);if(page.pageStatus==="SplitRequired"){assert.ok(page.splitCursor);return [...await expanded(cursor,page.splitCursor),...await expanded(page.splitCursor,endCursor)];}return page.page;}
  assert.deepEqual((await expanded(null,secondPage.continueCursor)).map(c=>c._id),[...firstPage.page,...secondPage.page].map(c=>c._id));
  serial.push("indexed-prefix-pagination-20-cap-and-expanded-reactive-range-with-emails");

  const historical=await owner(),historicalCommand={...priv(historical,"history@example.test"),serviceId:historical.secondServiceId,expectedService:context(historical,true)},historicalCreated=await plain(historical).mutation("appointments:createMyAppointment",historicalCommand);
  const historicBefore=(await raw(historical)).appointments[0];assert.equal(historicBefore.end-historicBefore.start,46*minute);
  await historical.client.mutation("services:changeMyService",{id:historical.secondServiceId,expectedVersion:0,operationId:randomUUID(),change:{kind:"edit",name:"Current 35",durationMinutes:35}});
  await historical.client.mutation("appointments:rescheduleMyAppointment",{appointmentId:historicalCreated.appointmentId,expectedVersion:0,date,start:start+60*minute});
  const moved=(await raw(historical)).appointments[0];assert.equal(moved.end-moved.start,46*minute);assert.equal(moved.serviceName,"Synthetic 46");assert.equal(moved.clientId,historicBefore.clientId);assert.equal(moved.clientName,historicBefore.clientName);
  const history=await plain(historical).query("clients:listMyClientAppointments",{clientId:moved.clientId,paginationOpts:{cursor:null,numItems:1000}});assert.equal(history.page.length,1);assert.equal(history.page[0].serviceName,"Synthetic 46");
  serial.push("historical-46-minute-service-snapshot-and-client-link-survive-catalog-change-and-move");

  await who.client.mutation("engineFixtures:emailLaterClientName",{clientId:first.client._id,name:"Later client name"});
  assert.deepEqual(await plain(who).query("clients:getMyClientCreation",reuse),first.client);
  assert.deepEqual(await plain(who).mutation("clients:createMyClient",reuse),{outcome:"already_applied",client:first.client});
  serial.push("manual-reuse-receipt-preserves-original-acknowledgement-after-later-record-change");
  const restartStates=await Promise.all([raw(who),raw(publicOwner),raw(historical)]);await restart();
  assert.deepEqual(await Promise.all([raw(who),raw(publicOwner),raw(historical)]),restartStates);
  assert.deepEqual(await plain(who).query("appointments:getMyAppointmentCreation",success),found);
  assert.deepEqual(await anonymous.mutation("publicBooking:confirm",publicCommand),acknowledged);
  assert.deepEqual(await plain(who).query("clients:getMyClientCreation",reuse),first.client);
  assert.deepEqual(await Promise.all([raw(who),raw(publicOwner),raw(historical)]),restartStates);
  serial.push("exact-receipts-and-complete-documents-persist-after-sqlite-restart");
  const orderControls = await serialOrders();
  serial.push(...orderControls.map(control => `deterministic-${control.kind}-${control.first ?? "both"}`));
  report.emailClients={orderControls,serialGroups:serial.length,serial,prefixPages:sizes,persistenceAfterRestart:true,
    protectedContextUnchanged:true,publicReceiptKeys:Object.keys(acknowledged.receipt).sort(),finalSnapshotsSha256:restartStates.map(digest)};
}
