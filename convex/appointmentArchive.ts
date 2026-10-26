import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { checkVersion, requireMyAppointment } from "./lib/appointmentData";

// Visibility has its own monotonic revision. Booking versions, cancellation
// snapshots, public capabilities/receipts and R13 jobs are never rewritten.
export const setMyCalendarArchive = mutation({
  args: { appointmentId: v.id("appointments"), expectedVersion: v.number(), expectedArchiveVersion: v.number(), operationId: v.string(), archived: v.boolean() },
  returns: v.object({ outcome: v.union(v.literal("changed"), v.literal("already_applied"), v.literal("unchanged")), archived: v.boolean(), archiveVersion: v.number() }),
  handler: async (ctx, args) => {
    const { saved } = await requireMyAppointment(ctx, args.appointmentId);
    if (saved.status !== "cancelled") throw new ConvexError({ code: "APPOINTMENT_NOT_CANCELLED" });
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(args.operationId)) throw new ConvexError({ code: "INVALID_OPERATION" });
    checkVersion(saved.version ?? 0, args.expectedVersion);
    const revision = saved.calendarArchiveVersion ?? 0, archived = saved.calendarArchived === true, prior = saved.calendarArchiveCommand;
    if (prior?.operationId === args.operationId) {
      if (prior.expectedVersion !== args.expectedVersion || prior.expectedArchiveVersion !== args.expectedArchiveVersion || prior.archived !== args.archived) throw new ConvexError({ code: "COMMAND_CONFLICT" });
      return { outcome: "already_applied" as const, archived, archiveVersion: revision };
    }
    if (!Number.isSafeInteger(args.expectedArchiveVersion) || args.expectedArchiveVersion < 0 || args.expectedArchiveVersion >= Number.MAX_SAFE_INTEGER) throw new ConvexError({ code: "INVALID_VERSION" });
    if (revision !== args.expectedArchiveVersion) throw new ConvexError({ code: "APPOINTMENT_ARCHIVE_CONFLICT" });
    if (archived === args.archived) return { outcome: "unchanged" as const, archived, archiveVersion: revision };
    await ctx.db.patch("appointments", saved._id, {
      calendarArchived: args.archived ? true : undefined, calendarArchivedAt: args.archived ? Date.now() : undefined,
      calendarArchiveVersion: revision + 1,
      calendarArchiveCommand: { operationId: args.operationId, expectedVersion: args.expectedVersion, expectedArchiveVersion: args.expectedArchiveVersion, archived: args.archived },
    });
    return { outcome: "changed" as const, archived: args.archived, archiveVersion: revision + 1 };
  },
});
