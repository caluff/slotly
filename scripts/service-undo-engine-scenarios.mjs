import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Run only these new integration/OCC cases with --service-undo-only. Prior
// appointment/schedule/block races remain available, not claimed as a new run.
export async function serviceUndoScenarios({ setup, date, start, makeClient, race, report }) {
  const minute = 60000, anonymous = makeClient();
  const snapshot = who => who.client.query("engineFixtures:snapshot", { date });
  const read = (who, id = who.serviceId) => who.client.query("services:getMyService", { id });
  const ctxOf = row => ({ name: row.name, durationMinutes: row.durationMinutes, version: row.version ?? 0 });
  const invoke = op => makeClient(op.who.identity).mutation(op.name, op.args, { skipQueue: true });
  const change = (who, row, kind = "edit") => ({ who, name: "services:changeMyService", args: { id: row._id, expectedVersion: row.version,
    operationId: randomUUID(), change: kind === "edit" ? { kind, name: "Later edit", durationMinutes: 25 } : { kind } } });
  const undoOp = (who, ticket) => ({ who, name: "services:undoMyService", args: { id: ticket.id, expectedVersion: ticket.version,
    targetOperationId: ticket.operationId, operationId: randomUUID() } });
  const book = (who, row, channel, target = start) => ({ who: channel === "public" ? {} : who,
    name: channel === "public" ? "publicBooking:confirm" : "appointments:createMyAppointment",
    args: { serviceId: row._id, expectedService: ctxOf(row), date, start: target, clientName: "Synthetic undo booking",
      ...(channel === "public" ? { slug: who.slug, attemptKey: randomUUID() } : {}) } });
  const accepted = (op, r) => r.status === "fulfilled" && (op.name !== "publicBooking:confirm" || r.value.ok);
  const label = (op, r) => r.status === "rejected" ? String(r.reason).match(/"code":"([A-Z_]+)"/)?.[1] ?? String(r.reason)
    : op.name === "publicBooking:confirm" ? r.value.ok ? "booked" : r.value.code : r.value?.outcome ?? "booked";
  async function seed(kind) {
    const who = await setup(`Synthetic undo ${kind}`);
    who.slug = (await who.client.mutation("bookingLinks:setMyBookingLink", { enabled: true })).slug;
    let row = await read(who);
    await invoke(book(who, row, "private", start - 30 * minute));
    let ticket;
    if (kind === "edit") {
      const command = { ...change(who, row), args: { ...change(who, row).args, change: { kind: "edit", name: "Edited 45", durationMinutes: 45 } } };
      const result = await invoke(command); row = result.service; ticket = result.undo;
    } else {
      const raw = (await snapshot(who)).services.find(r => r._id === row._id);
      ticket = await who.client.query("services:getMyServiceUndo", { id: row._id, operationId: raw.creationKey });
    }
    assert.ok(ticket); return { who, row, ticket };
  }
  async function options(who) {
    const state = await snapshot(who), page = await anonymous.query("publicBooking:listServices", { slug: who.slug, paginationOpts: { cursor: null, numItems: 100 } });
    assert.deepEqual(page.page.map(s => s.id).sort(), state.services.filter(s => !s.archived).map(s => s._id).sort());
    for (const row of state.services) {
      const pub = await anonymous.action("publicBooking:getAvailability", { slug: who.slug, serviceId: row._id, date });
      if (row.archived) { assert.equal(pub, null); await assert.rejects(who.client.action("availability:getMyAvailability", { serviceId: row._id, date }), /SERVICE_ARCHIVED/); }
      else {
        const priv = await who.client.action("availability:getMyAvailability", { serviceId: row._id, date });
        assert.deepEqual(pub.slots, priv.slots); assert.deepEqual(pub.service, { id: row._id, ...ctxOf(row) });
        assert.deepEqual(Object.keys(pub.service).sort(), ["durationMinutes", "id", "name", "version"]);
      }
    }
  }
  const contenders = ["edit", "archive", "restore", "private", "public", "other-undo", "duplicate-undo", "other-business"];
  for (let round = 1; round <= 3; round++) for (const kind of ["create", "edit"]) for (const contender of contenders) {
    const { who, row, ticket } = await seed(kind), undo = undoOp(who, ticket);
    let other;
    if (contender === "other-business") other = await seed(kind);
    const second = contender === "private" || contender === "public" ? book(who, row, contender)
      : contender === "other-undo" ? undoOp(who, ticket) : contender === "duplicate-undo" ? undo
        : other ? undoOp(other.who, other.ticket) : change(who, row, contender);
    const ops = [undo, second], before = await snapshot(who), beforeOther = other && await snapshot(other.who), began = Date.now();
    const { results, maxInFlight } = await race(ops);
    const ended = Date.now(), after = await snapshot(who), afterOther = other && await snapshot(other.who);
    const ok = results.map((r, i) => accepted(ops[i], r)), labels = results.map((r, i) => label(ops[i], r));
    if (contender === "private" || contender === "public") {
      assert.equal(ok[0], true); assert.equal(after.appointments.length, before.appointments.length + (ok[1] ? 1 : 0));
      if (!ok[1]) assert.equal(labels[1], kind === "create" ? "SERVICE_ARCHIVED" : "SERVICE_CHANGED");
      else {
        const saved = after.appointments.find(r => !before.appointments.some(old => old._id === r._id));
        assert.deepEqual({ serviceId: saved.serviceId, serviceName: saved.serviceName, start: saved.start, end: saved.end, businessId: saved.businessId, clientName: saved.clientName, status: saved.status },
          { serviceId: row._id, serviceName: row.name, start, end: start + row.durationMinutes * minute, businessId: who.businessId, clientName: second.args.clientName, status: "confirmed" });
        if (contender === "public") { assert.equal(after.receipts.length, 1); assert.equal(after.receipts[0].appointmentId, saved._id); assert.deepEqual(await invoke(second), results[1].value); }
      }
    } else if (contender === "duplicate-undo") { assert.deepEqual(ok, [true, true]); assert.deepEqual([...labels].sort(), ["already_applied", "changed"]); }
    else if (other) assert.deepEqual(ok, [true, true]);
    else if (contender === "restore") { assert.equal(ok[0], true); if (ok[1]) assert.equal(results[1].value.outcome, "unchanged"); }
    else { assert.equal(ok.filter(Boolean).length, 1); assert.equal(labels[ok[0] ? 1 : 0], "SERVICE_CONFLICT"); }
    for (const [target, targetBefore, targetAfter, undoIndex] of [[who, before, after, 0], ...(other ? [[other.who, beforeOther, afterOther, 1]] : [])]) {
      assert.deepEqual(targetAfter.business, targetBefore.business); assert.deepEqual(targetAfter.weeklySchedules, targetBefore.weeklySchedules);
      assert.deepEqual(targetAfter.specialDates, targetBefore.specialDates); assert.deepEqual(targetAfter.timeBlocks, targetBefore.timeBlocks);
      for (const old of targetBefore.appointments) assert.deepEqual(targetAfter.appointments.find(r => r._id === old._id), old, "Undo/past edit must preserve original full appointment");
      const original = targetBefore.services.find(r => r._id === target.serviceId), saved = targetAfter.services.find(r => r._id === original._id);
      for (const old of targetBefore.services.filter(r => r._id !== original._id)) assert.deepEqual(targetAfter.services.find(r => r._id === old._id), old);
      const winner = other || ok[0] ? ops[undoIndex] : second;
      const { undoSnapshot, ...originalFields } = original;
      if (winner.name === "services:undoMyService") {
        assert.deepEqual(saved, { ...originalFields, name: undoSnapshot.name, durationMinutes: undoSnapshot.durationMinutes, archived: undoSnapshot.kind === "create" ? true : undoSnapshot.archived,
          version: original.version + 1, updatedAt: saved.updatedAt, lastOperationId: winner.args.operationId,
          lastExpectedVersion: original.version, lastValue: JSON.stringify(["undo", winner.args.targetOperationId]) });
        const stable = await snapshot(target); assert.equal((await invoke(winner)).outcome, "already_applied"); assert.deepEqual(await snapshot(target), stable);
      } else {
        assert.equal(saved.version, original.version + 1); assert.equal(saved.lastOperationId, winner.args.operationId);
        assert.equal(saved.name, winner.args.change.kind === "edit" ? "Later edit" : original.name);
        assert.equal(saved.durationMinutes, winner.args.change.kind === "edit" ? 25 : original.durationMinutes);
        assert.equal(saved.archived, winner.args.change.kind === "archive");
        if (winner.args.change.kind === "edit") assert.deepEqual(saved.undoSnapshot, { operationId: winner.args.operationId, version: saved.version, kind: "edit", name: original.name, durationMinutes: original.durationMinutes, archived: false });
        else assert.ok(!("undoSnapshot" in saved));
      }
      assert.ok(saved.updatedAt >= began && saved.updatedAt <= ended); await options(target);
    }
    report.scenarios.push({ round, scenario: `undo-${kind}-${contender}`, requests: 2, maxInFlight, observedResults: labels,
      observedOrder: contender === "private" || contender === "public" ? ok[1] ? "booking-before-undo" : "undo-before-booking"
        : contender === "restore" ? ok[1] ? "restore-noop-before-undo" : "undo-before-restore" : other ? "both-compatible"
          : contender === "duplicate-undo" ? "same-command-once" : ok[0] ? "undo-won" : "contender-won",
      fullDocumentsVerified: true, originalsIntact: true, finalDocuments: after, ...(other ? { otherFinalDocuments: afterOther } : {}) });
  }
  const serial = [];
  for (const kind of ["create", "edit"]) for (const contender of ["private", "public", "edit", "archive"]) for (const first of [0, 1]) {
    const { who, row, ticket } = await seed(kind), ops = [undoOp(who, ticket), contender === "private" || contender === "public" ? book(who, row, contender) : change(who, row, contender)];
    const result = await invoke(ops[first]); assert.ok(result); const middle = await snapshot(who);
    const next = await Promise.allSettled([invoke(ops[1 - first])]);
    const bookingFirst = first === 1 && (contender === "private" || contender === "public");
    if (bookingFirst) {
      assert.ok(accepted(ops[0], next[0])); const after = await snapshot(who);
      assert.deepEqual(after.appointments, middle.appointments); assert.deepEqual(after.receipts, middle.receipts);
      if (contender === "public") { assert.deepEqual(await invoke(ops[1]), result); assert.deepEqual((await snapshot(who)).receipts, middle.receipts); }
    }
    else { assert.ok(!accepted(ops[1 - first], next[0])); assert.deepEqual(await snapshot(who), middle, "Losing original/revisions/timestamps must stay identical"); }
    await options(who); serial.push({ kind, contender, first: first === 0 ? "undo" : "contender", passed: true });
  }
  const { who, row, ticket } = await seed("edit"), initial = await snapshot(who), undo = undoOp(who, ticket);
  const noOp = await invoke({ ...change(who, row), args: { ...change(who, row).args, change: { kind: "edit", name: row.name } } });
  assert.equal(noOp.outcome, "unchanged"); assert.equal(noOp.undo, null); assert.deepEqual(await snapshot(who), initial);
  await invoke(undo); const stable = await snapshot(who); assert.equal((await invoke(undo)).outcome, "already_applied"); assert.deepEqual(await snapshot(who), stable);
  const reverted = await read(who); await invoke(change(who, reverted));
  const later = await snapshot(who); await assert.rejects(invoke(undo), /SERVICE_CONFLICT/); assert.deepEqual(await snapshot(who), later);
  assert.equal(await who.client.query("services:getMyServiceUndo", { id: row._id, operationId: ticket.operationId }), null);
  const legacy = await read(who, who.secondServiceId);
  const legacyEdit = { ...change(who, legacy), args: { ...change(who, legacy).args, change: { kind: "edit", name: "Legacy20", durationMinutes: 20 } } };
  const edited = await invoke(legacyEdit); assert.ok(edited.undo);
  const legacyUndo = undoOp(who, edited.undo); await invoke(legacyUndo);
  assert.equal((await read(who, legacy._id)).durationMinutes, 46);
  const beforeInvalid = await snapshot(who);
  // Same name/duration after undo still has a newer revision. An option viewed
  // before the edit/undo ABA must not be accepted as a fresh reservation.
  await assert.rejects(invoke(book(who, legacy, "private", start + 90 * minute)), /SERVICE_CHANGED/);
  await assert.rejects(invoke({ ...change(who, await read(who, legacy._id)), args: { ...change(who, await read(who, legacy._id)).args, change: { kind: "edit", name: "Invalid46", durationMinutes: 46 } } }), /INVALID_DURATION/);
  await assert.rejects(who.client.mutation("services:undoMyService", { ...legacyUndo.args, durationMinutes: 17 }));
  await assert.rejects(invoke({ ...legacyUndo, args: { ...legacyUndo.args, operationId: randomUUID(), expectedVersion: (await read(who, legacy._id)).version } }), /SERVICE_CONFLICT/);
  assert.deepEqual(await snapshot(who), beforeInvalid);
  const foreign = await setup();
  await assert.rejects(makeClient().mutation("services:undoMyService", legacyUndo.args), /UNAUTHENTICATED/);
  await assert.rejects(foreign.client.mutation("services:undoMyService", legacyUndo.args), /SERVICE_NOT_FOUND/);
  await assert.rejects(foreign.client.query("services:getMyServiceUndo", { id: legacy._id, operationId: legacyEdit.args.operationId }), /SERVICE_NOT_FOUND/);
  // Creation acknowledgement after undo cannot recreate/reactivate the row.
  const created = await seed("create"), raw = (await snapshot(created.who)).services.find(r => r._id === created.row._id);
  await invoke(undoOp(created.who, created.ticket)); const archived = await snapshot(created.who);
  assert.equal(await created.who.client.mutation("services:createMyService", { name: raw.name, durationMinutes: raw.durationMinutes, operationId: raw.creationKey }), raw._id);
  assert.equal(await created.who.client.query("services:getMyServiceUndo", { id: raw._id, operationId: raw.creationKey }), null);
  assert.deepEqual(await snapshot(created.who), archived);
  report.serviceUndo = { rounds: 3, races: 48, requests: 96, serialControls: serial, legacy46RestoredOnlyFromServerSnapshot: true,
    noOpOffersNoUndo: true, oldTicketAfterLaterChangeRejected: true, stableLostResponseReplay: true, creationReplayAfterUndoDoesNotReactivate: true,
    noClientSnapshotAccepted: true, ownershipChecked: true, priorAppointmentSnapshotPreserved: true };
}
