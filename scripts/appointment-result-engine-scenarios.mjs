import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// HTTP integration against the owned real engine. These fixtures and full raw
// snapshots exist only in its temporary SQLite deployment, never in the app.
export async function appointmentResultScenarios({ setup, date, start, makeClient, race, report, restart }) {
  const raw = who => who.client.query("engineFixtures:allAppointments", {});
  const invoke = op => makeClient(op.who.identity).mutation(op.name, op.args, { skipQueue: true });
  const mark = (who, row, result, operationId = randomUUID()) => ({ who, name: "appointments:markMyAppointmentResult", args: { appointmentId: row._id, expectedVersion: row.version ?? 0, operationId, result } });
  const undo = (who, ticket, operationId = randomUUID()) => ({ who, name: "appointments:undoMyAppointmentResult", args: { appointmentId: ticket.appointmentId, expectedVersion: ticket.version, targetOperationId: ticket.operationId, operationId } });
  const label = r => r.status === "fulfilled" ? r.value.outcome : String(r.reason).match(/"code":"([A-Z_]+)"/)?.[1] ?? String(r.reason);
  const clean = value => JSON.parse(JSON.stringify(value));
  const serial = [];
  async function seed(result) {
    const who = await setup("Synthetic appointment results");
    const id = await who.client.mutation("engineFixtures:pastAppointment", { serviceId: who.secondServiceId });
    const row = (await raw(who)).appointments.find(row => row._id === id);
    if (!result) return { who, row };
    const command = mark(who, row, result), response = await invoke(command);
    return { who, row: (await raw(who)).appointments.find(row => row._id === id), command, ticket: response.undo };
  }
  function verify(before, after, operations) {
    assert.deepEqual(after.receipts, before.receipts, "Immutable original receipts changed");
    assert.equal(after.appointments.length, before.appointments.length, "Result/undo created duplicate appointments");
    for (const original of before.appointments) {
      const saved = after.appointments.find(row => row._id === original._id);
      const op = operations.find(op => op.args.appointmentId === original._id && op.args.operationId === saved.lastResultOperationId);
      if (!op) { assert.deepEqual(saved, original, "Losing/other appointment changed"); continue; }
      const expected = op.name === "appointments:markMyAppointmentResult"
        ? { ...original, status: op.args.result, version: (original.version ?? 0) + 1, resultAt: saved.resultAt,
          lastResultOperationId: op.args.operationId, lastResultExpectedVersion: original.version ?? 0,
          lastResultValue: JSON.stringify(["result", op.args.result]), resultUndo: { operationId: op.args.operationId, version: (original.version ?? 0) + 1, status: "confirmed", ...(original.resultAt === undefined ? {} : { resultAt: original.resultAt }) } }
        : { ...original, status: original.resultUndo.status, resultAt: original.resultUndo.resultAt, resultUndo: undefined,
          version: original.version + 1, lastResultOperationId: op.args.operationId, lastResultExpectedVersion: original.version,
          lastResultValue: JSON.stringify(["undo-result", op.args.targetOperationId]) };
      assert.deepEqual(saved, clean(expected), "Full result document mismatch (identity, relations, historical metadata, command or snapshot)");
      assert.ok(saved.end <= Date.now());
      if (op.name.endsWith("markMyAppointmentResult")) assert.ok(saved.resultAt >= saved.end);
    }
  }
  const resultKinds = ["completed", "no_show"];
  for (let round = 1; round <= 3; round++) for (const result of resultKinds) {
    for (const scenario of ["duplicate", "same-result", "opposite-result", "cancel", "move", "other-business", "other-date", "archive-service"]) {
      const { who, row } = await seed(), first = mark(who, row, result);
      let other, second;
      if (scenario === "duplicate") second = first;
      else if (scenario === "same-result" || scenario === "opposite-result") second = mark(who, row, scenario === "same-result" ? result : result === "completed" ? "no_show" : "completed");
      else if (scenario === "cancel") second = { who, name: "appointments:cancelMyAppointment", args: { appointmentId: row._id, expectedVersion: 0 } };
      else if (scenario === "move") second = { who, name: "appointments:rescheduleMyAppointment", args: { appointmentId: row._id, expectedVersion: 0, date, start } };
      else if (scenario === "other-business") { other = await seed(); second = mark(other.who, other.row, result); }
      else if (scenario === "other-date") {
        const id = await who.client.mutation("engineFixtures:pastAppointment", { serviceId: who.serviceId, end: row.end - 86400000 });
        second = mark(who, (await raw(who)).appointments.find(row => row._id === id), result);
      } else {
        const service = await who.client.query("services:getMyService", { id: who.secondServiceId });
        second = { who, name: "services:changeMyService", args: { id: service._id, expectedVersion: service.version, operationId: randomUUID(), change: { kind: "archive" } } };
      }
      const before = await raw(who), otherBefore = other && await raw(other.who), ops = round === 2 ? [second, first] : [first, second];
      const began = Date.now(), { results, maxInFlight } = await race(ops), ended = Date.now();
      const names = results.map(label), fulfilled = results.filter(r => r.status === "fulfilled").length;
      const compatible = ["duplicate", "other-business", "other-date", "archive-service"].includes(scenario);
      assert.equal(fulfilled, compatible ? 2 : 1, `${scenario}: ${names}`);
      if (scenario === "duplicate") assert.deepEqual([...names].sort(), ["already_applied", "changed"]);
      if (["same-result", "opposite-result"].includes(scenario)) assert.ok(names.includes("APPOINTMENT_CONFLICT"));
      if (["cancel", "move"].includes(scenario)) assert.ok(names.some(name => ["APPOINTMENT_CONFLICT", "APPOINTMENT_STARTED", "APPOINTMENT_NOT_CONFIRMED"].includes(name)));
      const after = await raw(who); verify(before, after, ops);
      if (other) verify(otherBefore, await raw(other.who), ops);
      const changed = after.appointments.filter(saved => saved.resultAt !== undefined);
      assert.ok(changed.every(saved => saved.resultAt >= began && saved.resultAt <= ended));
      report.scenarios.push({ round, scenario: `appointment-result-${result}-${scenario}`, requests: 2, maxInFlight, observedResults: names,
        observedOrder: compatible ? scenario === "duplicate" ? "same-command-once" : "both-compatible"
          : ["same-result", "opposite-result"].includes(scenario) ? `operation-${names.indexOf("changed") + 1}-won` : "result-eligible-other-operation-ineligible",
        winningResult: ops[names.indexOf("changed")]?.args.result ?? null,
        fullDocumentsVerified: true, finalDocuments: after, ...(other ? { otherFinalDocuments: await raw(other.who) } : {}) });
    }
    for (const scenario of ["duplicate-undo", "different-undo", "replay-mark", "noop-mark", "cancel", "move"]) {
      const { who, row, command, ticket } = await seed(result), first = undo(who, ticket);
      const second = scenario === "duplicate-undo" ? first : scenario === "different-undo" ? undo(who, ticket)
        : scenario === "replay-mark" ? command : scenario === "noop-mark" ? mark(who, row, result)
          : scenario === "cancel" ? { who, name: "appointments:cancelMyAppointment", args: { appointmentId: row._id, expectedVersion: row.version } }
            : { who, name: "appointments:rescheduleMyAppointment", args: { appointmentId: row._id, expectedVersion: row.version, date, start } };
      const before = await raw(who), ops = round === 2 ? [second, first] : [first, second];
      const { results, maxInFlight } = await race(ops), names = results.map(label), after = await raw(who);
      if (scenario !== "different-undo") assert.equal(results[ops.indexOf(first)].status, "fulfilled", `${scenario}: ${names}`);
      if (scenario === "duplicate-undo") assert.deepEqual([...names].sort(), ["already_applied", "changed"]);
      else if (scenario === "different-undo") assert.deepEqual([...names].sort(), ["APPOINTMENT_CONFLICT", "changed"]);
      else if (scenario === "replay-mark") assert.ok(names.includes("already_applied") || names.includes("APPOINTMENT_CONFLICT"));
      else if (scenario === "noop-mark") assert.ok(names.includes("unchanged") || names.includes("APPOINTMENT_CONFLICT"));
      else assert.ok(names.some(name => ["APPOINTMENT_STARTED", "APPOINTMENT_NOT_CONFIRMED", "APPOINTMENT_CANCELLED"].includes(name)));
      verify(before, after, ops);
      report.scenarios.push({ round, scenario: `appointment-undo-${result}-${scenario}`, requests: 2, maxInFlight, observedResults: names,
        observedOrder: scenario === "duplicate-undo" ? "same-command-once" : scenario === "different-undo" ? `${names.indexOf("changed") + 1}-won`
          : names.includes("already_applied") || names.includes("unchanged") ? "mark-read-before-undo"
            : ["cancel", "move"].includes(scenario) ? names[ops.indexOf(second)] === "APPOINTMENT_STARTED" ? "undo-before-ineligible-past-operation" : "ineligible-terminal-operation-before-undo"
              : "undo-before-stale-mark", fullDocumentsVerified: true, finalDocuments: after });
    }
  }
  // Complement scheduler-dependent race observations with explicit serial
  // orders. Opposing temporal eligibility never permits two effective writes.
  for (const result of resultKinds) for (const first of ["mark", "undo"]) {
    const { who, command, ticket } = await seed(result), reverse = undo(who, ticket);
    if (first === "mark") { assert.equal((await invoke(command)).outcome, "already_applied"); await invoke(reverse); }
    else { await invoke(reverse); const stable = await raw(who); await assert.rejects(invoke(command), /APPOINTMENT_CONFLICT/); assert.deepEqual(await raw(who), stable); }
    serial.push({ scenario: "mark-replay-vs-undo", result, first, passed: true });
  }
  for (const result of resultKinds) {
    const { who, row } = await seed(), command = mark(who, row, result), before = await raw(who);
    const response = await invoke(command), applied = await raw(who); verify(before, applied, [command]);
    // Discarding the first response models a retry, not an actual network fault.
    assert.equal((await invoke(command)).outcome, "already_applied"); assert.deepEqual(await raw(who), applied);
    const current = applied.appointments.find(r => r._id === row._id);
    const noop = await invoke(mark(who, current, result)); assert.equal(noop.outcome, "unchanged"); assert.equal(noop.undo, null); assert.deepEqual(await raw(who), applied);
    const opposite = mark(who, current, result === "completed" ? "no_show" : "completed"); await assert.rejects(invoke(opposite), /APPOINTMENT_NOT_CONFIRMED/); assert.deepEqual(await raw(who), applied);
    const reverse = undo(who, response.undo); await invoke(reverse); const restored = await raw(who);
    verify(applied, restored, [reverse]); assert.equal((await invoke(reverse)).outcome, "already_applied"); assert.deepEqual(await raw(who), restored);
    const again = mark(who, restored.appointments.find(r => r._id === row._id), result); await invoke(again); const aba = await raw(who);
    await assert.rejects(invoke(command), /APPOINTMENT_CONFLICT/); await assert.rejects(invoke(reverse), /APPOINTMENT_CONFLICT/);
    await assert.rejects(invoke(undo(who, response.undo)), /APPOINTMENT_CONFLICT/); assert.deepEqual(await raw(who), aba);
    const foreign = await setup();
    await assert.rejects(makeClient().mutation(command.name, command.args), /UNAUTHENTICATED/);
    await assert.rejects(foreign.client.mutation(command.name, command.args), /APPOINTMENT_NOT_FOUND/);
    await assert.rejects(makeClient().mutation(reverse.name, reverse.args), /UNAUTHENTICATED/);
    await assert.rejects(foreign.client.mutation(reverse.name, reverse.args), /APPOINTMENT_NOT_FOUND/);
    await assert.rejects(who.client.mutation(reverse.name, { ...reverse.args, status: "confirmed" }));
    await assert.rejects(who.client.mutation(command.name, { ...command.args, now: Date.now() + 86400000 }));
    await assert.rejects(who.client.mutation(command.name, { ...again.args, expectedVersion: -1 }), /INVALID_VERSION/);
    await assert.rejects(who.client.mutation(command.name, { ...again.args, operationId: "invalid" }), /INVALID_OPERATION/);
    assert.deepEqual(await raw(who), aba);
    serial.push({ scenario: "no-op-replays-discarded-reply-ABA-auth-payload", result, passed: true, fullDocuments: aba });
  }
  for (const delta of [-1, 0, 1]) {
    const { who, row } = await seed();
    const boundary = await who.client.mutation("engineFixtures:resultBoundary", { appointmentId: row._id, delta, operationId: randomUUID() });
    if (delta > 0) { assert.equal(boundary.code, "APPOINTMENT_NOT_ENDED"); assert.deepEqual(boundary.after, boundary.before); }
    else { assert.equal(boundary.response.outcome, "changed"); assert.equal(boundary.after.resultAt, boundary.now); assert.equal(boundary.after.end, boundary.now + delta); }
    serial.push({ scenario: "exact-server-end-boundary", delta, passed: true, execution: "actual production handler in isolated engine transaction", evidence: boundary });
  }
  for (const phase of ["before", "during", "after", "cancelled"]) {
    const who = await setup();
    const end = Date.now() + (phase === "before" ? 3600000 : phase === "during" ? 600000 : -60000);
    const id = await who.client.mutation("engineFixtures:pastAppointment", { serviceId: who.serviceId, end, ...(phase === "cancelled" ? { status: "cancelled" } : {}) });
    const before = await raw(who), command = mark(who, before.appointments[0], "completed"); assert.equal(command.args.appointmentId, id);
    if (phase === "after") { await invoke(command); assert.equal((await raw(who)).appointments[0].status, "completed"); }
    else { await assert.rejects(invoke(command), phase === "cancelled" ? /APPOINTMENT_NOT_CONFIRMED/ : /APPOINTMENT_NOT_ENDED/); assert.deepEqual(await raw(who), before); }
    serial.push({ scenario: "public-mutation-server-time", phase, passed: true });
  }
  for (const result of resultKinds) for (const first of ["undo", "next-result"]) {
    const {who,row,ticket} = await seed(result), reverse = undo(who,ticket), next = mark(who,{...row,version:2},result);
    if (first === "undo") { await invoke(reverse); await invoke(next); const stable = await raw(who); await assert.rejects(invoke(reverse),/APPOINTMENT_CONFLICT/); assert.deepEqual(await raw(who),stable); }
    else { const stable = await raw(who); await assert.rejects(invoke(next),/APPOINTMENT_CONFLICT/); assert.deepEqual(await raw(who),stable); await invoke(reverse); }
    serial.push({scenario:"undo-vs-next-result-both-serial-orders",result,first,passed:true,fullDocuments:await raw(who)});
  }
  // The future side of cancellation/movement eligibility: result must lose,
  // regardless of whether it reads before or after the valid future operation.
  for (const scenario of ["cancel", "move"]) for (let round = 1; round <= 3; round++) {
    const who = await setup(), id = await who.client.mutation("appointments:createMyAppointment", { serviceId: who.serviceId, date, start, clientName: "Synthetic future result rejection" });
    const row = (await raw(who)).appointments[0], first = mark(who, row, "completed");
    const second = scenario === "cancel" ? { who, name: "appointments:cancelMyAppointment", args: { appointmentId: id, expectedVersion: 0 } }
      : { who, name: "appointments:rescheduleMyAppointment", args: { appointmentId: id, expectedVersion: 0, date, start: start + 3600000 } };
    const { results, maxInFlight } = await race([first, second]), after = await raw(who);
    assert.equal(results[0].status, "rejected"); assert.match(label(results[0]), /APPOINTMENT_NOT_ENDED|APPOINTMENT_CONFLICT|APPOINTMENT_NOT_CONFIRMED/);
    assert.equal(results[1].status, "fulfilled"); assert.equal(after.appointments.length, 1);
    const saved = after.appointments[0];
    const expected = scenario === "cancel" ? { ...row, status: "cancelled", version: 1, cancelledAt: results[1].value.cancelledAt }
      : { ...row, date, start: start + 3600000, end: row.end + 3600000, version: 1, rescheduledAt: results[1].value.rescheduledAt, rescheduledFromVersion: 0 };
    assert.deepEqual(saved, expected);
    report.scenarios.push({ round, scenario: `future-result-vs-${scenario}`, requests: 2, maxInFlight, observedResults: results.map(label), observedOrder: "result-ineligible-valid-future-operation", fullDocumentsVerified: true, finalDocuments: after });
  }
  for (let round = 1; round <= 3; round++) for (const result of resultKinds) {
    const { who, row, ticket } = await seed(result), reverse = undo(who, ticket);
    // A raw client can predict a revision. It must not undo a subsequent
    // result, regardless of which HTTP request reaches the engine first.
    const next = mark(who, { ...row, version: row.version + 1 }, result), ops = round === 2 ? [next, reverse] : [reverse, next];
    const { results, maxInFlight } = await race(ops), names = results.map(label), final = await raw(who), saved = final.appointments[0];
    assert.equal(results[ops.indexOf(reverse)].status, "fulfilled");
    const afterUndo = clean({...row,status:"confirmed",resultAt:row.resultUndo.resultAt,resultUndo:undefined,version:2,
      lastResultOperationId:reverse.args.operationId,lastResultExpectedVersion:1,lastResultValue:JSON.stringify(["undo-result",reverse.args.targetOperationId])});
    if (results[ops.indexOf(next)].status === "fulfilled") { assert.equal(saved.status, result); assert.equal(saved.version, 3); await assert.rejects(invoke(reverse), /APPOINTMENT_CONFLICT/); }
    else { assert.equal(names[ops.indexOf(next)], "APPOINTMENT_CONFLICT"); assert.equal(saved.status, "confirmed"); assert.equal(saved.version, 2); }
    const expected = results[ops.indexOf(next)].status === "fulfilled" ? {...afterUndo,status:result,resultAt:saved.resultAt,version:3,lastResultOperationId:next.args.operationId,lastResultExpectedVersion:2,
      lastResultValue:JSON.stringify(["result",result]),resultUndo:{operationId:next.args.operationId,version:3,status:"confirmed"}} : afterUndo;
    assert.deepEqual(saved,expected);
    for (const key of ["_id", "_creationTime", "businessId", "serviceId", "serviceName", "clientName", "date", "start", "end", "rescheduledAt", "rescheduledFromVersion"]) assert.deepEqual(saved[key], row[key]);
    assert.deepEqual(await raw(who), final);
    report.scenarios.push({ round, scenario: `undo-vs-next-result-${result}`, requests: 2, maxInFlight, observedResults: names,
      observedOrder: results[ops.indexOf(next)].status === "fulfilled" ? "undo-before-next-result" : "next-result-stale-before-undo", fullDocumentsVerified: true, finalDocuments: final });
  }
  const { who, row } = await seed();
  const slug = (await who.client.mutation("bookingLinks:setMyBookingLink", { enabled: true })).slug, receiptKey = randomUUID();
  const publicId = await who.client.mutation("engineFixtures:pastAppointment", { serviceId: who.serviceId, receiptKey });
  // This fixture is an original pre-email receipt. Replay its exact legacy
  // payload instead of the regression adapter adding a new contact field.
  const original = (await raw(who)).appointments.find(r => r._id === publicId), anonymous = makeClient(undefined, undefined, false);
  const publicArgs = { slug, attemptKey: receiptKey, serviceId: original.serviceId, date: original.date, start: original.start, clientName: original.clientName };
  const receipt = await anonymous.mutation("publicBooking:confirm", publicArgs); assert.equal(receipt.ok, true);
  const revision = () => anonymous.query("publicBooking:getAvailabilityRevision", { slug, serviceId: who.serviceId, date });
  const digestBefore = await revision(), before = await raw(who);
  const availableBefore = await who.client.action("availability:getMyAvailability", {serviceId:who.serviceId,date});
  const early = await invoke(mark(who,original,"completed"));
  const availableAfter = await who.client.action("availability:getMyAvailability", {serviceId:who.serviceId,date});
  assert.deepEqual(availableAfter.slots,availableBefore.slots); assert.equal(await revision(),digestBefore);
  await invoke(undo(who,early.undo)); assert.deepEqual((await who.client.action("availability:getMyAvailability", {serviceId:who.serviceId,date})).slots,availableBefore.slots);
  assert.equal(await revision(),digestBefore);
  serial.push({scenario:"past-result-and-undo-cannot-create-future-capacity-or-change-future-public-digest",passed:true});
  const service = await who.client.query("services:getMyService", { id: who.secondServiceId });
  await who.client.mutation("services:changeMyService", { id: service._id, expectedVersion: service.version, operationId: randomUUID(), change: { kind: "archive" } });
  await who.client.mutation("weeklySchedule:saveMyWeeklySchedule", { days: Array.from({ length: 7 }, (_, day) => ({ dayOfWeek: day + 1, isOpen: false, start: null, end: null })) });
  await who.client.mutation("specialDates:changeMySpecialDate", { date: row.date, value: {isOpen:false,start:null,end:null}, expected:null, operationId:randomUUID() });
  await who.client.mutation("engineFixtures:historicalBlock", { appointmentId:row._id });
  const contextBefore = await who.client.query("engineFixtures:snapshot", {date:row.date});
  for (const target of [row, (await raw(who)).appointments.find(r=>r._id===original._id)]) {
    const command = mark(who, target, target._id === row._id ? "no_show" : "completed"), response = await invoke(command);
    assert.deepEqual(await anonymous.mutation("publicBooking:confirm", publicArgs), receipt);
    const reversed = undo(who, response.undo); await invoke(reversed);
    assert.deepEqual(await anonymous.mutation("publicBooking:confirm", publicArgs), receipt);
  }
  assert.deepEqual((await raw(who)).receipts, before.receipts);
  const contextAfter = await who.client.query("engineFixtures:snapshot", {date:row.date});
  for (const key of ["business", "services", "weeklySchedules", "specialDates", "timeBlocks"]) assert.deepEqual(contextAfter[key], contextBefore[key]);
  const stablePast = await raw(who);
  await assert.rejects(who.client.mutation("appointments:createMyAppointment", {serviceId:who.serviceId,date:original.date,start:original.start,clientName:"Retroactive booking"}), /SLOT_UNAVAILABLE/);
  const currentPublicService = await who.client.query("services:getMyService", { id: who.serviceId });
  const retroactive = await anonymous.mutation("publicBooking:confirm", {...publicArgs,attemptKey:randomUUID(),email:"regression@example.test",
    expectedService:{name:currentPublicService.name,durationMinutes:currentPublicService.durationMinutes,version:currentPublicService.version}});
  assert.equal(retroactive.ok,false); assert.equal(retroactive.code,"SLOT_UNAVAILABLE");
  assert.deepEqual(await raw(who), stablePast);
  for (const result of resultKinds) {
    const current = (await raw(who)).appointments.find(r => r._id === publicId);
    const response = await invoke(mark(who, current, result));
    assert.deepEqual(await anonymous.mutation("publicBooking:confirm", publicArgs), receipt);
    const pub = await anonymous.action("publicBooking:getAvailability", { slug, serviceId: who.serviceId, date });
    const priv = await who.client.action("availability:getMyAvailability", { serviceId: who.serviceId, date });
    assert.deepEqual(pub.slots, priv.slots);
    assert.deepEqual(Object.keys(pub).sort(), ["service", "slots"]);
    assert.deepEqual(Object.keys(receipt.receipt).sort(), ["date", "end", "serviceName", "start", "timeZone"]);
    await invoke(undo(who, response.undo));
  }
  assert.match(digestBefore, /^[0-9a-f]{64}$/);
  assert.deepEqual((await raw(who)).receipts, before.receipts);
  serial.push({ scenario: "archived-services-closed-week-receipt-public-private-privacy", passed: true });
  const dense = await setup(), denseDate = await dense.client.mutation("engineFixtures:denseResults", { serviceId: dense.serviceId });
  const totals = {};
  for (const withService of [false,true]) for (const status of [undefined, "confirmed", "completed", "cancelled", "no_show", "confirmed,cancelled", "completed,no_show", "none"]) {
    let cursor = null, pages = 0, count = 0; const ids = new Set();
    for (;;) {
      const page = await dense.client.query("appointments:searchMyAppointments", { client: "", status, ...(withService ? {serviceId:dense.serviceId} : {}), period: "todas", from: denseDate, until: denseDate, paginationOpts: { cursor, numItems: 73 } });
      for (const row of page.page) { assert.ok(!ids.has(row._id)); ids.add(row._id); if (status) assert.ok(status.split(",").includes(row.status)); }
      count += page.page.length; pages++; if (page.isDone) break; cursor = page.continueCursor; assert.ok(pages < 30);
    }
    const expected = status === undefined ? 1606 : status === "confirmed" ? 1 : status === "confirmed,cancelled" ? 536 : status === "completed,no_show" ? 1070 : status === "none" ? 0 : 535;
    assert.equal(count, expected); totals[`${withService ? "service" : "all-services"}:${status ?? "all"}`] = { count, pages };
  }
  const occupied = await dense.client.query("appointments:listMyConfirmedAppointments", { date: denseDate }); assert.equal(occupied.length, 1);
  const denseState = await raw(dense); assert.equal(denseState.appointments.length, 1606);
  for (const status of ["completed,unknown", "confirmed,confirmed", "none,completed"]) await assert.rejects(dense.client.query("appointments:searchMyAppointments", { client: "", status, period: "todas", from: "", until: "", paginationOpts: { cursor: null, numItems: 10 } }), /INVALID_FILTERS/);
  serial.push({ scenario: "dense-all-states-complete-pagination-occupation-and-invalid-subsets", passed: true, totals });
  const beforeRestart = await raw(who), denseBeforeRestart = await raw(dense);
  await restart(); assert.deepEqual(await raw(who), beforeRestart); assert.deepEqual(await raw(dense), denseBeforeRestart);
  serial.push({ scenario:"result-metadata-and-dense-history-persist-after-real-engine-restart",passed:true });
  report.appointmentResults = { serialControls: serial, results: resultKinds, pastFixturesOnlyInTemporaryDeployment: true,
    exactBoundaryIsServerTransactionControl: true, originalReceiptsImmutable: true, fullDocumentsVerified: true, noUnitTestReplacement: true };
}
