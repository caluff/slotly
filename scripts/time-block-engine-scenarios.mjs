import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Real engine integration only: called by the owned loopback/SQLite harness.
export async function timeBlockScenarios({ setup, date, start, makeClient, race, report }) {
  const minute = 60_000, anon = makeClient();
  const snapshot = who => who.client.query("engineFixtures:snapshot", { date });
  const val = (from = "10:30", to = "11:00", day = date) => ({ date: day, startTime: from, endTime: to, reason: "Synthetic private reason" });
  const ctx = row => row ? { id: row._id, version: row.version } : null;
  const block = (who, value = val(), row = null, operationId = randomUUID()) => ({ who, name: "timeBlocks:changeMyTimeBlock", args: { value, expected: ctx(row), operationId } });
  const privateOp = (who, target, serviceId = who.serviceId) => ({ who, name: "appointments:createMyAppointment", args: { date, start: target, serviceId, clientName: "Synthetic block race" } });
  const publicOp = (who, target) => ({ who: {}, name: "publicBooking:confirm", args: { slug: who.slug, date, start: target, serviceId: who.serviceId, clientName: "Synthetic public block race", attemptKey: randomUUID() } });
  const moveOp = (who, appointmentId, target) => ({ who, name: "appointments:rescheduleMyAppointment", args: { appointmentId, expectedVersion: 0, date, start: target } });
  const invoke = op => (op.who.identity ? makeClient(op.who.identity) : anon).mutation(op.name, op.args);
  const accepted = (op, result) => result.status === "fulfilled" && (op.name !== "publicBooking:confirm" || result.value.ok);
  function resultName(op, result) {
    if (result.status === "rejected") {
      const code = String(result.reason).match(/TIME_BLOCK_APPOINTMENT_CONFLICT|TIME_BLOCK_CONFLICT|TIME_BLOCK_OVERLAP|SLOT_TAKEN/)?.[0];
      assert.ok(code, String(result.reason)); return code;
    }
    return op.name === "publicBooking:confirm" ? result.value.ok ? "booked" : result.value.code : result.value?.outcome ?? "created";
  }
  async function enabled(name) {
    const who = await setup(name);
    who.slug = (await who.client.mutation("bookingLinks:setMyBookingLink", { enabled: true })).slug;
    return who;
  }
  function consistent(saved) {
    const rows = [...saved.timeBlocks.filter(r => r.active), ...saved.appointments.filter(r => r.status === "confirmed")];
    for (const row of rows) assert.ok(row.start < row.end);
    for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
      if (rows[i].date === rows[j].date) assert.ok(rows[i].end <= rows[j].start || rows[j].end <= rows[i].start, "Committed overlap");
    }
    assert.equal(new Set(saved.timeBlocks.map(r => r._id)).size, saved.timeBlocks.length);
  }
  async function options(who, day = date) {
    const saved = await snapshot(who);
    for (const serviceId of [who.serviceId, who.secondServiceId]) {
      const privateResult = await who.client.action("availability:getMyAvailability", { date: day, serviceId });
      const publicResult = await anon.action("publicBooking:getAvailability", { slug: who.slug, date: day, serviceId });
      assert.deepEqual(publicResult.slots, privateResult.slots);
      const occupied = [...saved.timeBlocks.filter(r => r.active && r.date === day), ...saved.appointments.filter(r => r.status === "confirmed" && r.date === day)];
      assert.ok(privateResult.slots.every(s => occupied.every(r => s.end <= r.start || r.end <= s.start)));
      assert.deepEqual(Object.keys(publicResult), ["slots"]);
      assert.ok(!JSON.stringify(publicResult).includes("Synthetic"));
    }
    const source = await who.client.query("publicBooking:getSource", { slug: who.slug, date: day, serviceId: who.serviceId });
    assert.deepEqual(Object.keys(source).sort(), ["days", "durationMinutes", "occupied", "specialDay", "timeZone"]);
    assert.ok(source.occupied.every(r => JSON.stringify(Object.keys(r).sort()) === '["end","start"]'));
  }
  const scenarios = ["block-private", "block-public", "block-reschedule", "overlap-blocks", "adjacent-blocks", "duplicate-create",
    "double-edit", "edit-remove", "duplicate-edit", "duplicate-remove", "move-private-destination", "move-public-destination", "move-reschedule-destination",
    "move-private-origin", "move-public-origin", "move-reschedule-origin", "move-block-destination", "two-block-moves", "independent-businesses", "independent-dates"];
  for (let round = 1; round <= 3; round++) for (const scenario of scenarios) {
    const who = await enabled(`Synthetic time block ${scenario} ${round}`);
    let other = who, original, originalBlock;
    const atOrigin = scenario.endsWith("-origin"), movingBlock = scenario.startsWith("move-") || scenario === "two-block-moves";
    if (movingBlock || ["double-edit", "edit-remove", "duplicate-edit", "duplicate-remove"].includes(scenario)) originalBlock = (await invoke(block(who, val("09:30", "10:00")))).block;
    if (scenario.includes("reschedule")) original = await invoke(privateOp(who, start - 30 * minute));
    const primary = movingBlock ? block(who, val(), originalBlock) : block(who);
    let operations;
    if (scenario === "overlap-blocks") operations = [primary, block(who, val("10:45", "11:15"))];
    else if (scenario === "adjacent-blocks") operations = [primary, block(who, val("11:00", "11:30"))];
    else if (scenario === "duplicate-create") operations = [primary, primary];
    else if (scenario === "double-edit") operations = [block(who, val(), originalBlock), block(who, val("11:00", "11:30"), originalBlock)];
    else if (scenario === "edit-remove") operations = [block(who, val(), originalBlock), block(who, null, originalBlock)];
    else if (scenario === "duplicate-edit" || scenario === "duplicate-remove") { const op = block(who, scenario === "duplicate-remove" ? null : val(), originalBlock); operations = [op, op]; }
    else if (scenario === "move-block-destination") operations = [primary, block(who)];
    else if (scenario === "two-block-moves") { const second = (await invoke(block(who, val("11:30", "12:00")))).block; operations = [primary, block(who, val(), second)]; }
    else if (scenario === "independent-businesses") { other = await enabled("Synthetic distinct block business"); operations = [primary, block(other)]; }
    else if (scenario === "independent-dates") { const next = new Date(Date.parse(`${date}T00:00Z`) + 86400000).toISOString().slice(0, 10); operations = [primary, block(who, val("10:30", "11:00", next))]; }
    else { const target = atOrigin ? start : start + 60 * minute; operations = [primary, scenario.includes("public") ? publicOp(who, target) : scenario.includes("reschedule") ? moveOp(who, original, target) : privateOp(who, target)]; }
    const before = await snapshot(who), beforeOther = other !== who ? await snapshot(other) : null;
    const began = Date.now();
    const { results, maxInFlight } = await race(operations);
    const ended = Date.now(), observed = results.map((r, i) => resultName(operations[i], r));
    const ok = results.map((r, i) => accepted(operations[i], r));
    const after = await snapshot(who), afterOther = other !== who ? await snapshot(other) : null;
    const compatible = ["adjacent-blocks", "duplicate-create", "duplicate-edit", "duplicate-remove", "independent-businesses", "independent-dates"].includes(scenario);
    if (compatible) assert.deepEqual(ok, [true, true]);
    else if (atOrigin) { assert.ok(ok[0]); assert.equal(observed[0], "changed"); if (!ok[1]) assert.equal(observed[1], "SLOT_TAKEN"); }
    else assert.equal(ok.filter(Boolean).length, 1);
    for (const [i, op] of operations.entries()) {
      const state = op.who === other && other !== who ? afterOther : after;
      if (op.name === "timeBlocks:changeMyTimeBlock") {
        if (!ok[i] && op.args.expected && !operations.some((otherOp, j) => ok[j] && otherOp.args.expected?.id === op.args.expected.id)) assert.deepEqual(state.timeBlocks.find(r => r._id === op.args.expected.id), before.timeBlocks.find(r => r._id === op.args.expected.id), "Losing edit mutated original");
        if (ok[i]) {
          const row = state.timeBlocks.find(r => r._id === results[i].value.block._id);
          assert.ok(row); assert.equal(row.businessId, op.who.businessId);
          assert.equal(row.active, op.args.value !== null);
          assert.equal(row.version, (op.args.expected?.version ?? 0) + 1);
          assert.equal(row.lastOperationId, op.args.operationId);
          assert.equal(row.lastExpectedVersion, op.args.expected?.version ?? null);
          assert.ok(row.updatedAt >= began && row.updatedAt <= ended);
          const old = (op.who === other && other !== who ? beforeOther : before).timeBlocks.find(r => r._id === row._id);
          const source = op.args.value ?? old;
          assert.equal(row.date, source.date); assert.equal(row.startTime, source.startTime); assert.equal(row.endTime, source.endTime); assert.equal(row.reason, source.reason);
          assert.equal(row.start, Date.parse(`${source.date}T${source.startTime}:00-03:00`));
          assert.equal(row.end, Date.parse(`${source.date}T${source.endTime}:00-03:00`));
          assert.equal(row.timeZone, "America/Montevideo");
          if (old) assert.deepEqual(row, { ...old, ...(op.args.value ?? {}), start: row.start, end: row.end, active: op.args.value !== null, version: old.version + 1, updatedAt: row.updatedAt, lastOperationId: op.args.operationId, lastExpectedVersion: old.version });
          const beforeRetry = await snapshot(op.who);
          assert.equal((await invoke(op)).outcome, "already_applied");
          assert.deepEqual(await snapshot(op.who), beforeRetry, "Retry renewed metadata");
        }
      } else if (original) {
        const old = before.appointments.find(r => r._id === original), row = after.appointments.find(r => r._id === original);
        if (!ok[i]) assert.deepEqual(row, old);
        else { assert.deepEqual(row, { ...old, start: op.args.start, end: op.args.start + 30 * minute, version: 1, rescheduledAt: row.rescheduledAt, rescheduledFromVersion: 0 }); assert.ok(row.rescheduledAt >= began && row.rescheduledAt <= ended); }
      }
      if (op.name === "publicBooking:confirm") {
        assert.equal(after.receipts.length, ok[i] ? 1 : 0);
        if (ok[i]) { const receipt = after.receipts[0], row = after.appointments.find(r => r._id === receipt.appointmentId); assert.ok(row); assert.equal(row.serviceId, op.args.serviceId); assert.equal(row.businessId, who.businessId); assert.equal(receipt.attemptKey, op.args.attemptKey); assert.deepEqual(await invoke(op), results[i].value); }
      }
    }
    assert.deepEqual(after.weeklySchedules, before.weeklySchedules); assert.deepEqual(after.specialDates, before.specialDates);
    consistent(after); if (afterOther) consistent(afterOther);
    await options(who); if (other !== who) await options(other);
    report.scenarios.push({ round, scenario: `time-block-${scenario}`, requests: operations.length, maxInFlight, observedResults: observed,
      serialOrder: compatible ? "both-compatible" : atOrigin ? ok[1] ? "block-move-before-origin-booking" : "origin-booking-before-block-move" : `operation-${ok[0] ? 1 : 2}-won`,
      finalDocuments: { blocks: after.timeBlocks, appointments: after.appointments, receipts: after.receipts, ...(afterOther ? { otherBlocks: afterOther.timeBlocks } : {}) }, originalsIntactOnRejection: true, stableRetries: true, optionsAgree: true });
  }

  // Explicit orders complement the scheduler; never claim unobserved race orders.
  const serialControls = [];
  for (const change of ["create", "move-destination", "move-origin"]) for (const channel of ["private", "public", "reschedule"]) for (const first of ["block", "booking"]) {
    const who = await enabled(`Synthetic block serial ${change} ${channel} ${first}`);
    const saved = change !== "create" ? (await invoke(block(who, val("09:30", "10:00")))).block : null;
    const original = channel === "reschedule" ? await invoke(privateOp(who, start - 30 * minute)) : null;
    const changeOp = block(who, val(), saved), target = change === "move-origin" ? start : start + 60 * minute;
    const booking = channel === "public" ? publicOp(who, target) : channel === "reschedule" ? moveOp(who, original, target) : privateOp(who, target);
    const ordered = first === "block" ? [changeOp, booking] : [booking, changeOp];
    const firstResult = await Promise.allSettled([invoke(ordered[0])]);
    const middle = await snapshot(who);
    const secondResult = await Promise.allSettled([invoke(ordered[1])]);
    if (change === "move-origin") {
      if (first === "block") assert.ok(accepted(booking, secondResult[0])); else { assert.equal(resultName(booking, firstResult[0]), "SLOT_TAKEN"); if (original) assert.deepEqual((await snapshot(who)).appointments, middle.appointments); }
    } else {
      assert.ok(accepted(ordered[0], firstResult[0])); assert.ok(!accepted(ordered[1], secondResult[0]));
      assert.deepEqual(await snapshot(who), middle);
    }
    const final = await snapshot(who); consistent(final); await options(who);
    serialControls.push({ change, channel, first, results: [resultName(ordered[0], firstResult[0]), resultName(ordered[1], secondResult[0])], finalBlocks: final.timeBlocks, finalAppointments: final.appointments, passed: true });
  }

  for (const kind of ["edit-remove", "move-block-destination", "two-block-moves"]) for (const first of [0, 1]) {
    const who = await enabled(`Synthetic block serial ${kind} ${first}`);
    const original = (await invoke(block(who, val("09:30", "10:00")))).block;
    const second = kind === "two-block-moves" ? (await invoke(block(who, val("11:30", "12:00")))).block : null;
    const ops = [block(who, val(), original), kind === "edit-remove" ? block(who, null, original) : block(who, val(), second)];
    await invoke(ops[first]); const beforeLoser = await snapshot(who);
    await assert.rejects(invoke(ops[1 - first]), kind === "edit-remove" ? /TIME_BLOCK_CONFLICT/ : /TIME_BLOCK_OVERLAP/);
    assert.deepEqual(await snapshot(who), beforeLoser); consistent(beforeLoser); await options(who);
    serialControls.push({ kind, first: first + 1, finalBlocks: beforeLoser.timeBlocks, rejectedOriginalIntact: true, passed: true });
  }

  const who = await enabled("Synthetic block ABA validation privacy");
  const creation = block(who), created = await invoke(creation);
  const unchanged = await snapshot(who);
  assert.equal((await invoke(block(who, val(), created.block))).outcome, "unchanged"); assert.deepEqual(await snapshot(who), unchanged);
  const edit = block(who, val("11:00", "11:30"), created.block), edited = await invoke(edit);
  const remove = block(who, null, edited.block), removed = await invoke(remove);
  const replacement = await invoke(block(who)); assert.notEqual(replacement.block._id, created.block._id);
  const stable = await snapshot(who);
  const replay = await invoke(creation); assert.equal(replay.outcome, "already_applied"); assert.equal(replay.block.active, false);
  for (const op of [edit, block(who, val(), created.block), block(who, val(), removed.block)]) await assert.rejects(invoke(op), /TIME_BLOCK_CONFLICT/);
  assert.equal((await invoke(remove)).outcome, "already_applied"); assert.deepEqual(await snapshot(who), stable);
  const changedAgain = await invoke(block(who, val("11:00", "11:30"), replacement.block));
  const changedAgain2 = await invoke(block(who, val("11:30", "12:00"), changedAgain.block));
  const stable2 = await snapshot(who);
  await assert.rejects(invoke(block(who, val(), replacement.block)), /TIME_BLOCK_CONFLICT/);
  assert.deepEqual(await snapshot(who), stable2);
  // Confirmed conflict, cancellation ignored, partial overlap/adjacency for 46m.
  await assert.rejects(invoke(privateOp(who, start + 90 * minute, who.secondServiceId)), /SLOT_TAKEN/);
  const appointment = await invoke(privateOp(who, start));
  await assert.rejects(invoke(block(who, val("09:45", "10:00"))), /TIME_BLOCK_APPOINTMENT_CONFLICT/);
  await who.client.mutation("appointments:cancelMyAppointment", { appointmentId: appointment, expectedVersion: 0 });
  await invoke(block(who, val("09:45", "10:00")));
  const preview = await who.client.action("availability:getMyRescheduleAvailability", { appointmentId: await invoke(privateOp(who, start - 30 * minute)), date });
  assert.ok(!preview.slots.some(s => s.start === start));
  // Public acknowledgement remains the original after cancellation + later block.
  const receiptWho = await enabled("Synthetic immutable receipt with block");
  const publicOriginal = publicOp(receiptWho, start), receipt = await invoke(publicOriginal);
  const publicId = (await snapshot(receiptWho)).appointments[0]._id;
  await receiptWho.client.mutation("appointments:cancelMyAppointment", { appointmentId: publicId, expectedVersion: 0 });
  await invoke(block(receiptWho, val("09:30", "10:00")));
  const receiptStable = await snapshot(receiptWho); assert.deepEqual(await invoke(publicOriginal), receipt); assert.deepEqual(await snapshot(receiptWho), receiptStable);
  // No schedule opening, no recalculation of stored block instants.
  const week = (await snapshot(who)).weeklySchedules[0].days;
  await who.client.mutation("weeklySchedule:saveMyWeeklySchedule", { days: week.map(d => ({ dayOfWeek: d.dayOfWeek, isOpen: false, start: null, end: null })) });
  assert.equal((await who.client.action("availability:getMyAvailability", { date, serviceId: who.serviceId })).slots.length, 0);
  const beforeWeekRestore = (await snapshot(who)).timeBlocks; await who.client.mutation("weeklySchedule:saveMyWeeklySchedule", { days: week });
  assert.deepEqual((await snapshot(who)).timeBlocks, beforeWeekRestore);
  const invalids = [{ ...val(), date: "2027-02-30" }, { ...val(), startTime: "24:00" }, { ...val(), endTime: "09:00" }, { ...val(), reason: "x".repeat(241) }, { ...val(), date: "2000-01-01" }];
  for (const value of invalids) await assert.rejects(invoke(block(who, value)), /INVALID_DATE|INVALID_TIME|INVALID_INTERVAL|INVALID_REASON|TIME_BLOCK_STARTED/);
  await assert.rejects(anon.mutation("timeBlocks:changeMyTimeBlock", creation.args), /UNAUTHENTICATED/);
  await assert.rejects(anon.query("timeBlocks:getMyTimeBlock", { id: created.block._id }), /UNAUTHENTICATED/);
  await assert.rejects(anon.query("timeBlocks:listMyTimeBlocks", { from: date, until: date, paginationOpts: { cursor: null, numItems: 1 } }), /UNAUTHENTICATED/);
  await assert.rejects(anon.query("timeBlocks:getMyOccupation", { date }), /UNAUTHENTICATED/);
  const foreign = await enabled("Synthetic foreign block owner");
  await assert.rejects(foreign.client.query("timeBlocks:getMyTimeBlock", { id: created.block._id }), /TIME_BLOCK_NOT_FOUND/);
  await assert.rejects(invoke(block(foreign, null, changedAgain2.block)), /TIME_BLOCK_NOT_FOUND/);
  assert.deepEqual(await foreign.client.query("timeBlocks:getMyOccupation", { date }), []);
  // Real DST validation by changing only the isolated synthetic business's zone.
  const dst = await setup("Synthetic DST blocks");
  await dst.client.mutation("engineFixtures:timeZone", { timeZone: "America/New_York" });
  const year = new Date().getUTCFullYear() + 1;
  const sunday = month => { const first = new Date(Date.UTC(year, month, 1)); return 1 + (7 - first.getUTCDay()) % 7; };
  const spring = `${year}-03-${String(sunday(2) + 7).padStart(2, "0")}`, fall = `${year}-11-${String(sunday(10)).padStart(2, "0")}`;
  for (const value of [val("02:15", "03:15", spring), val("01:30", "02:30", spring), val("01:15", "01:45", fall), val("00:30", "02:30", fall)]) await assert.rejects(invoke(block(dst, value)), /TIME_CHANGE/);
  const dstGood = await invoke(block(dst, val("03:00", "03:30", spring))); assert.equal(dstGood.block.start, Date.parse(`${spring}T03:00:00-04:00`));
  // Dense block pages + month-adjacent dates, no reason in the grid DTO.
  const dense = await enabled("Synthetic dense block calendar");
  for (let i = 0; i < 105; i++) {
    const t = minutes => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    await invoke(block(dense, val(t(i * 2), t(i * 2 + 1))));
  }
  let cursor = null, pages = 0, all = [];
  for (;;) { const page = await dense.client.query("timeBlocks:listMyTimeBlocks", { from: date, until: date, paginationOpts: { cursor, numItems: 17 } }); all.push(...page.page); pages++; if (page.isDone) break; cursor = page.continueCursor; assert.ok(pages < 10); }
  assert.equal(all.length, 105); assert.equal(new Set(all.map(r => r._id)).size, 105); assert.ok(all.every(r => !Object.hasOwn(r, "reason")));
  report.timeBlocks = { rounds: 3, scenariosPerRound: scenarios.length, races: scenarios.length * 3, requests: scenarios.length * 6, serialControls,
    observedOrders: Object.fromEntries(scenarios.map(s => [s, report.scenarios.filter(r => r.scenario === `time-block-${s}`).map(r => r.serialOrder)])),
    ABA: { createReplayAcknowledgesTombstone: true, staleEditRejected: true, deleteReplayStable: true, replacementHasNewIdentity: true },
    densePages: { documents: all.length, pages }, DST: { rejected: 4, validUniqueInstant: true }, publicPrivacy: true, immutablePublicReceipt: true, cancellationIgnored: true, previewRespectsBlocks: true };
}
