import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// HTTP integration only. Every snapshot/fixture executes inside real SQLite.
export async function clientsScenarios({ setup, date, start, makeClient, race, report, restart }) {
  const serial = [];
  const linkedAttentionDocuments = [];
  const raw = who => who.client.query("engineFixtures:clientsRaw", {});
  const createArgs = (name = "Ána Pérez", operationId = randomUUID()) => ({ name, operationId });
  const create = (who, args = createArgs()) => who.client.mutation("clients:createMyClient", args);
  const op = (who, args) => ({ who, name: "clients:createMyClient", args });
  const label = result => result.status === "fulfilled" ? result.value?.outcome ?? "found-or-absent"
    : String(result.reason).match(/"code":"([A-Z_]+)"/)?.[1] ?? String(result.reason);
  const snapshotClient = client => ({ _id: client._id, name: client.name, createdAt: client.createdAt });
  async function pages(who, endpoint, args) {
    let cursor = null, rows = [], sizes = [], cursors = new Set();
    for (;;) {
      const result = await who.client.query(endpoint, { ...args, paginationOpts: { numItems: 1000, cursor } });
      assert.ok(result.page.length <= 20, "Server page cap was bypassed");
      rows.push(...result.page); sizes.push(result.page.length);
      if (result.isDone) break;
      assert.ok(!cursors.has(result.continueCursor), "Pagination did not progress");
      cursors.add(result.continueCursor); cursor = result.continueCursor;
    }
    assert.equal(new Set(rows.map(row => row._id)).size, rows.length);
    return { rows, sizes };
  }
  function verifyClientDelta(before, after, commands) {
    assert.deepEqual(after.appointments, before.appointments);
    assert.deepEqual(after.receipts, before.receipts);
    assert.deepEqual(after.notices, before.notices);
    for (const row of before.clients) assert.deepEqual(after.clients.find(saved => saved._id === row._id), row);
    for (const row of after.clients.filter(row => !before.clients.some(old => old._id === row._id))) {
      const command = commands.find(command => command.operationId === row.creationKey && command.name === row.name);
      assert.ok(command);
      assert.deepEqual(row, { _id: row._id, _creationTime: row._creationTime, businessId: row.businessId,
        name: command.name, normalizedName: command.name.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es").trim().replace(/\s+/g, " "),
        createdAt: row.createdAt, creationKey: command.operationId });
      assert.ok(Number.isFinite(row.createdAt));
    }
  }

  for (let round = 1; round <= 3; round++) {
    for (const scenario of ["same-command", "same-command-other-payload", "independent-homonyms", "independent-businesses", "recovery-during-create"]) {
      const a = await setup("Synthetic clients concurrency"), b = scenario === "independent-businesses" ? await setup() : a;
      const first = createArgs("Ana Pérez"), second = scenario === "independent-homonyms" ? createArgs(first.name)
        : scenario === "same-command-other-payload" ? { ...first, name: "Ana Ortiz" } : first;
      let ops = [op(a, first), op(b, second)];
      if (scenario === "recovery-during-create") ops[1] = { who: a, kind: "query", name: "clients:getMyClientCreation", args: first };
      if (round === 2) ops.reverse();
      const beforeA = await raw(a), beforeB = b !== a && await raw(b);
      const { results, maxInFlight } = await race(ops), afterA = await raw(a), afterB = b !== a && await raw(b);
      const names = results.map(label);
      assert.equal(results.filter(row => row.status === "fulfilled").length, scenario === "same-command-other-payload" ? 1 : 2);
      assert.equal(afterA.clients.length - beforeA.clients.length, scenario === "independent-homonyms" ? 2 : 1);
      if (scenario === "same-command") assert.deepEqual([...names].sort(), ["already_applied", "created"]);
      if (scenario === "same-command-other-payload") assert.ok(names.includes("CLIENT_OPERATION_CONFLICT"));
      verifyClientDelta(beforeA, afterA, [first, second]);
      if (b !== a) { assert.equal(afterB.clients.length, 1); verifyClientDelta(beforeB, afterB, [second]); }
      for (const command of [first, second]) {
        const matched = afterA.clients.find(row => row.creationKey === command.operationId && row.name === command.name);
        if (matched) assert.deepEqual(await a.client.query("clients:getMyClientCreation", command), snapshotClient(matched));
      }
      report.scenarios.push({ round, scenario: `clients-${scenario}`, requests: 2, maxInFlight, observedResults: names,
        observedOrder: scenario === "same-command-other-payload" ? `operation-${names.indexOf("created") + 1}-won`
          : scenario === "same-command" ? `operation-${names.indexOf("created") + 1}-created`
            : scenario === "recovery-during-create" ? results[ops.findIndex(operation => operation.kind === "query")].value === null ? "query-before-create" : "create-before-query" : "both-compatible",
        fullDocumentsVerified: true, before: beforeA, after: afterA });
    }
    const who = await setup("Synthetic linked slot race"), a = (await create(who)).client, b = (await create(who)).client;
    const commands = [a, b].map(client => ({ who, name: "appointments:createMyAppointment", args: { serviceId: who.serviceId, date, start, clientId: client._id, clientName: "Untrusted name ignored" } }));
    if (round === 2) commands.reverse();
    const before = await raw(who), { results, maxInFlight } = await race(commands), after = await raw(who);
    assert.equal(results.filter(row => row.status === "fulfilled").length, 1);
    assert.equal(after.appointments.length, 1); assert.deepEqual(after.clients, before.clients);
    const winner = commands[results.findIndex(row => row.status === "fulfilled")], saved = after.appointments[0];
    const chosen = [a,b].find(client => client._id === winner.args.clientId);
    assert.deepEqual(saved, { _id: saved._id, _creationTime: saved._creationTime, businessId: who.businessId,
      clientId: chosen._id, clientName: chosen.name, serviceId: who.serviceId, serviceName: "Synthetic 30", date, start, end: start + 1800000, status: "confirmed", automationEnabled: true });
    assert.deepEqual(after.receipts, before.receipts);
    report.scenarios.push({ round, scenario: "linked-clients-same-capacity", requests: 2, maxInFlight,
      observedResults: results.map(row => row.status === "fulfilled" ? "created" : label(row)), observedOrder: `operation-${results.findIndex(row => row.status === "fulfilled") + 1}-won`, fullDocumentsVerified: true, finalDocument: saved });
  }

  const who = await setup("Synthetic clients serial"), foreign = await setup("Synthetic foreign clients"), anonymous = makeClient();
  const normalizedCommand = createArgs("  A\u0301na   Pérez  ");
  const initial = await raw(who), result = await create(who, normalizedCommand), saved = (await raw(who)).clients[0];
  assert.equal(result.client.name, "Ána Pérez"); assert.equal(result.outcome, "created");
  assert.deepEqual(await create(who, normalizedCommand), { outcome: "already_applied", client: result.client });
  assert.deepEqual(await who.client.query("clients:getMyClientCreation", normalizedCommand), result.client);
  assert.deepEqual((await raw(who)).clients, [saved]);
  await assert.rejects(create(who, { ...normalizedCommand, name: "Otra persona" }), /CLIENT_OPERATION_CONFLICT/);
  await assert.rejects(who.client.query("clients:getMyClientCreation", { ...normalizedCommand, name: "Otra persona" }), /CLIENT_OPERATION_CONFLICT/);
  assert.equal(await who.client.query("clients:getMyClientCreation", createArgs(result.client.name)), null);
  assert.deepEqual(await raw(who), { ...initial, clients: [saved] });
  serial.push("normalization-replay-lost-response-exact-recovery-and-payload-conflict-full-documents");
  for (const name of ["", " ", "x".repeat(101), "A\u0000B", "A\u200bB", "A\tB", "A\nB"]) await assert.rejects(create(who, createArgs(name)), /INVALID_CLIENT_NAME/);
  await assert.rejects(create(who, createArgs("Valid", "bad-id")), /INVALID_OPERATION/);
  assert.deepEqual((await raw(who)).clients, [saved]);
  serial.push("invalid-names-controls-and-operation-id-immutable");
  for (const endpoint of ["clients:listMyClients", "clients:getMyClient", "clients:listMyClientAppointments", "clients:getMyClientCreation"]) {
    const args = endpoint.includes("listMyClients") ? { search: "", paginationOpts: { numItems: 20, cursor: null } }
      : endpoint.includes("Appointments") ? { clientId: saved._id, paginationOpts: { numItems: 20, cursor: null } }
        : endpoint.includes("Creation") ? normalizedCommand : { clientId: saved._id };
    await assert.rejects(anonymous.query(endpoint, args), /UNAUTHENTICATED/);
    if (endpoint === "clients:getMyClient" || endpoint.includes("Appointments")) await assert.rejects(foreign.client.query(endpoint, args), /CLIENT_NOT_FOUND/);
  }
  await assert.rejects(anonymous.mutation("clients:createMyClient", createArgs()), /UNAUTHENTICATED/);
  const booking = { serviceId: who.serviceId, date, start, clientName: "Forged", clientId: saved._id };
  await assert.rejects(foreign.client.mutation("appointments:createMyAppointment", { ...booking, serviceId: foreign.serviceId }), /CLIENT_NOT_FOUND/);
  await assert.rejects(anonymous.mutation("appointments:createMyAppointment", booking), /UNAUTHENTICATED/);
  assert.equal((await pages(foreign, "clients:listMyClients", { search: "" })).rows.length, 0);
  assert.equal(await foreign.client.query("clients:getMyClientCreation", normalizedCommand), null);
  serial.push("no-auth-and-foreign-ownership-all-private-resources");

  const dense = await setup("Synthetic dense directory");
  await dense.client.mutation("engineFixtures:clientsDense", { count: 205 });
  const denseBefore = await raw(dense);
  const all = await pages(dense, "clients:listMyClients", { search: "" });
  const prefixes = await pages(dense, "clients:listMyClients", { search: "  ÉRICA   AL " });
  assert.equal(all.rows.length, 205); assert.equal(prefixes.rows.length, 145);
  assert.deepEqual(prefixes.rows, (await pages(dense, "clients:listMyClients", { search: "erica al" })).rows);
  assert.ok(prefixes.rows.every(row => row.name.startsWith("Érica") || row.name.startsWith("Erica")));
  assert.equal((await pages(dense, "clients:listMyClients", { search: "alvarez" })).rows.length, 0);
  assert.deepEqual(all.rows, (await pages(dense, "clients:listMyClients", { search: "" })).rows);
  const firstWindow = await dense.client.query("clients:listMyClients", {search:"",paginationOpts:{numItems:20,cursor:null}});
  const secondWindow = await dense.client.query("clients:listMyClients", {search:"",paginationOpts:{numItems:20,cursor:firstWindow.continueCursor}});
  const expanded = await dense.client.query("clients:listMyClients", {search:"",paginationOpts:{numItems:1000,cursor:null,endCursor:secondWindow.continueCursor,maximumRowsRead:10000}});
  assert.ok(expanded.page.length<=20); assert.equal(expanded.isDone,false);
  async function splitWindow(endpoint,args,cursor,endCursor,depth=0,reader=dense.client){
    assert.ok(depth<12,"Split failed to make progress");
    const response=await reader.query(endpoint,{...args,paginationOpts:{cursor,endCursor,numItems:1000}});
    assert.ok(response.page.length<=20);
    if(response.pageStatus!=="SplitRequired")return response.page;
    assert.ok(response.splitCursor&&response.splitCursor!==cursor&&response.splitCursor!==endCursor);
    assert.equal(response.page.length,0,"Expanded ranges are withheld until split, not silently sliced");
    return [...await splitWindow(endpoint,args,cursor,response.splitCursor,depth+1,reader),...await splitWindow(endpoint,args,response.splitCursor,endCursor,depth+1,reader)];
  }
  const exactWindow=await splitWindow("clients:listMyClients",{search:""},null,secondWindow.continueCursor);
  assert.deepEqual(exactWindow,[...firstWindow.page,...secondWindow.page]);
  for (const numItems of [0, -1, 1.5]) await assert.rejects(dense.client.query("clients:listMyClients", { search: "", paginationOpts: { cursor: null, numItems } }), /INVALID_PAGINATION/);
  for (const search of ["x".repeat(101), "bad\u0000"]) await assert.rejects(dense.client.query("clients:listMyClients", { search, paginationOpts: { cursor: null, numItems: 20 } }), /INVALID_CLIENT_SEARCH/);
  assert.deepEqual(await raw(dense), denseBefore);
  serial.push("dense-prefix-pages-20-cap-unaccented-stable-ties-and-read-only");
  serial.push("reactive-endCursor-and-caller-read-bound-cannot-exceed20");

  const twin = (await create(who, createArgs(result.client.name))).client;
  assert.notEqual(twin._id, saved._id);
  await who.client.mutation("engineFixtures:clientHistorySeed", { clientId: saved._id, serviceId: who.secondServiceId, count: 47 });
  await who.client.mutation("engineFixtures:clientHistorySeed", { clientId: twin._id, serviceId: who.serviceId, count: 23 });
  const legacyId = await who.client.mutation("engineFixtures:pastAppointment", { serviceId: who.serviceId, receiptKey: randomUUID() });
  const historyBefore = await raw(who);
  const historyA = await pages(who, "clients:listMyClientAppointments", { clientId: saved._id });
  const historyB = await pages(who, "clients:listMyClientAppointments", { clientId: twin._id });
  assert.equal(historyA.rows.length, 47); assert.equal(historyB.rows.length, 23);
  const historyFirst=await who.client.query("clients:listMyClientAppointments",{clientId:saved._id,paginationOpts:{cursor:null,numItems:20}});
  const historySecond=await who.client.query("clients:listMyClientAppointments",{clientId:saved._id,paginationOpts:{cursor:historyFirst.continueCursor,numItems:20}});
  const historyExpanded=await who.client.query("clients:listMyClientAppointments",{clientId:saved._id,paginationOpts:{cursor:null,numItems:1000,endCursor:historySecond.continueCursor,maximumRowsRead:10000}});
  assert.ok(historyExpanded.page.length<=20); assert.equal(historyExpanded.isDone,false);
  assert.deepEqual(await splitWindow("clients:listMyClientAppointments",{clientId:saved._id},null,historySecond.continueCursor,0,who.client),[...historyFirst.page,...historySecond.page]);
  assert.equal(new Set(historyA.rows.map(row => row.status)).size, 4);
  for (const history of [historyA, historyB]) {
    assert.ok(history.rows.every((row, index) => index === 0 || history.rows[index-1].start >= row.start));
    for (const row of history.rows) {
      const original = historyBefore.appointments.find(original => original._id === row._id);
      assert.deepEqual(row, Object.fromEntries(["_id","clientName","serviceName","date","start","end","status"].map(key => [key,original[key]])));
    }
  }
  assert.ok(!historyA.rows.some(row => historyB.rows.some(other => other._id === row._id)));
  assert.ok(!historyA.rows.some(row => row._id === legacyId));
  assert.deepEqual(await raw(who), historyBefore);
  serial.push("two-homonyms-paginated-histories-47-and-23-four-states-and-historical-snapshots");

  // Free/private/public stay unlinked. Public allowlists and immutable receipts
  // are checked before and after creating more private client records.
  const bookingWho = await setup("Synthetic privacy"), linked = (await create(bookingWho)).client;
  await bookingWho.client.mutation("bookingLinks:setMyBookingLink", { enabled: true });
  const link = await bookingWho.client.query("bookingLinks:getMyBookingLink", {}), slug = link.slug;
  const publicBefore = { business: await anonymous.query("publicBooking:getBusiness", { slug }),
    services: await anonymous.query("publicBooking:listServices", { slug, paginationOpts: { numItems: 20, cursor: null } }),
    availability: await anonymous.query("publicBooking:getAvailabilityRevision", { slug, date, serviceId: bookingWho.serviceId }) };
  await create(bookingWho, createArgs("Private hidden name"));
  const publicAfter = { business: await anonymous.query("publicBooking:getBusiness", { slug }),
    services: await anonymous.query("publicBooking:listServices", { slug, paginationOpts: { numItems: 20, cursor: null } }),
    availability: await anonymous.query("publicBooking:getAvailabilityRevision", { slug, date, serviceId: bookingWho.serviceId }) };
  assert.deepEqual(publicAfter, publicBefore);
  assert.ok(!/clientId|createdAt|creationKey|Private hidden/.test(JSON.stringify(publicAfter)));
  const publicCommand = { slug, serviceId: bookingWho.serviceId, date, start, clientName: linked.name, attemptKey: randomUUID() };
  const receipt = await anonymous.mutation("publicBooking:confirm", publicCommand);
  assert.equal(receipt.ok, true);
  const freeId = await bookingWho.client.mutation("appointments:createMyAppointment", { serviceId: bookingWho.serviceId, date, start: start+1800000, clientName: linked.name });
  const linkedId = await bookingWho.client.mutation("appointments:createMyAppointment", { serviceId: bookingWho.secondServiceId, date, start: start+3600000, clientId: linked._id, clientName: "FORGED" });
  const privacyRaw = await raw(bookingWho);
  assert.equal(privacyRaw.appointments.find(row => row._id === freeId).clientId, undefined);
  assert.equal(privacyRaw.appointments.find(row => row._id === linkedId).clientName, linked.name);
  assert.equal(privacyRaw.appointments.filter(row => row.clientId !== undefined).length, 1);
  assert.deepEqual(await anonymous.mutation("publicBooking:confirm", publicCommand), receipt);
  assert.deepEqual(await raw(bookingWho), privacyRaw);
  assert.ok(!JSON.stringify(receipt).includes("clientId"));
  serial.push("public-dto-digest-free-appointments-no-auto-link-and-original-receipt-immutable");

  // Keep the historical 46-minute interval when catalogue changes to 35.
  let service = await bookingWho.client.query("services:getMyService", { id: bookingWho.secondServiceId });
  await bookingWho.client.mutation("services:changeMyService", { id: service._id, expectedVersion: service.version, operationId: randomUUID(), change: { kind: "edit", name: "Current 35", durationMinutes: 35 } });
  const old = (await raw(bookingWho)).appointments.find(row => row._id === linkedId);
  await bookingWho.client.mutation("appointments:rescheduleMyAppointment", { appointmentId: linkedId, expectedVersion: 0, date, start: start+5400000 });
  const moved = (await raw(bookingWho)).appointments.find(row => row._id === linkedId);
  assert.deepEqual(moved, { ...old, start:start+5400000,end:start+5400000+46*60000,version:1,rescheduledAt:moved.rescheduledAt,rescheduledFromVersion:0 });
  await bookingWho.client.mutation("appointments:cancelMyAppointment", { appointmentId: linkedId, expectedVersion: 1 });
  const cancelled = (await raw(bookingWho)).appointments.find(row => row._id === linkedId);
  assert.deepEqual(cancelled, { ...moved,status:"cancelled",version:2,cancelledAt:cancelled.cancelledAt });
  assert.deepEqual((await raw(bookingWho)).receipts, privacyRaw.receipts);
  serial.push("linked-move-cancel-historical-46-after-catalogue-35-full-documents");

  for (const result of ["completed","no_show"]) {
    const pastId = await who.client.mutation("engineFixtures:pastAppointment", { serviceId:who.secondServiceId });
    await who.client.mutation("engineFixtures:clientAttachFixture", { appointmentId:pastId,clientId:twin._id });
    const before=(await raw(who)).appointments.find(row=>row._id===pastId), operationId=randomUUID();
    const marked=await who.client.mutation("appointments:markMyAppointmentResult", {appointmentId:pastId,expectedVersion:0,operationId,result});
    const after=(await raw(who)).appointments.find(row=>row._id===pastId);
    assert.deepEqual(after,{...before,status:result,version:1,resultAt:after.resultAt,lastResultOperationId:operationId,lastResultExpectedVersion:0,lastResultValue:JSON.stringify(["result",result]),resultUndo:{operationId,version:1,status:"confirmed"}});
    const undoId=randomUUID();
    await who.client.mutation("appointments:undoMyAppointmentResult", {appointmentId:pastId,expectedVersion:1,targetOperationId:marked.undo.operationId,operationId:undoId});
    const undone=(await raw(who)).appointments.find(row=>row._id===pastId);
    assert.deepEqual(undone,{...before,version:2,lastResultOperationId:undoId,lastResultExpectedVersion:1,lastResultValue:JSON.stringify(["undo-result",operationId])});
  }
  serial.push("linked-results-and-undo-retain-id-name-interval-and-versions");
  for (const kind of ["arrival", "absence", "legacy"]) {
    const managed = kind !== "legacy";
    const id = await who.client.mutation("engineFixtures:attentionSeed", { serviceId:who.secondServiceId,offset:kind==="arrival"?120000:-3600000,managed });
    await who.client.mutation("engineFixtures:clientAttachFixture", {appointmentId:id,clientId:twin._id});
    const windowOperationId=randomUUID();
    const transition = await who.client.mutation("engineFixtures:attentionBoundary", {appointmentId:id,delta:kind==="arrival"?0:-1,kind:kind==="arrival"?"arrival":"absence",operationId:windowOperationId});
    assert.equal(transition.code,undefined);
    if(kind==="legacy") { assert.deepEqual(transition.after,transition.before); linkedAttentionDocuments.push({kind,controlledTemporalFixture:true,...transition});continue; }
    const effectiveId=kind==="arrival"?windowOperationId:`auto_no_show:${id}:0`;
    assert.deepEqual(transition.after,{...transition.before,status:kind==="arrival"?"completed":"no_show",version:1,resultAt:transition.now,
      lastResultOperationId:effectiveId,lastResultExpectedVersion:0,lastResultValue:JSON.stringify(kind==="arrival"?["arrival-window","arrival"]:["auto-no-show"]),
      ...(kind==="arrival"?{arrivedAt:transition.now,holdsSlot:true}:{}),resultUndo:{operationId:effectiveId,version:1,status:"confirmed",kind:kind==="arrival"?"arrival":"auto_no_show"}});
    for (const key of ["_id","businessId","clientId","clientName","serviceId","serviceName","date","start","end"]) assert.deepEqual(transition.after[key],transition.before[key]);
    assert.equal(transition.after.status,kind==="arrival"?"completed":"no_show");
    assert.equal(transition.after.version,1);
    const beforeReads=await raw(who);
    await pages(who,"clients:listMyClientAppointments",{clientId:twin._id});
    assert.deepEqual(await raw(who),beforeReads);
    const ticket=transition.after.resultUndo;
    const undoOperationId=randomUUID();
    await who.client.mutation("appointments:undoMyAppointmentResult", {appointmentId:id,expectedVersion:ticket.version,targetOperationId:ticket.operationId,operationId:undoOperationId});
    const undone=(await raw(who)).appointments.find(row=>row._id===id);
    for(const key of ["_id","businessId","clientId","clientName","serviceId","serviceName","date","start","end"])assert.deepEqual(undone[key],transition.before[key]);
    assert.equal(undone.status,"confirmed"); assert.equal(undone.version,2); assert.equal(undone.autoNoShowSuppressed,true);
    assert.deepEqual(undone,{...transition.before,version:2,lastResultOperationId:undoOperationId,lastResultExpectedVersion:1,lastResultValue:JSON.stringify(["undo-result",ticket.operationId]),autoNoShowSuppressed:true});
    linkedAttentionDocuments.push({kind,controlledTemporalFixture:true,...transition,undone});
  }
  serial.push("linked-arrival-automatic-absence-undo-read-only-and-legacy-no-activation");
  // Exact command vs creation in both serial orders complements observed races.
  for (const first of ["query","create"]) {
    const command=createArgs("Serial order");
    if(first==="query") assert.equal(await who.client.query("clients:getMyClientCreation",command),null);
    const response=await create(who,command), before=await raw(who);
    assert.deepEqual(await who.client.query("clients:getMyClientCreation",command),response.client);
    assert.deepEqual(await raw(who),before);
    serial.push(`exact-recovery-${first}-first`);
  }
  const beforeRestart = await raw(who), beforeDenseRestart = await raw(dense);
  await restart();
  assert.deepEqual(await raw(who), beforeRestart); assert.deepEqual(await raw(dense), beforeDenseRestart);
  assert.deepEqual(await who.client.query("clients:getMyClientCreation", normalizedCommand), result.client);
  assert.deepEqual(await pages(who,"clients:listMyClientAppointments",{clientId:saved._id}),historyA);
  serial.push("sqlite-restart-preserves-full-documents-commands-and-pagination");
  report.clients = { rounds:3,races:18,requests:36,serialControls:serial,linkedAttentionDocuments,denseDirectory:{count:205,prefixCount:145,pages:all.sizes,prefixPages:prefixes.sizes},
    histories:{first:historyA.sizes,second:historyB.sizes},realSQLiteRestart:true,syntheticOnly:true };
}
