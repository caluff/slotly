import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";

export const recoveryFixtureSource = `
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { TableNames } from "./_generated/dataModel";
const tables: TableNames[] = ["businesses","services","weeklySchedules","specialDates","timeBlocks","appointments","clients","clientCreationReceipts","privateBookingReceipts","publicBookingReceipts","publicBookingAccesses","publicRescheduleReceipts","appointmentNotices","emailConfirmations","publicBookingProfiles","recoveryCommands"];
export const snapshot = internalQuery({args:{},returns:v.any(),handler:async ctx=>{
 const result: Record<string,unknown> = {};
 for(const table of tables){const rows=await ctx.db.query(table).take(501);if(rows.length>500)throw Error("Synthetic snapshot bound");result[table]=rows.sort((a,b)=>a._id.localeCompare(b._id));}
 return {tables:result,files:await ctx.db.system.query("_storage").take(501),jobs:await ctx.db.system.query("_scheduled_functions").take(501)};
}});
export const storeAsset = internalAction({args:{},returns:v.id("_storage"),handler:async ctx=>ctx.storage.store(new Blob(["Slotly synthetic recovery asset"],{type:"text/plain"}))});
export const readAsset = internalAction({args:{id:v.id("_storage")},returns:v.string(),handler:async(ctx,{id})=>{const blob=await ctx.storage.get(id);if(!blob)throw Error("Restored asset missing");return blob.text();}});
export const suppressAbsence = internalMutation({args:{id:v.id("appointments")},returns:v.null(),handler:async(ctx,{id})=>{await ctx.db.patch("appointments",id,{autoNoShowSuppressed:true});return null;}});
`;

export async function backupRestoreScenarios({ setup, makeClient, race, date, start, report, workspace, command, freshDatabase, restart }) {
  const owner = await setup("Synthetic snapshot recovery");
  const operationId = randomUUID();
  const booked = await owner.client.mutation("appointments:createMyAppointment", {
    serviceId: owner.serviceId, date, start, clientName: "Synthetic recovery contact",
    email: "restore@example.test", operationId,
  });
  const legacyId = await owner.client.mutation("engineFixtures:attentionSeed", { serviceId: owner.serviceId, managed: false, start: start + 3600000 });
  const pastId = await owner.client.mutation("engineFixtures:attentionSeed", { serviceId: owner.serviceId, managed: true, offset: -3600000, endOffset: -1800000 });
  const assetId = await owner.client.action("recoveryFixtures:storeAsset", {});
  const read = () => owner.client.query("recoveryFixtures:snapshot", {});
  const before = await read();
  assert.equal(before.jobs.length, 4);
  const zip = path.join(workspace, "synthetic-snapshot.zip");
  await command(["export", "--include-file-storage", "--path", zip]);
  await freshDatabase();
  const empty = await read();
  assert(Object.values(empty.tables).every(rows => rows.length === 0));
  assert.equal(empty.files.length, 0);
  await command(["import", zip]); // Fresh empty target: no replace or delete flags.
  const restored = await read();
  assert.deepEqual(restored.tables, before.tables, "All documents, IDs, historical snapshots and receipts survive the ZIP round trip");
  assert.deepEqual(restored.files, before.files, "Storage metadata and IDs survive");
  assert.equal(await owner.client.action("recoveryFixtures:readAsset", { id: assetId }), "Slotly synthetic recovery asset");
  assert.equal(restored.jobs.length, 0, "Snapshots do not include scheduled functions");
  const row = restored.tables.appointments.find(row => row._id === booked.appointmentId);
  assert(row);
  const context = saved => ({ appointmentId: saved._id, version: saved.version ?? 0, start: saved.start, end: saved.end });
  const appointments = [row, ...restored.tables.appointments.filter(row => [legacyId, pastId].includes(row._id))].map(context);
  const args = { operationId: randomUUID(), appointments, dryRun: true };
  await assert.rejects(makeClient().mutation("recovery:rearmAppointmentJobs", args));
  assert.deepEqual(await owner.client.mutation("recovery:rearmAppointmentJobs", args), { planned: 1, scheduled: 0, replayed: 0, skipped: 2 });
  assert.deepEqual(await read(), restored, "Planning is read-only, including jobs");
  const commandArgs = { ...args, dryRun: false };
  const concurrent = await race([1, 2].map(() => ({ who: owner, name: "recovery:rearmAppointmentJobs", args: commandArgs })));
  assert(concurrent.results.every(result => result.status === "fulfilled"));
  assert.deepEqual(concurrent.results.map(result => result.value.scheduled).sort(), [0, 1]);
  assert.deepEqual(concurrent.results.map(result => result.value.replayed).sort(), [0, 1]);
  const rearmed = await read();
  assert.equal(rearmed.jobs.length, 4);
  assert.deepEqual(await owner.client.mutation("recovery:rearmAppointmentJobs", { ...args, dryRun: false }), { planned: 0, scheduled: 0, replayed: 1, skipped: 2 });
  assert.deepEqual(await read(), rearmed, "Exact replay schedules nothing and changes no timestamps");
  await assert.rejects(owner.client.mutation("recovery:rearmAppointmentJobs", { ...args, dryRun: false, appointments: [{ ...appointments[0], start: row.start + 60000 }] }), /RECOVERY_CONTEXT_CHANGED/);
  assert.deepEqual(await read(), rearmed);
  await assert.rejects(owner.client.mutation("recovery:rearmAppointmentJobs", { ...commandArgs, operationId: randomUUID(), appointments: [appointments[0], { ...appointments[1], version: -1 }] }), /RECOVERY_CONTEXT_CHANGED/);
  assert.deepEqual(await read(), rearmed, "A later context conflict rolls back jobs and receipts for the whole batch");
  await restart();
  const final = await read();
  assert.deepEqual(final.tables, rearmed.tables);
  assert.equal(final.jobs.length, 4);
  const availability = await owner.client.action("availability:getMyAvailability", { serviceId: owner.serviceId, date });
  assert(!availability.slots.some(slot => slot.start === start));
  assert.equal(await makeClient().query("systemHealth:ready", {}), null);
  const suppressedId = await owner.client.mutation("engineFixtures:attentionSeed", { serviceId: owner.serviceId, managed: true, start: start + 5 * 3600000 });
  await owner.client.mutation("recoveryFixtures:suppressAbsence", { id: suppressedId });
  const suppressedBefore = await read();
  const suppressed = suppressedBefore.tables.appointments.find(saved => saved._id === suppressedId);
  assert.deepEqual(await owner.client.mutation("recovery:rearmAppointmentJobs", { operationId: randomUUID(), dryRun: false, appointments: [context(suppressed)] }), { planned: 1, scheduled: 1, replayed: 0, skipped: 0 });
  const suppressedAfter = await read();
  assert.equal(suppressedAfter.jobs.length - suppressedBefore.jobs.length, 3, "Suppression preserves reminders but never rearms absence");
  assert.deepEqual(suppressedAfter.tables.appointments, suppressedBefore.tables.appointments);
  const fingerprint = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
  report.backupRestore = {
    environment: "owned synthetic loopback, fresh SQLite and storage, official CLI ZIP export/import",
    tableCount: Object.keys(before.tables).length,
    documents: Object.values(before.tables).reduce((count, rows) => count + rows.length, 0),
    files: before.files.length,
    beforeHash: fingerprint(before.tables), restoredHash: fingerprint(restored.tables),
    storageHash: fingerprint(restored.files), assetContentsVerified: true,
    jobsBefore: 4, jobsImmediatelyAfterImport: 0, jobsAfterExplicitRecovery: 4,
    exactReplayUnchanged: true, dryRunUnchanged: true, anonymousRecoveryRejected: true,
    independentHttpRequests: 2, maxInFlight: concurrent.maxInFlight, duplicateConcurrentSchedulePrevented: true, conflictingBatchRolledBack: true,
    staleContextRejected: true, legacyAndPastSkipped: 2, restartPersisted: true,
    occupiedIntervalPreserved: true, cloudWrites: 0, realEmails: 0,
    suppressedAbsencePreserved: true, suppressedReminderJobs: 3,
    limitations: "Synthetic recovery; not a restore of a live cloud backup or an OS notification test. Configuration and pending jobs are not restored by the ZIP.",
  };
}
