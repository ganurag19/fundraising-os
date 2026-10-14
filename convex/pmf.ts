import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { founderByToken, isUnlocked } from "./founders";

/** Her answer to the fit question (Sean Ellis). Signed in, her own list, after 3+ emails sent; one answer each, the latest wins. */
export const answer = mutation({
  args: { token: v.string(), answer: v.union(v.literal("very"), v.literal("somewhat"), v.literal("not")), benefit: v.optional(v.string()) },
  returns: v.union(v.object({ ok: v.literal(true) }), v.object({ ok: v.literal(false), error: v.string() })),
  handler: async (ctx, { token, answer, benefit }) => {
    const f = await founderByToken(ctx, token);
    if (!f || !(await isUnlocked(ctx, f))) return { ok: false as const, error: "Please sign in first." };
    const sent = (await ctx.db.query("matches").withIndex("by_founder_and_rank", (q) => q.eq("founderId", f._id)).take(100)).filter((m) => m.status).length;
    if (sent < 3) return { ok: false as const, error: "Send a few emails first." };
    const b = benefit?.trim().slice(0, 600) || undefined;
    const prev = await ctx.db.query("pmf").withIndex("by_founderId", (q) => q.eq("founderId", f._id)).first();
    if (prev) await ctx.db.patch("pmf", prev._id, { answer, benefit: b });
    else await ctx.db.insert("pmf", { founderId: f._id, answer, benefit: b });
    return { ok: true as const };
  },
});
