import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Called ONLY by the isolated engine harness; no environment or cloud access.
export async function publicBookingScenarios({ setup, date, start, makeClient, race, history, report }) {
  const minute = 60_000;
  const anonymous = { identity: undefined };
  const anon = makeClient();
  const snapshot = (who) => who.client.query("engineFixtures:snapshot", { date });
  async function enable(who) {
    const link = await who.client.mutation("bookingLinks:setMyBookingLink", { enabled: true });
    who.slug = link.slug;
    return who;
  }
  const publicOp = (business, extra = {}) => ({ who: anonymous, name: "publicBooking:confirm", args: {
    slug: business.slug, serviceId: business.serviceId, date, start, clientName: "Synthetic public client", attemptKey: randomUUID(), ...extra,
  } });
  const privateOp = (who, offset = 0) => ({ who, name: "appointments:createMyAppointment", args: {
    serviceId: who.serviceId, date, start: start + offset, clientName: "Synthetic private client",
  } });
  const moveOp = (who, appointmentId) => ({ who, name: "appointments:rescheduleMyAppointment", args: {
    appointmentId, expectedVersion: 0, date, start: start + 90 * minute,
  } });
  const success = (op, r) => r.status === "fulfilled" && (op.name !== "publicBooking:confirm" || r.value.ok);
  const outcome = (op, r) => r.status === "rejected" ? String(r.reason).match(/SLOT_TAKEN|APPOINTMENT_CONFLICT/)?.[0] ?? "unexpected rejection"
    : op.name === "publicBooking:confirm" ? r.value.ok ? "public_confirmed" : r.value.code
      : typeof r.value === "string" ? "private_created" : r.value.outcome ?? (r.value.enabled ? "enabled" : "disabled");
  function noOverlaps(rows) {
    const active = rows.filter((r) => r.status === "confirmed").sort((a, b) => a.start - b.start);
    for (let i = 1; i < active.length; i++) assert.ok(active[i - 1].end <= active[i].start, "Confirmed overlap after public race");
  }
  const scenarios = ["public-same-interval", "public-partial-overlap", "public-different-services", "public-adjacent", "public-independent-businesses",
    "public-vs-private", "public-vs-move-target", "public-vs-cancel", "public-vs-move-origin", "public-freed-cancel", "public-freed-move",
    "public-vs-disable", "public-double-send", "public-nonce-conflict", "public-rate-rejections", "public-rate-duplicate"];
  for (let round = 1; round <= 3; round++) {
    for (const scenario of scenarios) {
      const a = await enable(await setup(`Synthetic public ${scenario} ${round}`));
      const b = scenario === "public-independent-businesses" ? await enable(await setup(`Independent ${round}`)) : a;
      let original, originalBefore;
      if (["public-vs-cancel", "public-vs-move-origin", "public-freed-cancel", "public-freed-move", "public-vs-move-target"].includes(scenario)) {
        original = await a.client.mutation("appointments:createMyAppointment", privateOp(a).args);
        if (scenario === "public-freed-cancel") await a.client.mutation("appointments:cancelMyAppointment", { appointmentId: original, expectedVersion: 0 });
        if (scenario === "public-freed-move") await a.client.mutation("appointments:rescheduleMyAppointment", moveOp(a, original).args);
        originalBefore = (await snapshot(a)).appointments.find((r) => r._id === original);
      }
      const seed = publicOp(a);
      let operations = [seed, publicOp(b)];
      if (scenario === "public-partial-overlap") operations[1] = publicOp(a, { serviceId: a.secondServiceId, start: start + 15 * minute });
      if (scenario === "public-different-services") operations[1] = publicOp(a, { serviceId: a.secondServiceId });
      if (scenario === "public-adjacent") operations[1] = publicOp(a, { start: start + 30 * minute });
      if (scenario === "public-vs-private") operations[1] = privateOp(a);
      if (scenario === "public-vs-move-target") operations = [publicOp(a, { start: start + 90 * minute }), moveOp(a, original)];
      if (scenario === "public-vs-cancel") operations[1] = { who: a, name: "appointments:cancelMyAppointment", args: { appointmentId: original, expectedVersion: 0 } };
      if (scenario === "public-vs-move-origin") operations[1] = moveOp(a, original);
      if (scenario === "public-vs-disable") operations[1] = { who: a, name: "bookingLinks:setMyBookingLink", args: { enabled: false } };
      if (scenario === "public-double-send" || scenario === "public-rate-duplicate") operations = [seed, seed];
      if (scenario === "public-nonce-conflict") operations = [seed, { ...seed, args: { ...seed.args, start: start + 30 * minute } }];
      let quotaBegan;
      if (scenario.startsWith("public-rate-")) {
        quotaBegan = Date.now();
        for (let i = 0; i < 9; i++) assert.deepEqual(await anon.mutation("publicBooking:confirm", publicOp(a, { clientName: "" }).args), { ok: false, code: "INVALID_CLIENT_NAME" });
        if (scenario === "public-rate-rejections") operations = Array.from({ length: 4 }, () => publicOp(a, { clientName: "" }));
      }
      if (round === 2) operations.reverse();
      const began = Date.now();
      const { results, maxInFlight } = await race(operations);
      const ended = Date.now();
      const states = b === a ? [await snapshot(a)] : [await snapshot(a), await snapshot(b)];
      const rows = states.flatMap((s) => s.appointments);
      const receipts = states.flatMap((s) => s.receipts);
      const outcomes = operations.map((op, i) => outcome(op, results[i]));
      assert.ok(!outcomes.includes("unexpected rejection"), JSON.stringify(outcomes));
      if (quotaBegan) assert.ok(ended - quotaBegan < 6000, "Rate scenario crossed a refill; repeat with bounded transport time");
      const accepted = operations.filter((op, i) => op.name === "publicBooking:confirm" && success(op, results[i]));
      const uniqueAccepted = new Map(accepted.map((op) => [op.args.attemptKey, op]));
      assert.equal(receipts.length, uniqueAccepted.size);
      assert.equal(rows.length, (original ? 1 : 0) + uniqueAccepted.size + operations.filter((op, i) => op.name === "appointments:createMyAppointment" && success(op, results[i])).length);
      for (const state of states) {
        noOverlaps(state.appointments);
        assert.ok(state.appointments.every((r) => r.businessId === state.business._id));
        for (const receipt of state.receipts) {
          const row = state.appointments.find((r) => r._id === receipt.appointmentId);
          const operation = uniqueAccepted.get(receipt.attemptKey);
          assert.ok(row && operation);
          assert.equal(receipt.businessId, state.business._id);
          assert.equal(row.serviceId, operation.args.serviceId);
          for (const field of ["serviceId", "date", "start", "end", "clientName", "serviceName"]) assert.equal(row[field], receipt[field]);
          assert.equal(row.end - row.start, (row.serviceId === a.secondServiceId ? 46 : 30) * minute);
          assert.equal(row.status, "confirmed"); assert.equal(row.version, undefined);
          assert.ok(row._creationTime >= began && row._creationTime <= ended);
        }
      }
      if (original) {
        const final = rows.find((r) => r._id === original);
        assert.ok(final);
        for (const field of ["_id", "businessId", "serviceId", "serviceName", "clientName", "_creationTime"]) assert.equal(final[field], originalBefore[field]);
        const transition = operations.findIndex((op) => op.name === "appointments:rescheduleMyAppointment" || op.name === "appointments:cancelMyAppointment");
        if (transition === -1 || !success(operations[transition], results[transition])) assert.deepEqual(final, originalBefore);
        else if (operations[transition].name === "appointments:rescheduleMyAppointment") {
          assert.equal(final.start, start + 90 * minute); assert.equal(final.end, final.start + 30 * minute);
          assert.equal(final.version, 1); assert.equal(final.rescheduledFromVersion, 0);
          assert.ok(final.rescheduledAt >= began && final.rescheduledAt <= ended);
        } else {
          assert.equal(final.status, "cancelled"); assert.equal(final.version, 1);
          assert.ok(final.cancelledAt >= began && final.cancelledAt <= ended);
          assert.equal(final.start, originalBefore.start); assert.equal(final.end, originalBefore.end);
        }
      }
      const successes = operations.filter((op, i) => success(op, results[i])).length;
      if (["public-adjacent", "public-independent-businesses", "public-double-send"].includes(scenario)) assert.equal(successes, 2);
      else if (["public-vs-cancel", "public-vs-move-origin", "public-vs-disable"].includes(scenario)) {
        assert.ok(successes === 1 || successes === 2);
        const publicResult = outcomes.find((o) => o === "public_confirmed" || o === "SLOT_TAKEN" || o === "UNAVAILABLE");
        assert.ok(publicResult);
        assert.equal(receipts.length, publicResult === "public_confirmed" ? 1 : 0);
      } else if (scenario === "public-rate-rejections") {
        assert.equal(outcomes.filter((o) => o === "INVALID_CLIENT_NAME").length, 1);
        assert.equal(outcomes.filter((o) => o === "RATE_LIMITED").length, 3);
        assert.deepEqual(rows, []);
        // The public quota never applies to a private legitimate creation.
        await a.client.mutation("appointments:createMyAppointment", privateOp(a).args);
      } else assert.equal(successes, 1);
      if (scenario === "public-vs-disable") {
        assert.equal((await snapshot(a)).business.publicBookingEnabled, false);
        assert.equal(await anon.query("publicBooking:getBusiness", { slug: a.slug }), null);
        assert.deepEqual(await anon.mutation("publicBooking:confirm", seed.args), { ok: false, code: "UNAVAILABLE" });
      } else if (!scenario.startsWith("public-rate-")) {
        for (const op of uniqueAccepted.values()) {
          const beforeRetry = await snapshot(a);
          const response = await anon.mutation("publicBooking:confirm", op.args);
          assert.equal(response.ok, true);
          assert.deepEqual(await snapshot(a), beforeRetry);
        }
      }
      for (const who of b === a ? [a] : [a, b]) {
        const current = await snapshot(who);
        const listed = await history(who);
        assert.deepEqual(listed.map((r) => r._id).sort(), current.appointments.map((r) => r._id).sort());
        const preview = await anon.action("publicBooking:getAvailability", { slug: who.slug, serviceId: who.serviceId, date });
        if (preview) for (const candidate of [start, start + 90 * minute]) {
          assert.equal(preview.slots.some((s) => s.start === candidate), !current.appointments.some((r) => r.status === "confirmed" && candidate < r.end && r.start < candidate + 30 * minute));
        }
      }
      const finalRows = (await snapshot(a)).appointments.length + (b === a ? 0 : (await snapshot(b)).appointments.length);
      report.scenarios.push({ round, scenario, requests: operations.length, maxInFlight, successes, observedResults: outcomes,
        operationOrder: operations.map((op) => op.name), finalDocuments: finalRows, finalReceipts: receipts.length,
        ...(scenario === "public-rate-rejections" ? { privateCreationAfterQuota: true, documentsImmediatelyAfterRace: rows.length } : {}),
        finalRelationsVerified: true, unchangedLosers: true, noOverlaps: true });
    }
    // Different owners contend for exactly the same canonical slug.
    const a = await setup(`Synthetic collision ${round}`), b = await setup(`Synthetic collision ${round}`);
    const { results, maxInFlight } = await race([a, b].map((who) => ({ who, name: "bookingLinks:setMyBookingLink", args: { enabled: true } })));
    assert.ok(results.every((r) => r.status === "fulfilled"));
    assert.equal(new Set(results.map((r) => r.value.slug)).size, 2);
    for (const who of [a, b]) {
      const state = await snapshot(who);
      assert.equal(state.business.ownerId, who.identity.subject);
      assert.equal(state.business.publicBookingEnabled, true);
      assert.equal((await who.client.query("bookingLinks:getMyBookingLink", {})).slug, state.business.publicBookingSlug);
    }
    report.scenarios.push({ round, scenario: "public-link-uniqueness", requests: 2, maxInFlight, successes: 2,
      observedResults: results.map((r) => r.value.slug === `synthetic-collision-${round}` ? "base" : "suffix-2"),
      observedSlugs: results.map((r) => r.value.slug), finalDocuments: 0, uniqueOwnedSlugs: true });
  }
  // Real transport contract checks, separate from the in-memory DTO assertions.
  const privacy = await enable(await setup("Synthetic public privacy"));
  const privateId = await privacy.client.mutation("appointments:createMyAppointment", privateOp(privacy).args);
  const businessDTO = await anon.query("publicBooking:getBusiness", { slug: privacy.slug });
  assert.deepEqual(Object.keys(businessDTO).sort(), ["name", "timeZone"]);
  const serviceDTO = await anon.query("publicBooking:listServices", { slug: privacy.slug, paginationOpts: { numItems: 20, cursor: null } });
  for (const service of serviceDTO.page) assert.deepEqual(Object.keys(service).sort(), ["durationMinutes", "id", "name", "version"]);
  const availabilityDTO = await anon.action("publicBooking:getAvailability", { slug: privacy.slug, serviceId: privacy.serviceId, date });
  assert.deepEqual(Object.keys(availabilityDTO).sort(), ["service", "slots"]);
  assert.ok(!availabilityDTO.slots.some((s) => s.start === start));
  assert.ok(!JSON.stringify({ businessDTO, serviceDTO, availabilityDTO }).includes(privateId));
  await assert.rejects(anon.query("bookingLinks:getMyBookingLink", {}), /UNAUTHENTICATED/);
  await assert.rejects(anon.mutation("bookingLinks:setMyBookingLink", { enabled: false }), /UNAUTHENTICATED/);
  const retry = await enable(await setup("Synthetic retry after refill"));
  const retryArgs = publicOp(retry).args;
  const firstReceipt = await anon.mutation("publicBooking:confirm", retryArgs);
  for (let i = 0; i < 9; i++) assert.deepEqual(await anon.mutation("publicBooking:confirm", retryArgs), firstReceipt);
  const limited = await anon.mutation("publicBooking:confirm", retryArgs);
  assert.equal(limited.code, "RATE_LIMITED");
  const beforeRefill = await snapshot(retry);
  await new Promise((resolve) => setTimeout(resolve, Math.ceil(limited.retryAfter) + 50));
  assert.deepEqual(await anon.mutation("publicBooking:confirm", retryArgs), firstReceipt);
  assert.deepEqual(await snapshot(retry), beforeRefill);
  // Explicit serial controls complement the orders actually observed in races.
  await assert.rejects(retry.client.mutation("appointments:createMyAppointment", privateOp(retry).args), /SLOT_TAKEN/);
  assert.deepEqual(await snapshot(retry), beforeRefill);
  await retry.client.mutation("bookingLinks:setMyBookingLink", { enabled: false });
  assert.deepEqual(await anon.mutation("publicBooking:confirm", retryArgs), { ok: false, code: "UNAVAILABLE" });
  const disabled = await snapshot(retry);
  assert.deepEqual(disabled.appointments, beforeRefill.appointments);
  assert.deepEqual(disabled.receipts, beforeRefill.receipts);
  report.publicPrivacyTransport = { allowlistedDTOs: true, noPrivateAppointmentId: true, anonymousManagementRejected: true };
  report.publicReplayAfterRealRefill = { sameReceipt: true, unchangedDocuments: true };
  report.publicSerialControls = { publicThenPrivateConflict: true, publicThenDisablePreservesBooking: true, disabledReplayRejected: true };
  report.publicBooking = { rounds: 3, scenariosPerRound: scenarios.length + 1,
    raceRequests: report.scenarios.filter((s) => s.scenario.startsWith("public-")).reduce((sum, s) => sum + s.requests, 0),
    ratePolicy: "10-token capacity per server-derived business ID, refill one per 6000ms; rejected attempts and replays consume tokens",
    atomicReceipts: true, anonymousDTOAllowlist: true, noAppointmentLookupById: true };
}
