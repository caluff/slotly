import { query } from "./_generated/server";
import { v } from "convex/values";

// Deliberately public and constant. No database scan, identity or tenant data.
export const ready = query({ args: {}, returns: v.null(), handler: async () => null });
