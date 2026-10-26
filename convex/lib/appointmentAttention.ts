import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";

export const attentionJobArgs = {
  businessId: v.id("businesses"),
  appointmentId: v.id("appointments"),
  version: v.number(),
  start: v.number(),
  end: v.number(),
};
export type AttentionJob = {
  businessId: Id<"businesses">;
  appointmentId: Id<"appointments">;
  version: number;
  start: number;
  end: number;
};
export const reminderStage = (start: number, now: number) =>
  now < start - 15 * 60000 || now >= start
    ? -1
    : Math.min(2, Math.floor((now - (start - 15 * 60000)) / 300000));
export const inArrivalWindow = (start: number, now: number) =>
  now >= start - 300000 && now <= start + 300000;
export function noticeSnapshot(row: Doc<"appointments">) {
  const {
    _id,
    serviceId,
    serviceName,
    clientName,
    date,
    start,
    end,
    status,
    cancelledAt,
    resultAt,
    rescheduledAt,
  } = row;
  return {
    _id,
    serviceId,
    serviceName,
    clientName,
    date,
    start,
    end,
    status,
    version: row.version ?? 0,
    ...(cancelledAt === undefined ? {} : { cancelledAt }),
    ...(resultAt === undefined ? {} : { resultAt }),
    ...(rescheduledAt === undefined ? {} : { rescheduledAt }),
  };
}
export function jobMatches(
  row: Doc<"appointments"> | null,
  args: AttentionJob,
) {
  return (
    !!row &&
    row.businessId === args.businessId &&
    row.automationEnabled === true &&
    row.status === "confirmed" &&
    (row.version ?? 0) === args.version &&
    row.start === args.start &&
    row.end === args.end
  );
}
export async function invalidateNotice(
  ctx: MutationCtx,
  row: Doc<"appointments">,
) {
  const notice = await ctx.db
    .query("appointmentNotices")
    .withIndex("by_appointmentId_and_version", (q) =>
      q.eq("appointmentId", row._id).eq("version", row.version ?? 0),
    )
    .unique();
  if (notice?.active)
    await ctx.db.patch("appointmentNotices", notice._id, { active: false });
}
export async function scheduleAttention(
  ctx: MutationCtx,
  row: Doc<"appointments">,
): Promise<void> {
  if (row.automationEnabled !== true || row.status !== "confirmed") return;
  const args: AttentionJob = {
    businessId: row.businessId,
    appointmentId: row._id,
    version: row.version ?? 0,
    start: row.start,
    end: row.end,
  };
  const now = Date.now();
  // No historical backfill. On creation/move, collapse any already due stages.
  if (reminderStage(row.start, now) >= 0) await publishReminder(ctx, args);
  for (const minutes of [15, 10, 5]) {
    const at = row.start - minutes * 60000;
    if (at > now)
      await ctx.scheduler.runAt(
        at,
        internal.appointments.runAppointmentReminder,
        args,
      );
  }
  if (!row.autoNoShowSuppressed)
    await ctx.scheduler.runAt(
      row.end,
      internal.appointments.runAppointmentAbsence,
      args,
    );
}
export async function publishReminder(
  ctx: MutationCtx,
  args: AttentionJob,
): Promise<null> {
  const row = await ctx.db.get("appointments", args.appointmentId);
  if (!row || !jobMatches(row, args)) return null;
  const stage = reminderStage(args.start, Date.now());
  if (stage < 0) return null;
  const prior = await ctx.db
    .query("appointmentNotices")
    .withIndex("by_appointmentId_and_version", (q) =>
      q.eq("appointmentId", args.appointmentId).eq("version", args.version),
    )
    .unique();
  if (prior) {
    if (prior.active && stage > prior.stage)
      await ctx.db.patch("appointmentNotices", prior._id, {
        stage,
        updatedAt: Date.now(),
        snapshot: prior.snapshot ?? noticeSnapshot(row),
      });
  } else
    await ctx.db.insert("appointmentNotices", {
      businessId: args.businessId,
      appointmentId: args.appointmentId,
      version: args.version,
      start: args.start,
      kind: "reminder",
      stage,
      active: true,
      updatedAt: Date.now(),
      snapshot: noticeSnapshot(row),
    });
  return null;
}
export async function applyAutomaticAbsence(
  ctx: MutationCtx,
  args: AttentionJob,
): Promise<null> {
  const row = await ctx.db.get("appointments", args.appointmentId);
  if (
    !jobMatches(row, args) ||
    !row ||
    row.autoNoShowSuppressed ||
    Date.now() < row.end
  )
    return null;
  await invalidateNotice(ctx, row);
  const version = args.version + 1,
    operationId = "auto_no_show:" + row._id + ":" + args.version;
  await ctx.db.patch("appointments", row._id, {
    status: "no_show",
    resultAt: Date.now(),
    version,
    lastResultOperationId: operationId,
    lastResultExpectedVersion: args.version,
    lastResultValue: JSON.stringify(["auto-no-show"]),
    resultUndo: {
      operationId,
      version,
      status: "confirmed",
      kind: "auto_no_show",
      ...(row.resultAt === undefined ? {} : { resultAt: row.resultAt }),
    },
  });
  await ctx.db.insert("appointmentNotices", {
    businessId: row.businessId,
    appointmentId: row._id,
    version,
    start: row.start,
    kind: "absence",
    stage: 0,
    active: true,
    updatedAt: Date.now(),
    snapshot: noticeSnapshot({
      ...row,
      status: "no_show",
      resultAt: Date.now(),
      version,
    }),
  });
  return null;
}
