import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import schema from "./schema";

// Safe investor import: update in place by seedId, so founders' existing matches (which point at investor ids)
// keep working. Never deletes. Use scripts/upsert_investors.mjs; never `convex import --replace` on prod.
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
