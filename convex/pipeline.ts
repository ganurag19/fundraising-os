import { internalMutation, internalQuery, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { founderByToken } from "./founders";

// Milestones 5–7: "I sent it" → Waiting on them; follow-ups on day 3 and 7 days after that; a reply stops them.

export const DAY = 24 * 60 * 60 * 1000;
export const FOLLOW_UP_DAYS = { 1: 3, 2: 7 } as const;

const statusV = v.union(v.literal("new"), v.literal("sent"), v.literal("replied"), v.literal("meeting"), v.literal("passed"));

async function schedule(ctx: MutationCtx, founderId: Id<"founders">, matchId: Id<"matches">, n: 1 | 2, from: number) {
  const existing = await ctx.db.query("followups").withIndex("by_match_and_n", (q) => q.eq("matchId", matchId).eq("n", n)).first();
  if (existing && existing.state !== "cancelled") return;
  const dueAt = from + FOLLOW_UP_DAYS[n] * DAY;
  const followupId = existing
    ? (await ctx.db.patch("followups", existing._id, { state: "scheduled", dueAt, subject: undefined, body: undefined, sentAt: undefined }), existing._id)
    : await ctx.db.insert("followups", { founderId, matchId, n, dueAt, state: "scheduled" });
  await ctx.scheduler.runAt(dueAt, internal.followups.write, { followupId });
}

async function cancelPending(ctx: MutationCtx, matchId: Id<"matches">) {
  for (const n of [1, 2]) {
    const f = await ctx.db.query("followups").withIndex("by_match_and_n", (q) => q.eq("matchId", matchId).eq("n", n)).first();
    if (f && (f.state === "scheduled" || f.state === "ready" || f.state === "failed")) await ctx.db.patch("followups", f._id, { state: "cancelled" });
  }
}

/** Status ▾ and "I sent it". "new" undoes a send. Only her own list, found from her token. */
export const setStatus = mutation({
  args: { token: v.string(), rank: v.number(), status: statusV },
  returns: v.null(),
  handler: async (ctx, { token, rank, status }) => {
    const f = await founderByToken(ctx, token);
    if (!f) return null;
    const m = await ctx.db.query("matches").withIndex("by_founder_and_rank", (q) => q.eq("founderId", f._id).eq("rank", rank)).unique();
    if (!m || (m.status ?? "new") === status) return null;
    const now = Date.now();
    if (status === "new") {
      await ctx.db.patch("matches", m._id, { status: undefined, statusAt: undefined, sentAt: undefined });
      await cancelPending(ctx, m._id);
      return null;
    }
    if (status === "sent") {
      const sentAt = m.sentAt ?? now;
      await ctx.db.patch("matches", m._id, { status, statusAt: now, sentAt });
      // "I applied" to a programme or form: Waiting on them, with no follow-ups (there's no inbox to nudge).
      const inv = await ctx.db.get("investors", m.investorId);
      if (inv?.email) await schedule(ctx, f._id, m._id, 1, sentAt);
      await ctx.db.insert("steps", { step: inv?.email ? "sent" : "applied" });
      return null;
    }
    // replied, meeting or passed: the conversation moved on, so no more nudges
    await ctx.db.patch("matches", m._id, { status, statusAt: now, sentAt: m.sentAt ?? now });
    await cancelPending(ctx, m._id);
    await ctx.db.insert("steps", { step: status });
    return null;
  },
});

/** She edited her email. Kept next to the original, so we can learn what she changes (AGENTS.md section 4). */
export const saveEdit = mutation({
  args: { token: v.string(), rank: v.number(), subject: v.string(), body: v.string() },
  returns: v.union(v.object({ ok: v.literal(true) }), v.object({ ok: v.literal(false), error: v.string() })),
  handler: async (ctx, { token, rank, subject, body }) => {
    const f = await founderByToken(ctx, token);
    if (!f) return { ok: false as const, error: "Please reload the page and try again." };
    const m = await ctx.db.query("matches").withIndex("by_founder_and_rank", (q) => q.eq("founderId", f._id).eq("rank", rank)).unique();
    const d = m ? await ctx.db.query("drafts").withIndex("by_founder_and_investor", (q) => q.eq("founderId", f._id).eq("investorId", m.investorId)).first() : null;
    if (!d) return { ok: false as const, error: "We couldn't find that email." };
    const s = subject.trim().slice(0, 150), b = body.trim().slice(0, 3000);
    if (!s || !b) return { ok: false as const, error: "The subject and the email can't be empty." };
    await ctx.db.patch("drafts", d._id, { editedSubject: s === d.subject ? undefined : s, editedBody: b === d.body ? undefined : b });
    await ctx.db.insert("steps", { step: "edited" });
    return { ok: true as const };
  },
});

/** She sent a follow-up. After #1, #2 is scheduled 7 days later. */
export const followupSent = mutation({
  args: { token: v.string(), followupId: v.id("followups") },
  returns: v.null(),
  handler: async (ctx, { token, followupId }) => {
    const f = await founderByToken(ctx, token);
    const fu = await ctx.db.get("followups", followupId);
    if (!f || !fu || fu.founderId !== f._id || fu.state !== "ready") return null;
    const now = Date.now();
    await ctx.db.patch("followups", fu._id, { state: "sent", sentAt: now });
    await ctx.db.insert("steps", { step: `followup_${fu.n}_sent` });
    const m = await ctx.db.get("matches", fu.matchId);
    if (fu.n === 1 && m?.status === "sent") await schedule(ctx, f._id, m._id, 2, now);
    return null;
  },
});

/* ---------- for the follow-up writer (convex/followups.ts) ---------- */

export const forFollowup = internalQuery({
  args: { followupId: v.id("followups") },
  returns: v.any(),
  handler: async (ctx, { followupId }) => {
    const fu = await ctx.db.get("followups", followupId);
    if (!fu) return null;
    const m = await ctx.db.get("matches", fu.matchId);
    const founder = await ctx.db.get("founders", fu.founderId);
    const investor = m ? await ctx.db.get("investors", m.investorId) : null;
    const first = m ? await ctx.db.query("drafts").withIndex("by_founder_and_investor", (q) => q.eq("founderId", fu.founderId).eq("investorId", m.investorId)).first() : null;
    const earlier = fu.n === 2 ? await ctx.db.query("followups").withIndex("by_match_and_n", (q) => q.eq("matchId", fu.matchId).eq("n", 1)).first() : null;
    return { followup: fu, match: m, founder, investor, first, earlier };
  },
});

export const saveFollowup = internalMutation({
  args: { followupId: v.id("followups"), subject: v.optional(v.string()), body: v.optional(v.string()), failed: v.optional(v.boolean()) },
  returns: v.null(),
  handler: async (ctx, { followupId, subject, body, failed }) => {
    const fu = await ctx.db.get("followups", followupId);
    if (!fu || fu.state !== "scheduled") return null; // cancelled while it was being written
    await ctx.db.patch("followups", followupId, failed ? { state: "failed" } : { state: "ready", subject, body });
    return null;
  },
});

/** Try again later when the app-wide AI cap is hit. */
export const retryLater = internalMutation({
  args: { followupId: v.id("followups") },
  returns: v.null(),
  handler: async (ctx, { followupId }) => {
    await ctx.scheduler.runAfter(60 * 60 * 1000, internal.followups.write, { followupId });
    return null;
  },
});

/** Testing, from the terminal only (internal): make one founder's scheduled follow-ups come due now.
 *  npx convex run [--prod] pipeline:fastForward '{"token":"<her token>"}' */
export const fastForward = internalMutation({
  args: { token: v.string() },
  returns: v.number(),
  handler: async (ctx, { token }) => {
    const f = await founderByToken(ctx, token);
    if (!f) return 0;
    const due = await ctx.db.query("followups").withIndex("by_founder_and_state", (q) => q.eq("founderId", f._id).eq("state", "scheduled")).take(50);
    for (const fu of due) {
      await ctx.db.patch("followups", fu._id, { dueAt: Date.now() });
      await ctx.scheduler.runAfter(0, internal.followups.write, { followupId: fu._id });
    }
    return due.length;
  },
});
