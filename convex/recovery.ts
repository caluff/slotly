import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { scheduleAttention } from "./lib/appointmentAttention";

// Operator-only, never called from UI or automatically after deployment/import.
// A new restore uses a new operationId; retries keep that exact UUID and context.
export const rearmAppointmentJobs = internalMutation({
  args: {
    operationId: v.string(), dryRun: v.boolean(),
    appointments: v.array(v.object({ appointmentId: v.id("appointments"), version: v.number(), start: v.number(), end: v.number() })),
  },
  returns: v.object({ planned: v.number(), scheduled: v.number(), replayed: v.number(), skipped: v.number() }),
  handler: async (ctx, args) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(args.operationId) ||
      args.appointments.length > 50 || new Set(args.appointments.map(row => row.appointmentId)).size !== args.appointments.length) {
      throw new ConvexError({ code: "INVALID_RECOVERY_COMMAND" });
    }
    const result = { planned: 0, scheduled: 0, replayed: 0, skipped: 0 };
    for (const expected of args.appointments) {
      const row = await ctx.db.get("appointments", expected.appointmentId);
      if (!row || (row.version ?? 0) !== expected.version || row.start !== expected.start || row.end !== expected.end) {
        throw new ConvexError({ code: "RECOVERY_CONTEXT_CHANGED" });
      }
      const receipt = await ctx.db.query("recoveryCommands")
        .withIndex("by_operationId_and_appointmentId", q => q.eq("operationId", args.operationId).eq("appointmentId", row._id)).unique();
      if (receipt) {
        if (receipt.version !== expected.version || receipt.start !== expected.start || receipt.end !== expected.end) throw new ConvexError({ code: "RECOVERY_COMMAND_CONFLICT" });
        result.replayed++;
        continue;
      }
      // Past/in-progress rows require reconciliation, never retrospective marks.
      if (row.automationEnabled !== true || row.status !== "confirmed" || row.start <= Date.now()) {
        result.skipped++;
        continue;
      }
      result.planned++;
      if (!args.dryRun) {
        await scheduleAttention(ctx, row);
        await ctx.db.insert("recoveryCommands", { operationId: args.operationId, ...expected });
        result.scheduled++;
      }
    }
    return result;
  },
});
