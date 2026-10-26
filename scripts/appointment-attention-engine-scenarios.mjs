import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export async function appointmentAttentionScenarios({
  setup,
  date,
  start,
  makeClient,
  race,
  report,
  restart,
}) {
  const serial = [];
  const raw = (who) => who.client.query("engineFixtures:attentionRaw", {});
  const rowOf = (snapshot, id) =>
    snapshot.appointments.find((row) => row._id === id);
  const invoke = (op) =>
    makeClient(op.who.identity).mutation(op.name, op.args, { skipQueue: true });
  const cmd = (who, row, kind = "arrival", operationId = randomUUID()) => ({
    who,
    name:
      kind === "arrival"
        ? "appointments:arriveMyAppointment"
        : "appointments:cancelMyAppointmentInWindow",
    args: {
      appointmentId: row._id,
      expectedVersion: row.version ?? 0,
      operationId,
    },
  });
  const job = (who, row, name = "runAppointmentAbsence") => ({
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
  const undo = (who, ticket) => ({
    who,
    name: "appointments:undoMyAppointmentResult",
    args: {
      appointmentId: ticket.appointmentId,
      expectedVersion: ticket.version,
      targetOperationId: ticket.operationId,
      operationId: randomUUID(),
    },
  });
  const label = (result) =>
    result.status === "fulfilled"
      ? (result.value?.outcome ?? result.value)
      : (String(result.reason).match(/"code":"([A-Z_]+)"/)?.[1] ??
        String(result.reason));
  async function seed(options = {}) {
    const who = await setup("Synthetic arrival and reminders");
    const id = await who.client.mutation("engineFixtures:attentionSeed", {
      serviceId: who.serviceId,
      managed: true,
      ...options,
    });
    return { who, row: rowOf(await raw(who), id) };
  }
  function unchangedRelations(before, after, id) {
    assert.deepEqual(after.receipts, before.receipts);
    assert.equal(after.appointments.length, before.appointments.length);
    for (const row of before.appointments)
      if (row._id !== id) assert.deepEqual(rowOf(after, row._id), row);
  }
  function verifyWindow(before, after, operation) {
    const old = rowOf(before, operation.args.appointmentId),
      saved = rowOf(after, old._id),
      arrival = operation.name.endsWith("arriveMyAppointment");
    const expected = {
      ...old,
      version: (old.version ?? 0) + 1,
      lastResultOperationId: operation.args.operationId,
      lastResultExpectedVersion: old.version ?? 0,
      lastResultValue: JSON.stringify([
        "arrival-window",
        arrival ? "arrival" : "cancel",
      ]),
      ...(arrival
        ? {
            status: "completed",
            resultAt: saved.resultAt,
            arrivedAt: saved.arrivedAt,
            holdsSlot: true,
            resultUndo: {
              operationId: operation.args.operationId,
              version: (old.version ?? 0) + 1,
              status: "confirmed",
              kind: "arrival",
            },
          }
        : { status: "cancelled", cancelledAt: saved.cancelledAt }),
    };
    assert.deepEqual(saved, expected);
    if (arrival) assert.equal(saved.resultAt, saved.arrivedAt);
    unchangedRelations(before, after, old._id);
  }
  for (let round = 1; round <= 3; round++)
    for (const scenario of [
      "duplicate-arrival",
      "different-arrival",
      "arrival-vs-window-cancel",
      "arrival-vs-normal-cancel",
      "arrival-vs-move",
      "arrival-vs-early-job",
      "end-job-vs-manual",
      "duplicate-end-job",
      "duplicate-claim",
      "read-vs-claim",
      "arrival-vs-booking",
      "undo-vs-booking",
    ]) {
      const { who, row } = await seed(
        scenario.includes("end-job")
          ? { offset: -2400000, endOffset: -1000 }
          : {},
      );
      const arrive = cmd(who, row);
      let first = arrive,
        second;
      if (scenario === "duplicate-arrival") second = first;
      if (scenario === "different-arrival") second = cmd(who, row);
      if (scenario === "arrival-vs-window-cancel")
        second = cmd(who, row, "cancel");
      if (scenario === "arrival-vs-normal-cancel")
        second = {
          who,
          name: "appointments:cancelMyAppointment",
          args: { appointmentId: row._id, expectedVersion: 0 },
        };
      if (scenario === "arrival-vs-move")
        second = {
          who,
          name: "appointments:rescheduleMyAppointment",
          args: { appointmentId: row._id, expectedVersion: 0, date, start },
        };
      if (scenario === "arrival-vs-early-job") second = job(who, row);
      if (scenario === "end-job-vs-manual") {
        first = job(who, row);
        second = {
          who,
          name: "appointments:markMyAppointmentResult",
          args: {
            appointmentId: row._id,
            expectedVersion: 0,
            result: "completed",
            operationId: randomUUID(),
          },
        };
      }
      if (scenario === "duplicate-end-job") {
        first = job(who, row);
        second = first;
      }
      if (scenario === "duplicate-claim" || scenario === "read-vs-claim") {
        await invoke(job(who, row, "runAppointmentReminder"));
        const notice = (await raw(who)).notices[0];
        first = {
          who,
          name: "appointments:claimMySystemReminder",
          args: {
            noticeId: notice._id,
            stage: notice.stage,
            operationId: randomUUID(),
          },
        };
        second = {
          ...first,
          args: { ...first.args, operationId: randomUUID() },
          ...(scenario === "read-vs-claim"
            ? { name: "appointments:readMyAppointmentNotice" }
            : {}),
        };
      }
      if (scenario === "arrival-vs-booking" || scenario === "undo-vs-booking") {
        const days = Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i + 1,
          isOpen: true,
          start: "00:00",
          end: "23:59",
        }));
        await who.client.mutation("weeklySchedule:saveMyWeeklySchedule", {
          days,
        });
        const overlap = Math.ceil((Date.now() + 60000) / 900000) * 900000;
        second = {
          who,
          name: "appointments:createMyAppointment",
          args: {
            serviceId: who.serviceId,
            date: row.date,
            start: overlap,
            clientName: "Synthetic overlap",
          },
        };
        if (scenario === "undo-vs-booking") {
          const applied = await invoke(arrive);
          first = undo(who, applied.undo);
        }
      }
      const before = await raw(who),
        ops = round === 2 ? [second, first] : [first, second],
        raced = await race(ops),
        labels = raced.results.map(label),
        after = await raw(who),
        saved = rowOf(after, row._id);
      if (scenario === "duplicate-arrival")
        assert.deepEqual([...labels].sort(), ["already_applied", "changed"]);
      else if (
        [
          "different-arrival",
          "arrival-vs-window-cancel",
          "arrival-vs-normal-cancel",
          "arrival-vs-move",
        ].includes(scenario)
      ) {
        assert.equal(
          raced.results.filter((r) => r.status === "fulfilled").length,
          1,
          scenario + labels,
        );
        assert.ok(
          labels.some((l) =>
            ["APPOINTMENT_CONFLICT", "APPOINTMENT_NOT_CONFIRMED"].includes(l),
          ),
        );
        assert.equal(saved.version, 1);
      } else if (scenario === "arrival-vs-early-job")
        assert.equal(saved.status, "completed");
      else if (
        scenario === "end-job-vs-manual" ||
        scenario === "duplicate-end-job"
      )
        assert.equal(saved.version, 1);
      else if (scenario === "duplicate-claim")
        assert.equal(labels.filter((value) => value === true).length, 1);
      else if (scenario === "read-vs-claim") {
        assert.equal(after.notices[0].readStage, after.notices[0].stage);
        assert.deepEqual(after.appointments, before.appointments);
      } else if (scenario.includes("booking")) {
        assert.equal(raced.results[ops.indexOf(second)].status, "rejected");
        assert.equal(labels[ops.indexOf(second)], "SLOT_TAKEN");
        assert.equal(raced.results[ops.indexOf(first)].status, "fulfilled");
      }
      const winning = ops.find(
        (op) => op.args.operationId === saved.lastResultOperationId,
      );
      if (
        winning &&
        [
          "appointments:arriveMyAppointment",
          "appointments:cancelMyAppointmentInWindow",
        ].includes(winning.name)
      )
        verifyWindow(before, after, winning);
      else {
        unchangedRelations(before, after, row._id);
        const old = rowOf(before, row._id),
          clean = (value) => JSON.parse(JSON.stringify(value));
        if (scenario === "undo-vs-booking") {
          const op = ops.find(
            (op) => op.name === "appointments:undoMyAppointmentResult",
          );
          assert.deepEqual(
            saved,
            clean({
              ...old,
              status: "confirmed",
              resultAt: undefined,
              arrivedAt: undefined,
              holdsSlot: undefined,
              resultUndo: undefined,
              autoNoShowSuppressed: true,
              version: 2,
              lastResultOperationId: op.args.operationId,
              lastResultExpectedVersion: 1,
              lastResultValue: JSON.stringify([
                "undo-result",
                op.args.targetOperationId,
              ]),
            }),
          );
        } else if (saved.lastResultOperationId?.startsWith("auto_no_show:")) {
          assert.deepEqual(saved, {
            ...old,
            status: "no_show",
            version: 1,
            resultAt: saved.resultAt,
            lastResultOperationId: "auto_no_show:" + row._id + ":0",
            lastResultExpectedVersion: 0,
            lastResultValue: JSON.stringify(["auto-no-show"]),
            resultUndo: {
              operationId: "auto_no_show:" + row._id + ":0",
              version: 1,
              status: "confirmed",
              kind: "auto_no_show",
            },
          });
          assert.equal(after.notices.length, 1);
          assert.equal(after.notices[0].kind, "absence");
        } else if (winning?.name === "appointments:markMyAppointmentResult") {
          assert.deepEqual(saved, {
            ...old,
            status: "completed",
            version: 1,
            resultAt: saved.resultAt,
            lastResultOperationId: winning.args.operationId,
            lastResultExpectedVersion: 0,
            lastResultValue: JSON.stringify(["result", "completed"]),
            resultUndo: {
              operationId: winning.args.operationId,
              version: 1,
              status: "confirmed",
            },
          });
        } else if (saved.status === "cancelled")
          assert.deepEqual(saved, {
            ...old,
            status: "cancelled",
            version: 1,
            cancelledAt: saved.cancelledAt,
          });
        else if (scenario === "arrival-vs-move")
          assert.deepEqual(saved, {
            ...old,
            date,
            start,
            end: start + (old.end - old.start),
            version: 1,
            rescheduledAt: saved.rescheduledAt,
            rescheduledFromVersion: 0,
          });
        else if (scenario.includes("claim")) assert.deepEqual(saved, old);
      }
      if (scenario.includes("claim"))
        assert.deepEqual(after.appointments, before.appointments);
      report.scenarios.push({
        round,
        scenario: "attention-" + scenario,
        requests: 2,
        maxInFlight: raced.maxInFlight,
        observedResults: labels,
        winningOperation: saved.lastResultOperationId ?? null,
        fullDocumentsVerified: true,
        before,
        after,
      });
    }
  // Occupation races also cross public creation, a different moved appointment,
  // and blocking. Both confirmed and early-completed snapshots reserve time.
  for (let round = 1; round <= 3; round++)
    for (const scenario of [
      "public-booking",
      "overlap-move",
      "block",
      "auto-replay-vs-undo",
    ]) {
      const { who, row } = await seed(
        scenario === "auto-replay-vs-undo"
          ? { offset: -2400000, endOffset: -1000 }
          : {},
      );
      let first = cmd(who, row),
        second;
      if (scenario === "auto-replay-vs-undo") {
        await invoke(job(who, row));
        const saved = rowOf(await raw(who), row._id);
        first = undo(who, {
          appointmentId: row._id,
          version: 1,
          operationId: saved.resultUndo.operationId,
        });
        second = job(who, row);
      } else {
        await who.client.mutation("weeklySchedule:saveMyWeeklySchedule", {
          days: Array.from({ length: 7 }, (_, i) => ({
            dayOfWeek: i + 1,
            isOpen: true,
            start: "00:00",
            end: "23:59",
          })),
        });
        const overlap = Math.ceil((Date.now() + 60000) / 900000) * 900000;
        if (scenario === "public-booking") {
          const link = await who.client.mutation(
            "bookingLinks:setMyBookingLink",
            { enabled: true },
          );
          second = {
            who: { identity: null },
            name: "publicBooking:confirm",
            args: {
              slug: link.slug,
              serviceId: who.serviceId,
              date: row.date,
              start: overlap,
              clientName: "Synthetic public race",
              attemptKey: randomUUID(),
              expectedService: {
                name: "Synthetic 30",
                durationMinutes: 30,
                version: 0,
              },
            },
          };
        } else if (scenario === "overlap-move") {
          const moving = await who.client.mutation(
            "appointments:createMyAppointment",
            {
              serviceId: who.serviceId,
              date,
              start,
              clientName: "Synthetic moving overlap",
            },
          );
          second = {
            who,
            name: "appointments:rescheduleMyAppointment",
            args: {
              appointmentId: moving,
              expectedVersion: 0,
              date: row.date,
              start: overlap,
            },
          };
        } else {
          const local = (at) =>
            new Intl.DateTimeFormat("en-GB", {
              timeZone: "America/Montevideo",
              hour: "2-digit",
              minute: "2-digit",
              hourCycle: "h23",
            }).format(at);
          second = {
            who,
            name: "timeBlocks:changeMyTimeBlock",
            args: {
              expected: null,
              operationId: randomUUID(),
              value: {
                date: row.date,
                startTime: local(overlap),
                endTime: local(overlap + 900000),
                reason: "Synthetic block race",
              },
            },
          };
        }
      }
      const before = await raw(who),
        ops = round === 2 ? [second, first] : [first, second],
        raced = await race(ops),
        after = await raw(who),
        saved = rowOf(after, row._id),
        loser = raced.results[ops.indexOf(second)];
      assert.equal(raced.results[ops.indexOf(first)].status, "fulfilled");
      if (scenario === "public-booking")
        assert.deepEqual(loser.value, { ok: false, code: "SLOT_TAKEN" });
      else if (scenario !== "auto-replay-vs-undo")
        assert.match(
          String(loser.reason),
          scenario === "block"
            ? /TIME_BLOCK_APPOINTMENT_CONFLICT/
            : /SLOT_TAKEN/,
        );
      if (scenario !== "auto-replay-vs-undo")
        verifyWindow(before, after, first);
      else {
        const old = rowOf(before, row._id);
        assert.deepEqual(
          saved,
          JSON.parse(
            JSON.stringify({
              ...old,
              status: "confirmed",
              resultAt: undefined,
              resultUndo: undefined,
              version: 2,
              autoNoShowSuppressed: true,
              lastResultOperationId: first.args.operationId,
              lastResultExpectedVersion: 1,
              lastResultValue: JSON.stringify([
                "undo-result",
                first.args.targetOperationId,
              ]),
            }),
          ),
        );
        unchangedRelations(before, after, row._id);
      }
      report.scenarios.push({
        round,
        scenario: "attention-" + scenario,
        requests: 2,
        maxInFlight: raced.maxInFlight,
        observedResults: raced.results.map(label),
        fullDocumentsVerified: true,
        before,
        after,
      });
    }
  // Exercise BOTH serial orders, independently of scheduler/OCC observations.
  for (const kind of ["cancel", "move", "job", "claim", "read"])
    for (const order of ["arrival-first", "other-first"]) {
      const { who, row } = await seed(),
        arrival = cmd(who, row);
      await invoke(job(who, row, "runAppointmentReminder"));
      const notice = (await raw(who)).notices[0];
      const other =
        kind === "cancel"
          ? cmd(who, row, "cancel")
          : kind === "move"
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
            : kind === "job"
              ? job(who, row)
              : {
                  who,
                  name:
                    kind === "claim"
                      ? "appointments:claimMySystemReminder"
                      : "appointments:readMyAppointmentNotice",
                  args: {
                    noticeId: notice._id,
                    stage: notice.stage,
                    operationId: randomUUID(),
                  },
                };
      const results = [];
      for (const op of order === "arrival-first"
        ? [arrival, other]
        : [other, arrival]) {
        try {
          results.push(await invoke(op));
        } catch (error) {
          results.push(String(error));
        }
      }
      const after = await raw(who),
        saved = rowOf(after, row._id);
      assert.equal(saved.version, 1);
      assert.equal(
        saved.status,
        order === "other-first" && kind === "cancel"
          ? "cancelled"
          : order === "other-first" && kind === "move"
            ? "confirmed"
            : "completed",
      );
      assert.ok(after.notices.every((n) => !n.active));
      serial.push({
        scenario: "both-serial-orders",
        kind,
        order,
        passed: true,
        after,
      });
    }
  for (const kind of ["arrival", "cancel"])
    for (const delta of [
      -300001, -300000, -299999, 0, 299999, 300000, 300001,
    ]) {
      const { who, row } = await seed(),
        test = await who.client.mutation("engineFixtures:attentionBoundary", {
          appointmentId: row._id,
          delta,
          kind,
          operationId: randomUUID(),
        });
      if (Math.abs(delta) > 300000) {
        assert.equal(test.code, "ARRIVAL_WINDOW_CLOSED");
        assert.deepEqual(test.after, test.before);
      } else {
        assert.equal(test.response.outcome, "changed");
        assert.equal(
          kind === "arrival" ? test.after.arrivedAt : test.after.cancelledAt,
          test.now,
        );
      }
      serial.push({
        scenario: "inclusive-server-window-boundary",
        kind,
        delta,
        passed: true,
      });
    }
  for (const delta of [-1, 0, 1]) {
    const { who, row } = await seed({ offset: -2400000 });
    const test = await who.client.mutation("engineFixtures:attentionBoundary", {
      appointmentId: row._id,
      delta,
      kind: "absence",
      operationId: randomUUID(),
    });
    assert.equal(test.after.status, delta > 0 ? "confirmed" : "no_show");
    if (delta > 0) assert.deepEqual(test.after, test.before);
    else assert.equal(test.after.resultAt, test.now);
    serial.push({
      scenario: "automatic-end-server-boundary",
      delta,
      passed: true,
    });
  }
  // Phase collapse, stable no-ops, explicit reads, at-most-once claims and reload.
  for (const [delta, stage] of [
    [900001, -1],
    [900000, 0],
    [899999, 0],
    [600001, 0],
    [600000, 1],
    [599999, 1],
    [300001, 1],
    [300000, 2],
    [299999, 2],
    [1, 2],
    [0, -1],
    [-1, -1],
  ]) {
    const { who, row } = await seed(),
      test = await who.client.mutation("engineFixtures:attentionBoundary", {
        appointmentId: row._id,
        delta,
        kind: "reminder",
        operationId: randomUUID(),
      });
    const state = await raw(who);
    assert.equal(state.notices.length, stage < 0 ? 0 : 1);
    if (stage >= 0) {
      assert.equal(state.notices[0].stage, stage);
      await invoke(job(who, test.after, "runAppointmentReminder"));
      if (![600001, 300001].includes(delta))
        assert.deepEqual(await raw(who), state);
    }
    serial.push({
      scenario: "reminder-phase-server-boundary-late-open-no-burst",
      delta,
      stage,
      passed: true,
    });
  }
  {
    const { who, row } = await seed(),
      arrival = cmd(who, row),
      before = await raw(who),
      result = await invoke(arrival),
      applied = await raw(who);
    verifyWindow(before, applied, arrival);
    assert.equal((await invoke(arrival)).outcome, "already_applied");
    assert.deepEqual(await raw(who), applied);
    const reverse = undo(who, result.undo);
    await invoke(reverse);
    const restored = await raw(who);
    assert.equal(rowOf(restored, row._id).status, "confirmed");
    assert.equal(rowOf(restored, row._id).autoNoShowSuppressed, true);
    assert.equal(rowOf(restored, row._id).holdsSlot, undefined);
    await invoke(job(who, row));
    await invoke(job(who, row, "runAppointmentReminder"));
    assert.deepEqual(await raw(who), restored);
    const again = cmd(who, rowOf(restored, row._id));
    await invoke(again);
    const aba = await raw(who);
    await assert.rejects(invoke(arrival), /APPOINTMENT_CONFLICT/);
    await assert.rejects(invoke(reverse), /APPOINTMENT_CONFLICT/);
    await invoke(job(who, row));
    assert.deepEqual(await raw(who), aba);
    serial.push({
      scenario:
        "lost-response-exact-replay-arrival-undo-ABA-stale-jobs-full-snapshot",
      passed: true,
      after: aba,
    });
  }
  {
    const { who, row } = await seed({ offset: -2400000, endOffset: -1 });
    await invoke(job(who, row));
    const noShow = await raw(who),
      saved = rowOf(noShow, row._id),
      ticket = {
        appointmentId: row._id,
        version: saved.version,
        operationId: saved.resultUndo.operationId,
      };
    const reverse = undo(who, ticket);
    await invoke(reverse);
    const restored = await raw(who);
    await invoke(job(who, row));
    await invoke(job(who, rowOf(restored, row._id)));
    assert.deepEqual(await raw(who), restored);
    assert.equal(rowOf(restored, row._id).autoNoShowSuppressed, true);
    const manual = {
      who,
      name: "appointments:markMyAppointmentResult",
      args: {
        appointmentId: row._id,
        expectedVersion: 2,
        operationId: randomUUID(),
        result: "completed",
      },
    };
    await invoke(manual);
    const final = await raw(who);
    await invoke(job(who, row));
    assert.deepEqual(await raw(who), final);
    serial.push({
      scenario: "undo-autoabsence-suppresses-rerun-and-later-human-wins",
      passed: true,
      after: final,
    });
  }
  {
    const { who, row } = await seed({
      managed: false,
      offset: -2400000,
      endOffset: -1,
      schedule: true,
    });
    const before = await raw(who);
    await invoke(job(who, row));
    await invoke(job(who, row, "runAppointmentReminder"));
    assert.deepEqual(await raw(who), before);
    const foreign = await setup(),
      fresh = await seed();
    for (const name of [
      "appointments:arriveMyAppointment",
      "appointments:cancelMyAppointmentInWindow",
    ]) {
      const args = cmd(fresh.who, fresh.row).args;
      await assert.rejects(
        makeClient().mutation(name, args),
        /UNAUTHENTICATED/,
      );
      await assert.rejects(
        foreign.client.mutation(name, args),
        /APPOINTMENT_NOT_FOUND/,
      );
      await assert.rejects(
        fresh.who.client.mutation(name, { ...args, now: Date.now() }),
      );
    }
    await assert.rejects(
      makeClient().query("appointments:getMyAttentionCandidates", {
        anchor: Date.now(),
      }),
      /UNAUTHENTICATED/,
    );
    await assert.rejects(
      makeClient().query("appointments:listMyAppointmentNotices", {
        paginationOpts: { cursor: null, numItems: 20 },
      }),
      /UNAUTHENTICATED/,
    );
    serial.push({
      scenario: "legacy-untouched-and-private-authorization-no-client-clock",
      passed: true,
    });
  }
  {
    const who = await setup(),
      denseDate = await who.client.mutation("engineFixtures:attentionDense", {
        serviceId: who.serviceId,
        count: 251,
      });
    let cursor = null,
      count = 0,
      pages = 0;
    do {
      const page = await who.client.query(
        "appointments:listMyAppointmentNotices",
        { paginationOpts: { cursor, numItems: 37 } },
      );
      count += page.page.length;
      pages++;
      if (page.isDone) break;
      cursor = page.continueCursor;
      assert.ok(pages < 100);
    } while (true);
    assert.equal(count, 251);
    assert.equal(
      (
        await who.client.query("appointments:getMyAttentionCandidates", {
          anchor: Date.now(),
        })
      ).length,
      251,
    );
    serial.push({
      scenario: "dense-inbox-complete-pagination",
      count,
      pages,
      passed: true,
    });
    const held = await setup();
    await held.client.mutation("engineFixtures:attentionDense", {
      serviceId: held.serviceId,
      count: 1441,
      held: true,
    });
    await assert.rejects(
      held.client.query("appointments:listMyOccupyingAppointments", {
        date: denseDate,
      }),
      /DAY_CAPACITY_EXCEEDED/,
    );
    const excessive = await setup();
    await excessive.client.mutation("engineFixtures:attentionDense", {
      serviceId: excessive.serviceId,
      count: 1441,
    });
    await assert.rejects(
      excessive.client.query("appointments:getMyAttentionCandidates", {
        anchor: Date.now(),
      }),
      /DAY_CAPACITY_EXCEEDED/,
    );
    serial.push({
      scenario: "occupation-and-candidates-overflow-fail-closed",
      passed: true,
    });
  }
  {
    const { who, row } = await seed({
      offset: -1800000,
      endOffset: 2500,
      schedule: true,
    });
    const before = await raw(who);
    await restart();
    const deadline = Date.now() + 12000;
    let after;
    do {
      after = await raw(who);
      if (rowOf(after, row._id).status === "no_show") break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    } while (Date.now() < deadline);
    assert.equal(rowOf(after, row._id).status, "no_show");
    assert.equal(rowOf(after, row._id).version, 1);
    unchangedRelations(before, after, row._id);
    await invoke(job(who, row));
    assert.deepEqual(await raw(who), after);
    serial.push({
      scenario:
        "actual-scheduled-mutation-survives-engine-restart-no-page-open",
      passed: true,
      after,
    });
  }

  // Full reservation is retained across EVERY shared occupation consumer.
  {
    const { who, row } = await seed({ receiptKey: randomUUID() });
    const allDays = Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i + 1,
      isOpen: true,
      start: "00:00",
      end: "23:59",
    }));
    await who.client.mutation("weeklySchedule:saveMyWeeklySchedule", {
      days: allDays,
    });
    const link = await who.client.mutation("bookingLinks:setMyBookingLink", {
        enabled: true,
      }),
      anonymous = makeClient();
    const slot = Math.ceil((Date.now() + 60000) / 900000) * 900000;
    const receiptArgs = {
      slug: link.slug,
      attemptKey: randomUUID(),
      serviceId: who.serviceId,
      date: row.date,
      start: slot,
      clientName: "Synthetic public overlap",
      expectedService: {
        name: "Synthetic 30",
        durationMinutes: 30,
        version: 0,
      },
    };
    const before = await raw(who);
    await invoke(cmd(who, row));
    const held = await raw(who);
    assert.deepEqual(held.receipts, before.receipts);
    assert.ok(
      (
        await who.client.query("appointments:listMyOccupyingAppointments", {
          date: row.date,
        })
      ).some((r) => r._id === row._id),
    );
    assert.equal(
      (
        await who.client.query("appointments:listMyConfirmedAppointments", {
          date: row.date,
        })
      ).length,
      0,
    );
    const privateOptions = await who.client.action(
      "availability:getMyAvailability",
      { serviceId: who.serviceId, date: row.date },
    );
    assert.ok(
      privateOptions.slots.every(
        (s) => s.end <= row.start || s.start >= row.end,
      ),
    );
    const publicOptions = await anonymous.action(
      "publicBooking:getAvailability",
      { slug: link.slug, serviceId: who.serviceId, date: row.date },
    );
    assert.ok(
      publicOptions.slots.every(
        (s) => s.end <= row.start || s.start >= row.end,
      ),
    );
    assert.deepEqual(
      await anonymous.mutation("publicBooking:confirm", receiptArgs),
      { ok: false, code: "SLOT_TAKEN" },
    );
    const moving = await who.client.mutation(
      "appointments:createMyAppointment",
      {
        serviceId: who.serviceId,
        date,
        start,
        clientName: "Synthetic movable",
      },
    );
    await assert.rejects(
      who.client.mutation("appointments:rescheduleMyAppointment", {
        appointmentId: moving,
        expectedVersion: 0,
        date: row.date,
        start: slot,
      }),
      /SLOT_TAKEN/,
    );
    const clock = (at) =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Montevideo",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(at);
    await assert.rejects(
      who.client.mutation("timeBlocks:changeMyTimeBlock", {
        expected: null,
        operationId: randomUUID(),
        value: {
          date: row.date,
          startTime: clock(slot),
          endTime: clock(slot + 900000),
          reason: "Synthetic retained interval",
        },
      }),
      /TIME_BLOCK_APPOINTMENT_CONFLICT/,
    );
    assert.deepEqual(rowOf(await raw(who), row._id), rowOf(held, row._id));
    assert.deepEqual((await raw(who)).receipts, held.receipts);
    serial.push({
      scenario:
        "early-completed-retains-full-interval-private-public-moves-blocks-receipt",
      passed: true,
    });
  }
  // Moving rearms the new revision only; superseded thread commands stay inert.
  {
    const { who, row } = await seed();
    await invoke(job(who, row, "runAppointmentReminder"));
    const notice = (await raw(who)).notices[0];
    const args = {
      noticeId: notice._id,
      stage: notice.stage,
      operationId: randomUUID(),
    };
    assert.equal(
      await who.client.mutation("appointments:claimMySystemReminder", args),
      true,
    );
    const claimed = await raw(who);
    assert.equal(
      await makeClient(who.identity).mutation(
        "appointments:claimMySystemReminder",
        args,
      ),
      false,
    );
    assert.deepEqual(await raw(who), claimed);
    const stranger = await setup();
    await assert.rejects(
      stranger.client.mutation("appointments:readMyAppointmentNotice", args),
      /NOTICE_NOT_FOUND/,
    );
    await assert.rejects(
      makeClient().mutation("appointments:claimMySystemReminder", args),
      /UNAUTHENTICATED/,
    );
    await who.client.mutation("appointments:rescheduleMyAppointment", {
      appointmentId: row._id,
      expectedVersion: 0,
      date,
      start,
    });
    const moved = await raw(who);
    await invoke(job(who, row, "runAppointmentReminder"));
    await invoke(job(who, row));
    assert.equal(
      await who.client.mutation("appointments:claimMySystemReminder", args),
      false,
    );
    await who.client.mutation("appointments:readMyAppointmentNotice", args);
    const historicalRead = await raw(who);
    assert.deepEqual(historicalRead.appointments, moved.appointments);
    assert.deepEqual(historicalRead.receipts, moved.receipts);
    assert.deepEqual(historicalRead.notices, moved.notices.map(n=>({...n,readStage:n.stage})));
    serial.push({
      scenario:
        "claim-response-loss-reload-other-client-authorization-move-invalidates-notice-and-jobs",
      passed: true,
    });
  }
  {
    const { who, row } = await seed({ offset: 303000, schedule: true });
    await restart();
    const deadline = Date.now() + 12000;
    let after;
    do {
      after = await raw(who);
      if (after.notices[0]?.stage === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 150));
    } while (Date.now() < deadline);
    assert.equal(after.notices.length, 1);
    assert.equal(after.notices[0].stage, 2);
    assert.equal(rowOf(after, row._id).status, "confirmed");
    serial.push({
      scenario:
        "actual-reminder-stage-scheduled-after-engine-restart-single-thread",
      passed: true,
    });
  }
  report.appointmentAttention = {
    serialControls: serial,
    legacyBackfill: false,
    automaticOptInOnlyNewAppointments: true,
    serverClockBoundaries: true,
    systemClaimsAtMostOnce: true,
    scope:
      "real isolated Convex HTTP/SQLite; synthetic identities and fixtures; no OS permission or production data writes",
  };
}
