import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Temporal } from "@js-temporal/polyfill";

// Integration over the existing real Convex/SQLite engine. No mocked functions,
// real accounts, cloud data, or browser reservation writes.
export async function bookingCalendarScenarios({ setup, makeClient, report, date, restart }) {
  const who = await setup("Synthetic booking calendar"), other = await setup("Other calendar owner"), anon = makeClient(), groups = [];
  const month = date.slice(0, 7), first = Temporal.PlainDate.from(`${month}-01`);
  const link = await who.client.mutation("bookingLinks:setMyBookingLink", { enabled: true });
  const snapshot = () => who.client.query("engineFixtures:appearanceSnapshot", {});
  const privateDays = (serviceId = who.serviceId, selectedMonth = month) => who.client.action("availability:getMyAvailableDates", { serviceId, month: selectedMonth });
  const publicDays = (serviceId = who.serviceId, selectedMonth = month) => anon.action("publicBooking:getAvailableDates", { slug: link.slug, serviceId, month: selectedMonth });
  const slot = (atDate, time) => Date.parse(`${atDate}T${time}:00-03:00`);
  const initial = await snapshot();
  assert.equal((await who.client.query("publicAppearance:getMy", {})).settings.datePicker, "calendar");
  await assert.rejects(anon.action("availability:getMyAvailableDates", { serviceId: who.serviceId, month }), e => e.data?.code === "UNAUTHENTICATED");
  assert.equal(await other.client.action("availability:getMyAvailableDates", { serviceId: who.serviceId, month }), null);
  assert.equal(await publicDays(other.serviceId), null);
  assert.equal(await anon.action("publicBooking:getAvailableDates", { slug: "invalid", serviceId: who.serviceId, month }), null);
  for (const invalid of ["2026-13", "0000-01", "2026-1", "2026-01-01"]) await assert.rejects(privateDays(who.serviceId, invalid), e => e.data?.code === "INVALID_MONTH");
  groups.push({ group: "default-calendar-auth-ownership-active-link-service-and-month-validation", passed: true });

  const expected = Array.from({ length: first.daysInMonth }, (_, i) => first.add({ days: i })).filter(d => d.dayOfWeek === 1).map(String);
  assert.deepEqual(await privateDays(), expected); assert.deepEqual(await publicDays(), expected);
  const dayOptions = await anon.action("publicBooking:getAvailability", { slug: link.slug, serviceId: who.serviceId, date });
  assert.equal(dayOptions.slots.length, 11);
  assert.deepEqual(dayOptions.slots.slice(0, 4).map(s => s.startTime), ["09:00", "09:15", "09:30", "09:45"]);
  assert(dayOptions.slots.every(s => s.end - s.start === 30 * 60000));
  assert.deepEqual(await snapshot(), initial);
  groups.push({ group: "month-daily-public-preview-parity-15-minute-starts-duration-and-read-only-snapshot", passed: true, availableDates: expected });

  const made = [];
  for (let i = 0; i < 6; i++) made.push(await who.client.mutation("appointments:createMyAppointment", { serviceId: who.serviceId, date, start: slot(date, "09:00") + i * 30 * 60000, clientName: "Synthetic full calendar", email: "calendar@example.test", operationId: randomUUID() }));
  assert(!(await privateDays()).includes(date)); assert(!(await publicDays()).includes(date));
  await who.client.mutation("appointments:cancelMyAppointment", { appointmentId: made[2].appointmentId, expectedVersion: 0 });
  assert((await privateDays()).includes(date)); assert((await publicDays()).includes(date));
  assert(!(await privateDays(who.secondServiceId)).includes(date));
  assert(!(await publicDays(who.secondServiceId)).includes(date));
  groups.push({ group: "full-day-unavailable-cancelled-slot-released-30-minute-gap-rejects-46-minute-service", passed: true });

  const blockedDate = Temporal.PlainDate.from(date).add({ days: 7 }).toString();
  const block = await who.client.mutation("timeBlocks:changeMyTimeBlock", { expected: null, value: { date: blockedDate, startTime: "09:00", endTime: "12:00", reason: "Synthetic calendar block" }, operationId: randomUUID() });
  assert(!(await publicDays()).includes(blockedDate));
  await who.client.mutation("timeBlocks:changeMyTimeBlock", { expected: { id: block.block._id, version: block.block.version }, value: null, operationId: randomUUID() });
  assert((await publicDays()).includes(blockedDate));
  const specialDate = Temporal.PlainDate.from(date).add({ days: 1 }).toString();
  await who.client.mutation("specialDates:changeMySpecialDate", { date: specialDate, expected: null, value: { isOpen: true, start: "09:00", end: "09:35" }, operationId: randomUUID() });
  assert((await publicDays()).includes(specialDate)); assert(!(await publicDays(who.secondServiceId)).includes(specialDate));
  const closed = await who.client.mutation("specialDates:changeMySpecialDate", { date: blockedDate, expected: null, value: { isOpen: false, start: null, end: null }, operationId: randomUUID() });
  assert(!(await publicDays()).includes(blockedDate));
  await who.client.mutation("specialDates:changeMySpecialDate", { date: blockedDate, expected: { id: closed.configuration._id, version: closed.configuration.version }, value: null, operationId: randomUUID() });
  assert((await publicDays()).includes(blockedDate));
  groups.push({ group: "active-block-remove-special-open-closed-and-inactive-tombstone", passed: true });

  const booking = { slug: link.slug, serviceId: who.serviceId, date, start: slot(date, "10:00"), clientName: "Synthetic public calendar", email: "public-calendar@example.test", attemptKey: randomUUID() };
  const receipt = await anon.mutation("publicBooking:confirm", booking); assert(receipt.ok);
  const frozen = await snapshot(); await publicDays(); await privateDays();
  assert.deepEqual(await snapshot(), frozen); assert.deepEqual(await anon.mutation("publicBooking:confirm", booking), receipt);
  await who.client.mutation("bookingLinks:setMyBookingLink", { enabled: false });
  assert.equal(await publicDays(), null); assert((await privateDays()).includes(specialDate));
  groups.push({ group: "original-receipt-client-documents-and-private-preview-with-public-link-disabled", passed: true });

  const allOpen = Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i + 1, isOpen: true, start: "09:00", end: "12:00" }));
  await who.client.mutation("weeklySchedule:saveMyWeeklySchedule", { days: allOpen });
  assert.equal((await privateDays(who.serviceId, "2028-02")).length, 29);
  assert.deepEqual(await privateDays(who.serviceId, "2000-02"), []);
  const current = new Date().toISOString().slice(0, 7), daysNow = await privateDays(who.serviceId, current);
  const today = Temporal.Now.zonedDateTimeISO("America/Montevideo").toPlainDate().toString();
  assert(daysNow.every(day => day >= today));
  const durable = await snapshot(), durableDays = await privateDays(); await restart();
  assert.deepEqual(await snapshot(), durable); assert.deepEqual(await privateDays(), durableDays);
  groups.push({ group: "bounded-leap-month-past-dates-server-time-and-SQLite-restart", passed: true });
  report.bookingCalendar = { serialGroups: groups, realEngine: true, synthetic: true, races: 0, cloudWrites: 0 };
}
