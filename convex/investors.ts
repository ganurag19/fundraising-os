import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import schema from "./schema";

/** Investors that dropped out of the research: hidden from new matches, kept on founders' existing lists. */
export const retireMany = internalMutation({
  args: { seedIds: v.array(v.string()) },
  returns: v.object({ retired: v.number(), missing: v.number() }),
  handler: async (ctx, { seedIds }) => {
    let retired = 0, missing = 0;
    for (const seedId of seedIds) {
      const existing = await ctx.db.query("investors").withIndex("by_seedId", (q) => q.eq("seedId", seedId)).unique();
      if (!existing) { missing++; continue; }
      if (!existing.retired) { await ctx.db.patch("investors", existing._id, { retired: true }); retired++; }
    }
    return { retired, missing };
  },
});

// Safe investor import: update in place by seedId, so founders' existing matches (which point at investor ids)
// keep working. Never deletes. Each row REPLACES the stored data, so a field missing from the new row is removed
// (and an investor that comes back loses its retired mark). Use scripts/upsert_investors.mjs; never `convex import --replace` on prod.
export const upsertMany = internalMutation({
  args: { rows: v.array(schema.tables.investors.validator) },
  returns: v.object({ inserted: v.number(), updated: v.number(), skipped: v.number() }),
  handler: async (ctx, { rows }) => {
    let inserted = 0, updated = 0, skipped = 0;
    for (const row of rows) {
      if (!row.email && !row.applyUrl) { skipped++; continue; } // every investor must be reachable
      const existing = await ctx.db.query("investors").withIndex("by_seedId", (q) => q.eq("seedId", row.seedId)).unique();
      if (existing) { await ctx.db.replace("investors", existing._id, row); updated++; }
      else { await ctx.db.insert("investors", row); inserted++; }
    }
    return { inserted, updated, skipped };
  },
});
