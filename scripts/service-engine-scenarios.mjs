import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Integration against the REAL isolated engine supplied by the main harness.
// Every race uses independent HTTP clients, a transport barrier and skipQueue.
export async function serviceScenarios({ setup, date, start, makeClient, race, report }) {
  const minute = 60_000, anonymous = makeClient();
  const context = row => ({ name: row.name, durationMinutes: row.durationMinutes, version: row.version ?? 0 });
  const read = (who, id = who.serviceId) => who.client.query("services:getMyService", { id });
  const snapshot = who => who.client.query("engineFixtures:snapshot", { date });
  const invoke = op => makeClient(op.who.identity).mutation(op.name, op.args, { skipQueue: true });
  const change = (who, row, value) => ({ who, name: "services:changeMyService", args: { id: row._id, expectedVersion: row.version, operationId: randomUUID(), change: value } });
  const edit = (who, row, durationMinutes = 45) => change(who, row, { kind: "edit", name: "Changed catalogue", durationMinutes });
  const book = (who, row, channel, target = start) => ({ who: channel === "public" ? {} : who,
    name: channel === "public" ? "publicBooking:confirm" : "appointments:createMyAppointment",
    args: { serviceId: row._id, expectedService: context(row), date, start: target, clientName: "Synthetic service race",
      ...(channel === "public" ? { slug: who.slug, attemptKey: randomUUID() } : {}) } });
  const move = (who, id, target = start + 60 * minute) => ({ who, name: "appointments:rescheduleMyAppointment", args: { appointmentId: id, expectedVersion: 0, date, start: target } });
  const accepted = (op, r) => r.status === "fulfilled" && (op.name !== "publicBooking:confirm" || r.value.ok);
  const label = (op, r) => r.status === "rejected" ? String(r.reason).match(/"code":"([A-Z_]+)"/)?.[1] ?? String(r.reason)
    : op.name === "publicBooking:confirm" ? r.value.ok ? "booked" : r.value.code : r.value?.outcome ?? "booked";
  async function enabled(name) {
    const who = await setup(name);
    who.slug = (await who.client.mutation("bookingLinks:setMyBookingLink", { enabled: true })).slug;
    return who;
  }
  async function options(who) {
    const state = await snapshot(who);
    const publicServices = await anonymous.query("publicBooking:listServices", { slug: who.slug, paginationOpts: { cursor: null, numItems: 100 } });
    const active = await who.client.query("services:listMyServices", { archived: false, paginationOpts: { cursor: null, numItems: 50 } });
    assert.deepEqual(active.page.map(r => r._id).sort(), state.services.filter(r => !r.archived).map(r => r._id).sort());
    assert.deepEqual(publicServices.page.map(r => r.id).sort(), active.page.map(r => r._id).sort());
    const archived = await who.client.query("services:listMyServices", { archived: true, paginationOpts: { cursor: null, numItems: 50 } });
    assert.deepEqual(archived.page.map(r => r._id).sort(), state.services.filter(r => r.archived).map(r => r._id).sort());
    for (const row of state.services) {
      const args = { serviceId: row._id, date };
      const pub = await anonymous.action("publicBooking:getAvailability", { slug: who.slug, ...args });
      if (row.archived) { assert.equal(pub, null); await assert.rejects(who.client.action("availability:getMyAvailability", args), /SERVICE_ARCHIVED/); }
      else {
        const priv = await who.client.action("availability:getMyAvailability", args);
        assert.deepEqual(pub.slots, priv.slots);
        assert.deepEqual(pub.service, { id: row._id, ...context(row) });
        assert.deepEqual(Object.keys(pub).sort(), ["service", "slots"]);
        assert.deepEqual(Object.keys(pub.service).sort(), ["durationMinutes", "id", "name", "version"]);
        for (const slot of pub.slots) {
          assert.equal(slot.end - slot.start, row.durationMinutes * minute);
          assert.ok(state.appointments.filter(r => r.status === "confirmed").every(r => slot.start >= r.end || r.start >= slot.end));
          assert.ok(state.timeBlocks.filter(r => r.active).every(r => slot.start >= r.end || r.start >= slot.end));
        }
      }
    }
  }
  const scenarios = ["rename-private", "rename-public", "duration-private", "duration-public", "archive-private", "archive-public",
    "restore-private", "restore-public", "two-edits", "edit-archive", "two-archives", "two-restores", "archive-restore",
    "double-edit", "double-archive", "double-restore", "duration-reschedule", "archive-reschedule", "restore-reschedule", "different-businesses"];
  for (let round = 1; round <= 3; round++) for (const scenario of scenarios) {
    const who = await enabled(`Synthetic service ${scenario}`);
    let row = await read(who), original;
    if (scenario.startsWith("restore") || scenario === "two-restores" || scenario === "double-restore") {
      row = (await invoke(change(who, row, { kind: "archive" }))).service;
    }
    // Existing appointments can be moved even with an archived service. Seed
    // before archive when necessary, never fabricate production appointment IDs.
    if (scenario.endsWith("reschedule")) {
      if (row.archived) {
        row = (await invoke(change(who, row, { kind: "restore" }))).service;
        original = await invoke(book(who, row, "private", start - 30 * minute));
        row = (await invoke(change(who, row, { kind: "archive" }))).service;
      } else original = await invoke(book(who, row, "private", start - 30 * minute));
    }
    let other = who, ops;
    if (scenario.includes("private") || scenario.includes("public")) {
      const kind = scenario.split("-")[0];
      const command = kind === "rename" ? change(who, row, { kind: "edit", name: "Renamed" }) : kind === "duration" ? edit(who, row) : change(who, row, { kind });
      ops = [command, book(who, row, scenario.endsWith("public") ? "public" : "private")];
    } else if (scenario.endsWith("reschedule")) ops = [scenario.startsWith("duration") ? edit(who, row) : change(who, row, { kind: scenario.split("-")[0] }), move(who, original)];
    else if (scenario === "different-businesses") { other = await enabled("Synthetic service other"); ops = [edit(who, row), edit(other, await read(other))]; }
    else if (scenario.startsWith("double")) { const op = scenario.endsWith("edit") ? edit(who, row) : change(who, row, { kind: scenario.endsWith("restore") ? "restore" : "archive" }); ops = [op, op]; }
    else if (scenario === "two-edits") ops = [edit(who, row), edit(who, row, 20)];
    else if (scenario === "edit-archive") ops = [edit(who, row), change(who, row, { kind: "archive" })];
    else if (scenario === "archive-restore") ops = [change(who, row, { kind: "archive" }), change(who, row, { kind: "restore" })];
    else { const kind = scenario.endsWith("restores") ? "restore" : "archive"; ops = [change(who, row, { kind }), change(who, row, { kind })]; }
    const before = await snapshot(who), beforeOther = other !== who ? await snapshot(other) : null, began = Date.now();
    const { results, maxInFlight } = await race(ops);
    const ended = Date.now(), after = await snapshot(who), afterOther = other !== who ? await snapshot(other) : null;
    const ok = results.map((r, i) => accepted(ops[i], r)), observed = results.map((r, i) => label(ops[i], r));
    assert.ok(ok[0] || ok[1]);
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      if (!ok[i]) assert.match(observed[i], /SERVICE_CONFLICT|SERVICE_CHANGED|SERVICE_ARCHIVED/);
      if (op.name === "services:changeMyService" && ok[i]) {
        const stateBefore = op.who === other && other !== who ? beforeOther : before;
        const stateAfter = op.who === other && other !== who ? afterOther : after;
        const old = stateBefore.services.find(r => r._id === op.args.id), saved = stateAfter.services.find(r => r._id === op.args.id);
        if (results[i].value.outcome !== "unchanged") {
          assert.equal(saved.version, (old.version ?? 0) + 1); assert.equal(saved.lastOperationId, op.args.operationId);
          assert.equal(saved.lastExpectedVersion, op.args.expectedVersion); assert.equal(saved.lastValue, JSON.stringify(op.args.change.kind === "edit" ? ["edit", op.args.change.name, op.args.change.durationMinutes ?? null] : [op.args.change.kind]));
          assert.ok(saved.updatedAt >= began && saved.updatedAt <= ended);
          const value = op.args.change;
          const { undoSnapshot: oldUndo, ...oldFields } = old;
          void oldUndo;
          assert.deepEqual(saved, { ...oldFields, name: value.kind === "edit" ? value.name : old.name,
            durationMinutes: value.kind === "edit" ? value.durationMinutes ?? old.durationMinutes : old.durationMinutes,
            archived: value.kind === "archive", version: (old.version ?? 0) + 1, updatedAt: saved.updatedAt,
            lastOperationId: op.args.operationId, lastExpectedVersion: op.args.expectedVersion, lastValue: JSON.stringify(value.kind === "edit" ? ["edit", value.name, value.durationMinutes ?? null] : [value.kind]),
            ...(value.kind === "edit" ? { undoSnapshot: { operationId: op.args.operationId, version: (old.version ?? 0) + 1, kind: "edit", name: old.name, durationMinutes: old.durationMinutes, archived: old.archived === true } } : {}) });
          const stable = await snapshot(op.who);
          assert.equal((await invoke(op)).outcome, "already_applied"); assert.deepEqual(await snapshot(op.who), stable);
        }
      }
    }
    if (scenario.includes("private") || scenario.includes("public")) {
      assert.equal(ok[0], true);
      if (scenario.startsWith("restore")) assert.equal(ok[1], false);
      assert.equal(after.appointments.length, ok[1] ? 1 : 0);
      if (ok[1]) {
        const saved = after.appointments[0]; assert.equal(saved.serviceId, row._id); assert.equal(saved.businessId, who.businessId);
        assert.equal(saved.serviceName, row.name); assert.equal(saved.start, start); assert.equal(saved.end, start + row.durationMinutes * minute); assert.equal(saved.status, "confirmed");
        if (scenario.endsWith("public")) { assert.equal(after.receipts.length, 1); assert.equal(after.receipts[0].appointmentId, saved._id); assert.deepEqual(await invoke(ops[1]), results[1].value); }
      }
    } else if (original) {
      assert.deepEqual(ok, [true, true]);
      const old = before.appointments[0], saved = after.appointments[0];
      assert.deepEqual(saved, { ...old, start: ops[1].args.start, end: ops[1].args.start + 30 * minute, version: 1,
        rescheduledAt: saved.rescheduledAt, rescheduledFromVersion: 0 });
      assert.ok(saved.rescheduledAt >= began && saved.rescheduledAt <= ended);
    } else if (!scenario.startsWith("double") && scenario !== "different-businesses" && scenario !== "archive-restore") assert.equal(ok.filter(Boolean).length, 1);
    else if (scenario.startsWith("double")) { assert.deepEqual(ok, [true, true]); assert.deepEqual(observed.sort(), ["already_applied", "changed"]); }
    assert.deepEqual(after.business, before.business); assert.deepEqual(after.weeklySchedules, before.weeklySchedules);
    assert.deepEqual(after.specialDates, before.specialDates); assert.deepEqual(after.timeBlocks, before.timeBlocks);
    for (const saved of before.services.filter(r => r._id !== row._id)) assert.deepEqual(after.services.find(r => r._id === saved._id), saved);
    await options(who); if (other !== who) await options(other);
    report.scenarios.push({ round, scenario: `service-${scenario}`, requests: 2, maxInFlight, observedResults: results.map((r, i) => label(ops[i], r)),
      serialOrder: scenario.includes("private") || scenario.includes("public") ? ok[1] ? "booking-before-change" : "change-before-booking-or-archived" : "see-observed-results",
      finalDocuments: after, ...(afterOther ? { otherFinalDocuments: afterOther } : {}), completeDocumentsVerified: true, optionsAgree: true });
  }

  // Deterministic complementary orders. These do not imply either order was
  // observed in a race and do not count as competing HTTP requests.
  const serial = [];
  for (const kind of ["rename", "duration", "archive"]) for (const channel of ["private", "public"]) for (const first of ["change", "booking"]) {
    const who = await enabled(`Synthetic service serial ${kind} ${channel} ${first}`), row = await read(who);
    const changeOp = kind === "rename" ? change(who, row, { kind: "edit", name: "Renamed" }) : kind === "duration" ? edit(who, row) : change(who, row, { kind: "archive" });
    const booking = book(who, row, channel), ops = first === "change" ? [changeOp, booking] : [booking, changeOp];
    const one = await Promise.allSettled([invoke(ops[0])]); assert.ok(accepted(ops[0], one[0]));
    const middle = await snapshot(who), two = await Promise.allSettled([invoke(ops[1])]);
    if (first === "change") { assert.ok(!accepted(ops[1], two[0])); assert.deepEqual(await snapshot(who), middle); }
    else { assert.ok(accepted(ops[1], two[0])); assert.deepEqual((await snapshot(who)).appointments, middle.appointments); }
    await options(who); serial.push({ kind, channel, first, results: [label(ops[0], one[0]), label(ops[1], two[0])], passed: true });
  }
  for (const pair of ["two-edits", "edit-archive", "archive-restore"]) for (const first of [0, 1]) {
    const who = await enabled(`Synthetic service serial ${pair} ${first}`), row = await read(who);
    const ops = pair === "archive-restore" ? [change(who, row, { kind: "archive" }), change(who, row, { kind: "restore" })]
      : [edit(who, row), pair === "edit-archive" ? change(who, row, { kind: "archive" }) : edit(who, row, 20)];
    await invoke(ops[first]); const middle = await snapshot(who);
    if (pair === "archive-restore" && first === 1) await invoke(ops[0]);
    else { await assert.rejects(invoke(ops[1 - first]), /SERVICE_CONFLICT/); assert.deepEqual(await snapshot(who), middle); }
    serial.push({ pair, first: first + 1, passed: true });
  }

  const who = await enabled("Synthetic service compatibility replay privacy"), other = await enabled("Synthetic service isolation");
  let row = await read(who);
  const noOp = change(who, row, { kind: "edit", name: row.name });
  const stable = await snapshot(who); assert.equal((await invoke(noOp)).outcome, "unchanged"); assert.equal((await invoke(noOp)).outcome, "unchanged"); assert.deepEqual(await snapshot(who), stable);
  const original = await invoke(book(who, row, "private", start - 30 * minute));
  const acceptedPublic = book(who, row, "public", start + 90 * minute), receipt = await invoke(acceptedPublic);
  assert.equal(receipt.ok, true); const originals = (await snapshot(who)).appointments;
  const rename = edit(who, row), changed = await invoke(rename); row = changed.service;
  // Simulate a lost successful response by discarding it then replaying exactly.
  const beforeReplay = await snapshot(who); assert.equal((await invoke(rename)).outcome, "already_applied"); assert.deepEqual(await snapshot(who), beforeReplay);
  const archive = change(who, row, { kind: "archive" }); row = (await invoke(archive)).service;
  const whileArchived = await snapshot(who);
  assert.deepEqual(await invoke(acceptedPublic), receipt);
  assert.deepEqual(await snapshot(who), whileArchived);
  const restore = change(who, row, { kind: "restore" }); row = (await invoke(restore)).service;
  const afterABA = await snapshot(who);
  for (const op of [rename, archive, noOp]) await assert.rejects(invoke(op), /SERVICE_CONFLICT/);
  assert.equal((await invoke(restore)).outcome, "already_applied"); assert.deepEqual(await snapshot(who), afterABA);
  assert.deepEqual(afterABA.appointments, originals); assert.deepEqual(await invoke(acceptedPublic), receipt);
  // Reto09 persisted attempts with no catalogue context still acknowledge their
  // immutable receipt; they cannot create a new appointment without context.
  const oldClient = makeClient(undefined, undefined, false), oldArgs = { ...acceptedPublic.args }; delete oldArgs.expectedService;
  // This receipt was created by the email release: omitting its email/context is a payload conflict.
  // Truly legacy email-free receipts are covered by emailClientsScenarios with stored legacy fixtures.
  assert.equal((await oldClient.mutation("publicBooking:confirm", oldArgs)).code, "ATTEMPT_CONFLICT");
  assert.equal((await oldClient.mutation("publicBooking:confirm", { ...oldArgs, email: "regression@example.test", attemptKey: randomUUID(), start: start + 30 * minute })).code, "SERVICE_CHANGED");
  assert.deepEqual((await snapshot(who)).appointments, originals);
  await assert.rejects(makeClient().mutation("services:changeMyService", restore.args), /UNAUTHENTICATED/);
  await assert.rejects(other.client.mutation("services:changeMyService", restore.args), /SERVICE_NOT_FOUND/);
  await assert.rejects(other.client.query("services:getMyService", { id: row._id }), /SERVICE_NOT_FOUND/);
  for (const version of [-1, 0.5, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1]) await assert.rejects(invoke({ ...edit(who, row), args: { ...edit(who, row).args, expectedVersion: version } }), /INVALID_VERSION/);
  const preview = await who.client.action("availability:getMyRescheduleAvailability", { appointmentId: original, date });
  assert.equal(preview.service.durationMinutes, 30); assert.equal(preview.service.name, "Synthetic 30");
  await invoke(move(who, original));
  assert.equal((await snapshot(who)).appointments.find(r => r._id === original).end - (start + 60 * minute), 30 * minute);
  // Fresh duration45 is checked on a separate date/business to avoid occupation.
  const fresh = await enabled("Synthetic service fresh duration"), old = await read(fresh);
  const oldId = await invoke(book(fresh, old, "private", start - 30 * minute));
  const revised = (await invoke(edit(fresh, old))).service;
  const freshId = await invoke(book(fresh, revised, "private", start + 60 * minute));
  const freshRows = (await snapshot(fresh)).appointments;
  assert.equal(freshRows.find(r => r._id === oldId).end - freshRows.find(r => r._id === oldId).start, 30 * minute);
  assert.equal(freshRows.find(r => r._id === freshId).end - freshRows.find(r => r._id === freshId).start, 45 * minute);
  const legacy = await read(who, who.secondServiceId), legacyBefore = (await snapshot(who)).services.find(r => r._id === legacy._id);
  assert.equal(legacy.durationMinutes, 46); assert.equal(legacy.version, 0); assert.equal(legacy.archived, false); assert.ok(!("version" in legacyBefore));
  let renamedLegacy = (await invoke(change(who, legacy, { kind: "edit", name: "Legacy renamed" }))).service;
  assert.equal(renamedLegacy.durationMinutes, 46);
  renamedLegacy = (await invoke(change(who, renamedLegacy, { kind: "archive" }))).service;
  renamedLegacy = (await invoke(change(who, renamedLegacy, { kind: "restore" }))).service;
  assert.equal(renamedLegacy.durationMinutes, 46);
  const unchanged = await snapshot(who);
  const invalid = [5, 10, 12, 17, 0, -5, 15.5, 46, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1];
  for (const durationMinutes of invalid) {
    await assert.rejects(who.client.mutation("services:createMyService", { name: "Invalid", durationMinutes, operationId: randomUUID() }), /INVALID_DURATION/);
    await assert.rejects(invoke(change(who, renamedLegacy, { kind: "edit", name: renamedLegacy.name, durationMinutes })), /INVALID_DURATION/);
  }
  assert.deepEqual(await snapshot(who), unchanged);
  const legacyId = await invoke(book(who, renamedLegacy, "private", start - 30 * minute));
  for (const durationMinutes of [15, 20, 25, 30, 35, 45, 60, 9007199254740990]) {
    const args = { name: `Valid ${durationMinutes}`, durationMinutes, operationId: randomUUID() };
    const id = await who.client.mutation("services:createMyService", args); assert.equal(await who.client.mutation("services:createMyService", args), id);
    assert.equal((await read(who, id)).durationMinutes, durationMinutes);
    if (durationMinutes === 20) {
      let created = await read(who, id);
      created = (await invoke(change(who, created, { kind: "archive" }))).service;
      created = (await invoke(change(who, created, { kind: "restore" }))).service;
      const stable = await snapshot(who);
      assert.equal(await who.client.mutation("services:createMyService", args), id);
      assert.deepEqual(await snapshot(who), stable, "Old creation replay after transitions must preserve all documents");
    }
    await assert.rejects(who.client.mutation("services:createMyService", { ...args, name: "Different payload" }), /SERVICE_CONFLICT/);
  }
  renamedLegacy = (await invoke(change(who, renamedLegacy, { kind: "edit", name: renamedLegacy.name, durationMinutes: 20 }))).service;
  assert.equal(renamedLegacy.durationMinutes, 20);
  const legacyPreview = await who.client.action("availability:getMyRescheduleAvailability", { appointmentId: legacyId, date });
  assert.equal(legacyPreview.service.durationMinutes, 46);
  const legacyMoved = await invoke(move(who, legacyId, start));
  assert.equal(legacyMoved.end - legacyMoved.start, 46 * minute);
  for (const first of ["edit", "move"]) {
    const occupied = await enabled(`Synthetic historical conflict ${first}`), old = await read(occupied);
    const id = await invoke(book(occupied, old, "private", start - 30 * minute));
    await invoke(book(occupied, old, "private", start + 75 * minute));
    const editOp = edit(occupied, old, 15), moveOp = move(occupied, id);
    if (first === "edit") await invoke(editOp);
    const unchanged = await snapshot(occupied);
    await assert.rejects(invoke(moveOp), /SLOT_TAKEN/);
    assert.deepEqual(await snapshot(occupied), unchanged, "Rejected historical move must leave original completely intact");
    if (first === "move") await invoke(editOp);
    const after = await snapshot(occupied);
    assert.deepEqual(after.appointments, unchanged.appointments);
    await options(occupied);
    serial.push({kind:"historical30-vs-new15-and-occupied-end",first,originalIntact:true,passed:true});
  }
  // History remains selectable for archived identities; pagination preserves all
  // rows and snapshots, independent of active-only creation catalogues.
  row = (await invoke(change(who, row, { kind: "archive" }))).service;
  const history = await who.client.query("appointments:searchMyAppointments", { client: "", serviceId: row._id, period: "todas", from: date, until: date, paginationOpts: { cursor: null, numItems: 1 } });
  assert.equal(history.page.length, 1); assert.equal(history.page[0].serviceId, row._id); assert.equal(history.page[0].serviceName, "Synthetic 30");
  await options(who); await options(fresh);
  report.services = { rounds: 3, races: scenarios.length * 3, requests: scenarios.length * 6, serialControls: serial,
    legacyDurationPreservedUntilExplicitEdit: true, legacyReschedule46AfterCatalogue20: true, historical30RejectsOverlapAfterCatalogue15: true, original30AndNew45Verified: true, acceptedReceiptAfterABA: true,
    emailReceiptMissingPayloadRejected: true, missingNewContextRejected: true, invalidDurations: invalid, validDurations: [15, 20, 25, 30, 35, 45, 60, 9007199254740990],
    lostResponseReplayStable: true, staleCommandsAfterABARejected: true, noOpMetadataUnchanged: true, ownershipAndPrivacy: true };
}
