import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { limits } from "./limits";
import { founderByToken } from "./founders";
import { visitorHash } from "./track";

const PAGES = new Set(["landing", "start", "emails", "dashboard", "compare"]);

/** "Send feedback": a short note to the owner, read on /admin. Capped per visitor and app-wide. */
export const send = mutation({
  args: { token: v.string(), page: v.string(), text: v.string(), email: v.optional(v.string()) },
  returns: v.union(v.object({ ok: v.literal(true) }), v.object({ ok: v.literal(false), error: v.string() })),
  handler: async (ctx, { token, page, text, email }) => {
    const body = text.trim().slice(0, 1500);
    if (body.length < 3) return { ok: false as const, error: "Write a few words first." };
    if (!/^[a-f0-9]{48}$/.test(token)) return { ok: false as const, error: "Please reload the page and try again." };
    if (!(await limits.limit(ctx, "feedbackPerVisitor", { key: token })).ok) return { ok: false as const, error: "Thanks, we've got your notes. Try again in an hour." };
    if (!(await limits.limit(ctx, "feedbackGlobal")).ok) return { ok: false as const, error: "Busy right now. Try again in a few minutes." };
    const userId = await getAuthUserId(ctx);
    const user = userId ? await ctx.db.get("users", userId) : null;
    const typed = email?.trim().toLowerCase().slice(0, 200);
    const reply = user?.email ?? (typed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(typed) ? typed : undefined);
    const f = await founderByToken(ctx, token);
    await ctx.db.insert("feedback", { page: PAGES.has(page) ? page : "other", text: body, email: reply, company: f?.company, visitor: await visitorHash(token) });
    return { ok: true as const };
  },
});
