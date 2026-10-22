import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Runs only inside the existing owned loopback engine. No config/env reads.
export async function specialDateScenarios({ setup, date, start, makeClient, race, report }) {
  const minute = 60_000;
  const closed = { isOpen: false, start: null, end: null };
  const open = (start, end) => ({ isOpen: true, start, end });
  const anon = makeClient();
  const snapshot = (who, day = date) => who.client.query("engineFixtures:snapshot", { date: day });
  const source = (who, day = date) => who.client.query("specialDates:getMySpecialDate", { date: day });
  const context = (row) => row ? { id: row._id, version: row.version } : null;
  async function operation(who, value, day = date) {
    return { who, name: "specialDates:changeMySpecialDate", args: { date: day, value, expected: context((await source(who, day)).configuration), operationId: randomUUID() } };
  }
  const apply = async (who, value, day = date) => { const op = await operation(who, value, day); return who.client.mutation(op.name, op.args); };
  const create = (who, target) => ({ who, name: "appointments:createMyAppointment", args: { serviceId: who.serviceId, date, start: target, clientName: "Synthetic special race" } });
  const publicOp = (who, target) => ({ who: { identity: undefined }, name: "publicBooking:confirm", args: { slug: who.slug, serviceId: who.serviceId, date, start: target, clientName: "Synthetic special public", attemptKey: randomUUID() } });
  const invoke = (op) => (op.who.identity ? makeClient(op.who.identity) : anon).mutation(op.name, op.args);
  const accepted = (op, result) => result.status === "fulfilled" && (op.name !== "publicBooking:confirm" || result.value.ok);
  function outcome(op, result) {
    if (result.status === "rejected") {
      const code = String(result.reason).match(/SPECIAL_DATE_CONFLICT|SLOT_UNAVAILABLE/)?.[0]; assert.ok(code, String(result.reason)); return code;
    }
    return op.name === "publicBooking:confirm" ? result.value.ok ? "booked" : result.value.code : result.value?.outcome ?? "created";
  }
  async function verifyOptions(who, day = date) {
    for (const serviceId of [who.serviceId, who.secondServiceId]) {
      const privateResult = await who.client.action("availability:getMyAvailability", { date: day, serviceId });
      const publicResult = await anon.action("publicBooking:getAvailability", { slug: who.slug, date: day, serviceId });
      assert.deepEqual(publicResult.slots, privateResult.slots);
      const rows = (await snapshot(who, day)).appointments.filter((r) => r.status === "confirmed");
      assert.ok(privateResult.slots.every((slot) => rows.every((r) => slot.start >= r.end || slot.end <= r.start)));
    }
  }
  async function enabled(name) { const who = await setup(name); who.slug = (await who.client.mutation("bookingLinks:setMyBookingLink", { enabled: true })).slug; return who; }
  const scenarios = ["close-public", "change-public", "close-private", "change-private", "close-move", "change-move",
    "restore-public", "restore-private", "restore-move", "double-create", "double-edit", "edit-remove", "independent-businesses", "independent-dates"];
  for (let round = 1; round <= 3; round++) for (const scenario of scenarios) {
    const who = await enabled(`Synthetic special ${scenario} ${round}`);
    const restoring = scenario.startsWith("restore-");
    const target = restoring ? start + 240 * minute : start + 60 * minute; // 13:30 or 10:30
    let original;
    if (scenario.endsWith("-move")) original = await invoke(create(who, start));
    if (restoring) await apply(who, open("13:00", "15:00"));
    if (scenario === "double-edit" || scenario === "edit-remove") await apply(who, closed);
    const before = await snapshot(who);
    const began = Date.now();
    const value = restoring ? null : scenario.startsWith("change-") ? open("11:00", "12:00") : closed;
    const change = await operation(who, value);
    let other = who, otherDate = date, operations;
    if (scenario === "double-create") operations = [change, await operation(who, open("11:00", "12:00"))];
    else if (scenario === "double-edit") operations = [await operation(who, open("10:00", "11:00")), await operation(who, open("11:00", "12:00"))];
    else if (scenario === "edit-remove") operations = [await operation(who, open("10:00", "11:00")), await operation(who, null)];
    else if (scenario === "independent-businesses") { other = await enabled("Synthetic independent special"); operations = [change, await operation(other, open("10:00", "11:00"))]; }
    else if (scenario === "independent-dates") { otherDate = new Date(Date.parse(`${date}T00:00Z`) + 86400000).toISOString().slice(0, 10); operations = [change, await operation(who, open("10:00", "11:00"), otherDate)]; }
    else {
      const booking = scenario.endsWith("-public") ? publicOp(who, target) : scenario.endsWith("-move") ? { who, name: "appointments:rescheduleMyAppointment", args: { appointmentId: original, expectedVersion: 0, date, start: target } } : create(who, target);
      operations = [change, booking];
    }
    const { results, maxInFlight } = await race(operations);
    const ended = Date.now();
    const observedResults = results.map((r, i) => outcome(operations[i], r));
    const successes = results.filter((r, i) => accepted(operations[i], r)).length;
    const after = await snapshot(who);
    assert.deepEqual(after.weeklySchedules, before.weeklySchedules, "Special edit changed saved week");
    const configurations = after.specialDates;
    assert.equal(configurations.filter((r) => r.date === date).length, 1);
    assert.ok(configurations.every((r) => r.businessId === who.businessId && Number.isSafeInteger(r.version) && r.version >= 1 && r.updatedAt >= began && r.updatedAt <= ended));
    let serialOrder;
    if (["double-create", "double-edit", "edit-remove"].includes(scenario)) {
      assert.equal(successes, 1); assert.equal(observedResults.filter((o) => o === "SPECIAL_DATE_CONFLICT").length, 1);
      const winner = results.findIndex((r, i) => accepted(operations[i], r));
      const config = configurations[0];
      assert.equal(config.lastOperationId, operations[winner].args.operationId);
      assert.equal(config.version, scenario === "double-create" ? 1 : 2);
      assert.equal(config.active, operations[winner].args.value !== null);
      if (config.active) assert.deepEqual({ isOpen: config.isOpen, start: config.start, end: config.end }, operations[winner].args.value);
      serialOrder = `operation-${winner + 1}-won`;
    } else if (scenario.startsWith("independent-")) {
      assert.equal(successes, 2);
      assert.equal((await source(other, otherDate)).configuration.version, 1);
      serialOrder = "both-compatible";
    } else {
      assert.equal(observedResults[0], "changed");
      const booked = accepted(operations[1], results[1]);
      serialOrder = booked ? "appointment-before-special" : "special-before-appointment";
      assert.equal(results[0].value.confirmedAppointments, original ? 1 : booked ? 1 : 0, "Warning omitted concurrently committed appointment");
      if (!booked) assert.equal(observedResults[1], "SLOT_UNAVAILABLE");
      const row = after.appointments.find((r) => r._id === original);
      if (original) {
        if (!booked) assert.deepEqual(row, before.appointments.find((r) => r._id === original));
        else { const prev = before.appointments.find((r) => r._id === original); assert.deepEqual(row, { ...prev, start: target, end: target + 30 * minute, version: 1, rescheduledAt: row.rescheduledAt, rescheduledFromVersion: 0 }); assert.ok(row.rescheduledAt >= began && row.rescheduledAt <= ended); }
      } else assert.equal(after.appointments.length, booked ? 1 : 0);
      for (const row of after.appointments) { assert.equal(row.businessId, who.businessId); assert.equal(row.date, date); assert.equal(row.serviceId, who.serviceId); }
      if (scenario.endsWith("-public")) {
        assert.equal(after.receipts.length, booked ? 1 : 0);
        if (booked) {
          const receipt = after.receipts[0]; assert.equal(receipt.appointmentId, after.appointments[0]._id); assert.equal(receipt.businessId, who.businessId); assert.equal(receipt.start, target);
          const replay = await invoke(operations[1]); assert.deepEqual(replay, results[1].value); assert.deepEqual(await snapshot(who), after);
        }
      }
    }
    await verifyOptions(who);
    if (other !== who || otherDate !== date) await verifyOptions(other, otherDate);
    report.scenarios.push({ round, scenario: `special-${scenario}`, requests: operations.length, maxInFlight, successes, observedResults, serialOrder,
      finalSpecialDates: configurations.map(({ _id, businessId, date, active, version, updatedAt }) => ({ _id, businessId, date, active, version, updatedAt })), finalAppointments: after.appointments.length,
      originalIntactOnRejection: true, weekPreserved: true, optionsAgree: true });
  }
  // Explicit serial controls exercise both orders regardless of scheduler bias.
  const serialControls = [];
  for (const kind of ["close", "change", "restore"]) for (const channel of ["public", "private", "move"]) for (const order of ["special-first", "appointment-first"]) {
    const who = await enabled(`Synthetic serial ${kind} ${channel} ${order}`);
    const target = kind === "restore" ? start + 240 * minute : start + 60 * minute;
    let original; if (channel === "move") original = await invoke(create(who, start));
    if (kind === "restore") await apply(who, open("13:00", "15:00"));
    const special = await operation(who, kind === "restore" ? null : kind === "close" ? closed : open("11:00", "12:00"));
    const booking = channel === "public" ? publicOp(who, target) : channel === "move" ? { who, name: "appointments:rescheduleMyAppointment", args: { appointmentId: original, expectedVersion: 0, date, start: target } } : create(who, target);
    if (order === "special-first") {
      await invoke(special); const before = await snapshot(who);
      if (channel === "public") assert.deepEqual(await invoke(booking), { ok: false, code: "SLOT_UNAVAILABLE" });
      else await assert.rejects(invoke(booking), /SLOT_UNAVAILABLE/);
      assert.deepEqual(await snapshot(who), before);
    } else {
      const saved = await invoke(booking); if (channel === "public") assert.equal(saved.ok, true);
      const before = await snapshot(who); const result = await invoke(special);
      assert.equal(result.confirmedAppointments, 1); const after = await snapshot(who);
      assert.deepEqual(after.appointments, before.appointments); assert.deepEqual(after.receipts, before.receipts);
      if (channel === "public") { assert.deepEqual(await invoke(booking), saved); assert.deepEqual(await snapshot(who), after); }
    }
    await verifyOptions(who); serialControls.push({ kind, channel, order, passed: true });
  }
  const aba = await enabled("Synthetic ABA and retry");
  const oldCreate = await operation(aba, closed); const a = await invoke(oldCreate);
  assert.equal((await invoke(oldCreate)).outcome, "already_applied"); assert.deepEqual((await source(aba)).configuration, a.configuration);
  const oldEdit = await operation(aba, open("10:00", "11:00")); await invoke(oldEdit);
  const oldRemove = await operation(aba, null); const removed = await invoke(oldRemove);
  assert.equal((await invoke(oldRemove)).outcome, "already_applied"); assert.deepEqual((await source(aba)).configuration, removed.configuration);
  const recreated = await apply(aba, closed); assert.equal(recreated.configuration._id, a.configuration._id); assert.equal(recreated.configuration.version, 4);
  const beforeRetry = await snapshot(aba);
  for (const op of [oldCreate, oldEdit, oldRemove]) { await assert.rejects(invoke(op), /SPECIAL_DATE_CONFLICT/); assert.deepEqual(await snapshot(aba), beforeRetry); }
  assert.equal((await apply(aba, closed)).outcome, "unchanged"); assert.deepEqual(await snapshot(aba), beforeRetry);
  await assert.rejects(anon.query("specialDates:getMySpecialDate", { date }), /UNAUTHENTICATED/);
  await assert.rejects(anon.mutation("specialDates:changeMySpecialDate", oldCreate.args), /UNAUTHENTICATED/);
  report.specialDates = { rounds: 3, scenariosPerRound: scenarios.length, races: scenarios.length * 3, requests: scenarios.length * 6,
    serialControls, ABA: { identityPreserved: true, finalVersion: 4, staleCreateEditRemoveRejected: true, documentsIntact: true },
    replayPreservesMetadata: true, warningsFromTransaction: true, sharedPublicPrivateOptions: true,
    observedOrders: Object.fromEntries(scenarios.map((scenario) => [scenario, report.scenarios.filter((s) => s.scenario === `special-${scenario}`).map((s) => s.serialOrder)])) };
}
