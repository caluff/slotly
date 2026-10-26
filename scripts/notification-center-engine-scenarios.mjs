import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
export async function notificationCenterScenarios({
  setup,
  date,
  start,
  makeClient,
  race,
  report,
  restart,
}) {
  const serial = [],
    raw = (who) => who.client.query("engineFixtures:attentionRaw", {}),
    list = (who, cursor = null, numItems = 5) =>
      who.client.query("appointments:listMyAppointmentNotices", {
        paginationOpts: { cursor, numItems },
      });
  const job = (who, row, name = "runAppointmentReminder") => ({
    who,
    name: "appointments:" + name,
    args: {
      businessId: who.businessId,
      appointmentId: row._id,
      version: row.version ?? 0,
      start: row.start,
      end: row.end,
    },
  });
  const invoke = (op) =>
    makeClient(op.who.identity).mutation(op.name, op.args, { skipQueue: true });
  const read = (who, n) => ({
      who,
      name: "appointments:readMyAppointmentNotice",
      args: { noticeId: n._id, stage: n.stage, operationId: randomUUID() },
    }),
    claim = (who, n) => ({
      ...read(who, n),
      name: "appointments:claimMySystemReminder",
    });
  async function seed(options = {}) {
    const who = await setup("Synthetic notification center"),
      id = await who.client.mutation("engineFixtures:attentionSeed", {
        serviceId: who.serviceId,
        managed: true,
        receiptKey: randomUUID(),
        ...options,
      }),
      row = (await raw(who)).appointments.find((r) => r._id === id);
    return { who, row };
  }
  const values = (r) =>
    r.status === "fulfilled" ? (r.value?.outcome ?? r.value) : String(r.reason);
  for (let round = 1; round <= 3; round++)
    for (const scenario of [
      "read-vs-publication",
      "stale-claim-vs-publication",
      "read-vs-claim",
      "duplicate-claim",
    ]) {
      const { who, row } = await seed({ offset: 602500 });
      await invoke(job(who, row));
      const initial = (await raw(who)).notices[0];
      assert.equal(initial.stage, 0);
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(0, row.start - 600000 - Date.now()) + 30),
      );
      let first, second;
      if (scenario.includes("publication")) {
        first = scenario.startsWith("read")
          ? read(who, initial)
          : claim(who, initial);
        second = job(who, row);
      } else {
        await invoke(job(who, row));
        const n = (await raw(who)).notices[0];
        first = claim(who, n);
        second = scenario === "duplicate-claim" ? claim(who, n) : read(who, n);
      }
      const before = await raw(who),
        ops = round === 2 ? [second, first] : [first, second],
        raced = await race(ops),
        after = await raw(who),
        n = after.notices[0],
        original = before.notices[0];
      assert.deepEqual(after.appointments, before.appointments);
      assert.deepEqual(after.receipts, before.receipts);
      assert.equal(after.notices.length, 1);
      assert.equal(n.stage, 1);
      assert.deepEqual(n.snapshot, original.snapshot);
      const expected = { ...original };
      if (scenario.includes("publication")) {
        expected.stage = 1;
        expected.updatedAt = n.updatedAt;
        assert.ok(n.updatedAt > original.updatedAt);
        if (n.readStage !== undefined) {
          assert.equal(n.readStage, 0);
          expected.readStage = 0;
        }
        if (scenario.startsWith("stale"))
          assert.equal(raced.results[ops.indexOf(first)].value, false);
      } else {
        assert.equal(n.updatedAt, original.updatedAt);
        expected.systemStage = 1;
        const winner = ops.find(
          (op, i) =>
            op.name === "appointments:claimMySystemReminder" &&
            raced.results[i].value === true,
        );
        assert.ok(winner);
        expected.systemOperationId = winner.args.operationId;
        if (scenario === "duplicate-claim")
          assert.equal(raced.results.filter((r) => r.value === true).length, 1);
        else expected.readStage = 1;
      }
      assert.deepEqual(n, expected);
      const dto = (await list(who)).page[0];
      assert.equal(dto.publishedAt, n.updatedAt);
      assert.equal(dto.read, (n.readStage ?? -1) >= n.stage);
      report.scenarios.push({
        round,
        scenario: "notice-" + scenario,
        requests: 2,
        maxInFlight: raced.maxInFlight,
        observedResults: raced.results.map(values),
        fullDocumentsVerified: true,
        before,
        after,
      });
    }
  for (let round = 1; round <= 3; round++)
    for (const scenario of ["cancel", "move", "arrival"]) {
      const { who, row } = await seed(),
        first = job(who, row),
        second =
          scenario === "cancel"
            ? {
                who,
                name: "appointments:cancelMyAppointment",
                args: { appointmentId: row._id, expectedVersion: 0 },
              }
            : scenario === "move"
              ? {
                  who,
                  name: "appointments:rescheduleMyAppointment",
                  args: {
                    appointmentId: row._id,
                    expectedVersion: 0,
                    date,
                    start,
                  },
                }
              : {
                  who,
                  name: "appointments:arriveMyAppointment",
                  args: {
                    appointmentId: row._id,
                    expectedVersion: 0,
                    operationId: randomUUID(),
                  },
                };
      const before = await raw(who),
        ops = round === 2 ? [second, first] : [first, second],
        raced = await race(ops),
        after = await raw(who);
      assert.ok(raced.results.every((r) => r.status === "fulfilled"));
      assert.deepEqual(after.receipts, before.receipts);
      assert.equal(after.appointments.length, 1);
      assert.equal(after.appointments[0].version, 1);
      assert.ok(after.notices.length <= 1);
      if (after.notices.length) {
        const n = after.notices[0];
        assert.equal(n.active, false);
        assert.equal(n.snapshot.start, row.start);
        assert.equal(n.snapshot.end, row.end);
        assert.equal(n.snapshot.version, 0);
        assert.equal((await list(who)).page[0].contextCurrent, false);
      }
      const stable = await raw(who);
      await invoke(first);
      assert.deepEqual(await raw(who), stable);
      report.scenarios.push({
        round,
        scenario: "notice-publication-vs-" + scenario,
        requests: 2,
        maxInFlight: raced.maxInFlight,
        observedResults: raced.results.map(values),
        fullDocumentsVerified: true,
        before,
        after,
      });
    }
  for (const transition of [
    "cancel",
    "move",
    "arrival",
    "manual-result",
    "automatic-absence",
    "undo-absence",
  ])
    for (const order of ["publication-first", "transition-first"]) {
      const past = [
          "manual-result",
          "automatic-absence",
          "undo-absence",
        ].includes(transition),
        { who, row } = await seed(
          past
            ? { offset: -2400000, endOffset: -1, historicalNotice: true }
            : {},
        );
      const publish = () => invoke(job(who, row));
      let ticket;
      const change = async () => {
        if (transition === "cancel")
          await who.client.mutation("appointments:cancelMyAppointment", {
            appointmentId: row._id,
            expectedVersion: 0,
          });
        else if (transition === "move")
          await who.client.mutation("appointments:rescheduleMyAppointment", {
            appointmentId: row._id,
            expectedVersion: 0,
            date,
            start,
          });
        else if (transition === "arrival")
          ticket = (
            await who.client.mutation("appointments:arriveMyAppointment", {
              appointmentId: row._id,
              expectedVersion: 0,
              operationId: randomUUID(),
            })
          ).undo;
        else if (transition === "manual-result")
          await who.client.mutation("appointments:markMyAppointmentResult", {
            appointmentId: row._id,
            expectedVersion: 0,
            operationId: randomUUID(),
            result: "completed",
          });
        else {
          await invoke(job(who, row, "runAppointmentAbsence"));
          if (transition === "undo-absence") {
            const saved = (await raw(who)).appointments[0];
            await who.client.mutation("appointments:undoMyAppointmentResult", {
              appointmentId: row._id,
              expectedVersion: 1,
              targetOperationId: saved.resultUndo.operationId,
              operationId: randomUUID(),
            });
          }
        }
      };
      if (order === "publication-first") {
        await publish();
        await change();
      } else {
        await change();
        await publish();
      }
      let state = await raw(who),
        page = await list(who);
      assert.equal(page.page.length, state.notices.length);
      for (const n of page.page) {
        const stored = state.notices.find((v) => v._id === n._id);
        assert.equal(n.publishedAt, stored.updatedAt);
        assert.deepEqual(n.appointment, stored.snapshot);
      }
      for (const n of page.page) await invoke(read(who, n));
      const readState = await raw(who);
      assert.deepEqual(readState.appointments, state.appointments);
      assert.deepEqual(readState.receipts, state.receipts);
      assert.deepEqual(
        readState.notices,
        state.notices.map((n) => ({ ...n, readStage: n.stage })),
      );
      for (const n of (await list(who)).page) {
        assert.equal(n.read, true);
        await invoke(read(who, n));
        assert.equal(await invoke(claim(who, n)), false);
      }
      assert.deepEqual(await raw(who), readState);
      if (ticket) {
        await who.client.mutation("appointments:undoMyAppointmentResult", {
          appointmentId: row._id,
          expectedVersion: ticket.version,
          targetOperationId: ticket.operationId,
          operationId: randomUUID(),
        });
        const undoState = await raw(who);
        assert.equal(undoState.notices.length,state.notices.length);
        assert.deepEqual(undoState.notices.map(n=>({publishedAt:n.updatedAt,snapshot:n.snapshot})),state.notices.map(n=>({publishedAt:n.updatedAt,snapshot:n.snapshot})));
      }
      serial.push({
        scenario: "history-after-transition-and-historical-read",
        transition,
        order,
        passed: true,
      });
    }
  {
    const { who, row } = await seed();
    await invoke(job(who, row));
    const before = await raw(who),
      n = (await list(who)).page[0],
      op = read(who, n);
    await invoke(op);
    const after = await raw(who);
    assert.deepEqual(after, {
      ...before,
      notices: before.notices.map((n) => ({ ...n, readStage: n.stage })),
    });
    await invoke(op);
    assert.deepEqual(await raw(who), after);
    const foreign = await setup();
    await assert.rejects(
      makeClient().query("appointments:listMyAppointmentNotices", {
        paginationOpts: { cursor: null, numItems: 5 },
      }),
      /UNAUTHENTICATED/,
    );
    await assert.rejects(
      foreign.client.mutation(op.name, op.args),
      /NOTICE_NOT_FOUND/,
    );
    assert.equal((await list(foreign)).page.length, 0);
    await assert.rejects(
      who.client.query("appointments:listMyAppointmentNotices", {
        paginationOpts: { cursor: null, numItems: 5 },
        includeForeign: true,
      }),
    );
    serial.push({
      scenario: "read-replay-full-document-and-private-authorization",
      passed: true,
    });
  }
  {
    const who = await setup(),
      ids = await who.client.mutation("engineFixtures:noticeHistorySeed", {
        serviceId: who.serviceId,
        count: 137,
      }),
      before = await raw(who);
    let cursor = null,
      all = [],
      pages = 0;
    do {
      const page = await list(who, cursor, 100);
      assert.ok(page.page.length <= 5);
      all.push(...page.page);
      pages++;
      if (page.isDone) break;
      cursor = page.continueCursor;
      assert.ok(pages < 40);
    } while (true);
    assert.equal(all.length, 137);
    assert.equal(new Set(all.map((n) => n._id)).size, 137);
    assert.ok(
      all.every((n, i) => i === 0 || all[i - 1].publishedAt >= n.publishedAt),
    );
    await who.client.mutation("appointments:cancelMyAppointment", {
      appointmentId: ids[0],
      expectedVersion: 0,
    });
    const canceled = (await list(who)).page[0];
    assert.equal(canceled.appointment.clientName, "Synthetic notice history 0");
    assert.equal(
      canceled.appointment.start,
      before.appointments.find((r) => r._id === ids[0]).start,
    );
    assert.equal(canceled.currentAppointment.status, "cancelled");
    assert.equal(canceled.contextCurrent, false);
    const state = await raw(who),
      first = await list(who);
    await restart();
    assert.deepEqual(await raw(who), state);
    assert.deepEqual(await list(who), first);
    serial.push({
      scenario:
        "137-persisted-publications-five-per-page-cursors-order-history-and-restart",
      pages,
      passed: true,
    });
  }
  {
    const who = await setup(),
      ids = await who.client.mutation("engineFixtures:noticeHistorySeed", {
        serviceId: who.serviceId,
        count: 1,
        legacy: true,
      }),
      before = (await list(who)).page[0];
    assert.ok(before.appointment);
    await who.client.mutation("engineFixtures:legacyNoticeChange", {
      appointmentId: ids[0],
    });
    const n = (await list(who)).page[0];
    assert.equal(n.appointment, null);
    assert.equal(n.contextCurrent, false);
    assert.equal(n.publishedAt, before.publishedAt);
    assert.equal(n.originalStart, before.originalStart);
    assert.equal(n.currentAppointment.clientName, "Synthetic changed context");
    await invoke(read(who, n));
    assert.equal((await list(who)).page[0].read, true);
    serial.push({
      scenario:
        "legacy-without-snapshot-retained-without-inventing-details-or-publication-time",
      passed: true,
    });
  }
  report.notificationCenter = {
    serialControls: serial,
    fiveInitialThenFivePerPage: true,
    publicationFromPersistedServerTimestamp: true,
    historySnapshotsPreserved: true,
    activeOnlyForActionsAndClaims: true,
    noLegacyBackfill: true,
    readDoesNotAffectAppointments: true,
    fullDocumentsVerified: true,
    scope:
      "Real isolated Convex HTTP/SQLite; synthetic only, no native OS or cloud data writes",
  };
}
