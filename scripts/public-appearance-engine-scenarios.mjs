import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export const appearanceFixtureSource = `
export const appearanceSnapshot = internalQuery({ args: {}, returns: v.any(), handler: async ctx => {
  const business = await requireMyBusiness(ctx);
  const profile = await ctx.db.query("publicBookingProfiles").withIndex("by_businessId", q => q.eq("businessId",business._id)).unique();
  const storage = await ctx.db.system.query("_storage").take(1000);
  const protectedRows: Record<string,unknown> = {};
  for(const table of ["appointments","clients","services","weeklySchedules","specialDates","timeBlocks","publicBookingReceipts","privateBookingReceipts","emailConfirmations","publicBookingAccesses","publicRescheduleReceipts","appointmentNotices"] as const) {
    protectedRows[table] = (await ctx.db.query(table).take(1000)).filter(row=>!("businessId" in row)||row.businessId===business._id);
  }
  return {profile,storage,protectedRows,business};
}});
`;

// This module is run only by the existing real engine harness. No cloud data,
// app credentials, Clerk sessions, fixture app or browser is involved.
export async function appearanceScenarios({ setup, makeClient, race, report, restart, date, start }) {
  const anonymous = makeClient(), owner = await setup("Public appearance synthetic");
  const settings = { publicName: "Estudio", professionalName: "Ana", welcome: "Reserva tu visita.", address: "Calle sintética 1", phone: "+598 99 000 000", showPhone: false, showPhoto: false, theme: "blue", datePicker: "calendar" };
  const command = (extra = {}) => ({ settings, expectedVersion: 0, operationId: randomUUID(), removePhoto: false, ...extra });
  const save = (who, args) => who.client.action("publicAppearance:save", args);
  const snapshot = who => who.client.query("engineFixtures:appearanceSnapshot", {});
  const errorCode = async (promise, code) => { await assert.rejects(promise, error => error.data?.code === code); };
  const bytes = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==", "base64")).buffer;
  const bytes2 = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64")).buffer;
  const serial = [];
  assert.equal((await owner.client.query("publicAppearance:getMy", {})).version, 0);
  await errorCode(anonymous.query("publicAppearance:getMy", {}), "UNAUTHENTICATED");
  await errorCode(anonymous.action("publicAppearance:save", command()), "UNAUTHENTICATED");
  const outsider = await setup("Other appearance owner");
  const link = await owner.client.mutation("bookingLinks:setMyBookingLink", { enabled: true });
  await errorCode(anonymous.query("publicAppearance:listPreviewServices", { paginationOpts: { cursor: null, numItems: 30 } }), "UNAUTHENTICATED");
  const catalogueOwner = await setup("Dense preview catalogue"), catalogueLink = await catalogueOwner.client.mutation("bookingLinks:setMyBookingLink", { enabled: true });
  for (let index = 0; index < 32; index++) await catalogueOwner.client.mutation("services:createMyService", { name: `Catalogue ${index}`, durationMinutes: 30, operationId: randomUUID() });
  let cursor = null, publicCursor = null, catalogueCount = 0;
  do {
    const previewPage = await catalogueOwner.client.query("publicAppearance:listPreviewServices", { paginationOpts: { cursor, numItems: 30 } });
    const publicPage = await anonymous.query("publicBooking:listServices", { slug: catalogueLink.slug, paginationOpts: { cursor: publicCursor, numItems: 30 } });
    assert.deepEqual(previewPage.page, publicPage.page); assert.equal(previewPage.isDone, publicPage.isDone);
    catalogueCount += previewPage.page.length; cursor = previewPage.isDone ? null : previewPage.continueCursor; publicCursor = publicPage.continueCursor;
  } while (cursor);
  assert.equal(catalogueCount, 34);
  await catalogueOwner.client.mutation("bookingLinks:setMyBookingLink", { enabled: false });
  assert.equal((await catalogueOwner.client.query("publicAppearance:listPreviewServices", { paginationOpts: { cursor: null, numItems: 30 } })).page.length, 30);
  assert.equal((await anonymous.query("publicBooking:listServices", { slug: catalogueLink.slug, paginationOpts: { cursor: null, numItems: 30 } })).page.length, 0);
  serial.push({ group: "preview-public-catalogue-order-34-services-two-pages-private-disabled-link", passed: true });
  assert.equal(await anonymous.query("publicAppearance:getPublic", { slug: link.slug }), null);
  const before = await snapshot(owner), cmd = command();
  const first = await save(owner, cmd), afterFirst = await snapshot(owner);
  assert.equal(first.version, 1); assert.equal(first.changed, true);
  const visible = await anonymous.query("publicAppearance:getPublic", { slug: link.slug });
  assert.deepEqual(Object.keys(visible).sort(), ["photoUrl", "settings"]);
  assert.equal(visible.settings.phone, ""); assert.equal(visible.photoUrl, null);
  assert.deepEqual((await snapshot(owner)).protectedRows, before.protectedRows);
  assert.deepEqual((await snapshot(owner)).business, before.business);
  assert.equal((await outsider.client.query("publicAppearance:getMy", {})).version, 0);
  await assert.rejects(outsider.client.action("publicAppearance:save", { ...command(), businessId: owner.businessId }));
  const replay = await save(owner, cmd); assert.equal(replay.changed, false);
  assert.deepEqual((await snapshot(owner)).profile, afterFirst.profile);
  await errorCode(save(owner, { ...cmd, settings: { ...settings, welcome: "Different payload" } }), "COMMAND_CONFLICT");
  await errorCode(save(owner, command()), "PROFILE_CHANGED");
  serial.push({ group: "defaults-auth-owner-allowlist-exact-replay-payload-stale", passed: true });
  for (const bad of [{ phone: "javascript:alert(1)" }, { publicName: "x".repeat(101) }, { welcome: "x\u0000" }, { theme: "external-url" }, { datePicker: "unsafe" }, { showPhone: true, phone: "" }]) {
    await assert.rejects(save(owner, command({ expectedVersion: 1, settings: { ...settings, ...bad } })));
  }
  await errorCode(save(owner, command({ expectedVersion: 1, imageBytes: new Uint8Array(40).buffer })), "INVALID_PHOTO");
  await errorCode(save(owner, command({ expectedVersion: 1, imageBytes: new Uint8Array(2 * 1024 * 1024 + 1).buffer })), "INVALID_PHOTO");
  await errorCode(save(owner, command({ expectedVersion: 1, settings: { ...settings, showPhoto: true } })), "PHOTO_REQUIRED");
  assert.deepEqual((await snapshot(owner)).profile, afterFirst.profile);
  serial.push({ group: "validation-text-phone-themes-photo-size-signature-required", passed: true });
  const photoCommand = command({ expectedVersion: 1, settings: { ...settings, showPhoto: true, showPhone: true }, imageBytes: bytes });
  const withPhoto = await save(owner, photoCommand), photoSnapshot = await snapshot(owner);
  assert.equal(withPhoto.version, 2); assert.equal(withPhoto.hasPhoto, true);
  assert.deepEqual(new Uint8Array(await (await fetch(withPhoto.photoUrl)).arrayBuffer()), new Uint8Array(bytes));
  assert.equal((await anonymous.query("publicAppearance:getPublic", { slug: link.slug })).settings.phone, settings.phone);
  await save(owner, photoCommand); assert.deepEqual((await snapshot(owner)).profile, photoSnapshot.profile); assert.deepEqual((await snapshot(owner)).storage, photoSnapshot.storage);
  const hidden = await save(owner, command({ expectedVersion: 2, settings }));
  assert.equal(hidden.hasPhoto, true); assert.equal((await anonymous.query("publicAppearance:getPublic", { slug: link.slug })).photoUrl, null);
  const replacement = await save(owner, command({ expectedVersion: 3, settings: { ...settings, showPhoto: true }, imageBytes: bytes2 }));
  assert.notEqual(replacement.photoUrl, withPhoto.photoUrl);
  assert.equal((await fetch(withPhoto.photoUrl)).status, 404);
  const removed = await save(owner, command({ expectedVersion: 4, removePhoto: true }));
  assert.equal(removed.hasPhoto, false); assert.equal(removed.photoUrl, null); assert.equal((await fetch(replacement.photoUrl)).status, 404);
  await errorCode(save(owner, cmd), "PROFILE_CHANGED");
  serial.push({ group: "photo-byte-upload-replay-hidden-replace-delete-old-ABA", passed: true });
  await owner.client.mutation("bookingLinks:setMyBookingLink", { enabled: false });
  assert.equal(await anonymous.query("publicAppearance:getPublic", { slug: link.slug }), null);
  await owner.client.mutation("bookingLinks:setMyBookingLink", { enabled: true });
  // Booking and exact recovery continue to return the original DTO/receipt.
  const booking = { slug: link.slug, serviceId: owner.serviceId, date, start, clientName: "Synthetic appearance booking", email: "appearance@example.test", attemptKey: randomUUID() };
  const confirmation = await anonymous.mutation("publicBooking:confirm", booking);
  assert.equal(confirmation.ok, true);
  const booked = await snapshot(owner);
  await save(owner, command({ expectedVersion: 5, settings: { ...settings, publicName: "Nombre público nuevo" } }));
  assert.deepEqual(await anonymous.mutation("publicBooking:confirm", booking), confirmation);
  assert.deepEqual((await snapshot(owner)).protectedRows, booked.protectedRows);
  assert.deepEqual(Object.keys(await anonymous.query("publicBooking:getBusiness", { slug: link.slug })).sort(), ["name", "timeZone"]);
  serial.push({ group: "disabled-link-booking-original-receipt-protected-rows", passed: true });
  for (let round = 1; round <= 3; round++) {
    for (const kind of ["distinct-same-version", "exact-duplicate", "photo-same-version"]) {
      const who = await setup(`Appearance race ${kind} ${round}`), initial = await snapshot(who);
      const a = command(kind === "photo-same-version" ? { settings: { ...settings, showPhoto: true }, imageBytes: bytes } : {});
      const b = kind === "exact-duplicate" ? a : command(kind === "photo-same-version" ? { settings: { ...settings, showPhoto: true }, imageBytes: bytes2 } : { settings: { ...settings, publicName: "Second" } });
      const { results, maxInFlight } = await race([a, b].map(args => ({ who, name: "publicAppearance:save", kind: "action", args })));
      const success = results.filter(result => result.status === "fulfilled");
      assert.equal(success.length, kind === "exact-duplicate" ? 2 : 1);
      for (const result of results) if (result.status === "rejected") assert.equal(result.reason.data?.code, "PROFILE_CHANGED");
      const final = await snapshot(who);
      assert.equal(final.profile.version, 1); assert.equal(success.filter(result => result.value.changed).length, 1);
      assert.deepEqual(final.protectedRows, initial.protectedRows); assert.deepEqual(final.business, initial.business);
      assert.equal(final.storage.length - initial.storage.length, kind === "photo-same-version" ? 1 : 0);
      const winner = final.profile.lastOperationId === a.operationId ? a : b;
      assert.equal((await save(who, winner)).changed, false); assert.deepEqual((await snapshot(who)).profile, final.profile);
      report.scenarios.push({ feature: "public-appearance", round, scenario: kind, requests: 2, maxInFlight, successes: success.length, rejected: 2 - success.length, ordersObserved: results.map(result => result.status === "fulfilled" ? result.value.changed ? "saved" : "replay" : "PROFILE_CHANGED"), finalProfile: final.profile, protectedDocumentsUnchanged: true, remainingPhotoDelta: final.storage.length - initial.storage.length });
    }
  }
  const persisted = await snapshot(owner); await restart();
  assert.deepEqual(await snapshot(owner), persisted);
  assert.equal((await save(owner, command({ expectedVersion: 6, settings: { ...settings, publicName: "Después de reiniciar" } }))).version, 7);
  serial.push({ group: "SQLite-restart-profile-storage-preservation", passed: true });
  report.publicAppearance = { serial, raceCount: 9, participatingRequests: 18, rounds: 3, synthetic: true, realEngine: true, persistenceAfterRestart: true };
}
