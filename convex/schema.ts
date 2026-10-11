import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // People who asked for an invite from the landing page.
  waitlist: defineTable({
    email: v.string(),
    name: v.string(),
    company: v.string(),
    stage: v.string(),
    status: v.union(v.literal("waiting"), v.literal("invited")),
  }).index("by_email", ["email"]),

  // Invite codes. A code works until it has been used `maxUses` times.
  inviteCodes: defineTable({
    code: v.string(),
    label: v.string(), // who it's for, e.g. "GrowthX cohort"
    maxUses: v.number(),
    uses: v.number(),
  }).index("by_code", ["code"]),
});
