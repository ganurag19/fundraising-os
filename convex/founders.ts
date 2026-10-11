import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { ASK_LAKH, SECTOR_KEYS, STAGE_KEYS } from "./lib/match";

const TOKEN = /^[a-f0-9]{48}$/;
const normaliseCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");
const short = (s: string | undefined, max: number) => (s ?? "").trim().slice(0, max);

/** Every public function finds the founder from her own token, never from an id she sends. */
export async function founderByToken(ctx: QueryCtx | MutationCtx, token: string) {
  if (!TOKEN.test(token)) return null;
  return await ctx.db.query("founders").withIndex("by_token", (q) => q.eq("token", token)).unique();
}

export const logStep = internalMutation({
  args: { step: v.string() },
  returns: v.null(),
  handler: async (ctx, { step }) => {
    await ctx.db.insert("steps", { step });
    return null;
  },
});

/** Sign-up steps 1–4. Uses one invite code and creates (or updates) her founder record. */
export const start = mutation({
  args: { token: v.string(), inviteCode: v.string(), company: v.string(), name: v.string(), sectors: v.array(v.string()), stage: v.string(), ask: v.string() },
  returns: v.union(v.object({ ok: v.literal(true) }), v.object({ ok: v.literal(false), error: v.string() })),
  handler: async (ctx, a) => {
    if (!TOKEN.test(a.token)) return { ok: false as const, error: "Please reload the page and try again." };
    const company = short(a.company, 80), name = short(a.name, 80);
    if (!company) return { ok: false as const, error: "Please enter your startup's name." };
    if (!name) return { ok: false as const, error: "Please enter your name." };
    const sectors = a.sectors.filter((s) => s in SECTOR_KEYS).slice(0, 3);
    if (!sectors.length) return { ok: false as const, error: "Please pick at least one sector." };
    if (!(a.stage in STAGE_KEYS)) return { ok: false as const, error: "Please pick your stage." };
    if (!(a.ask in ASK_LAKH)) return { ok: false as const, error: "Please pick how much you're raising." };

    const existing = await founderByToken(ctx, a.token);
    if (existing) {
      await ctx.db.patch("founders", existing._id, { company, name, sectors, stage: a.stage, ask: a.ask });
      return { ok: true as const };
    }
    const code = normaliseCode(a.inviteCode);
    const invite = await ctx.db.query("inviteCodes").withIndex("by_code", (q) => q.eq("code", code)).unique();
    if (!invite || invite.uses >= invite.maxUses) return { ok: false as const, error: "Your invite code doesn't work any more. Go back and request an invite." };
    await ctx.db.patch("inviteCodes", invite._id, { uses: invite.uses + 1 });
    await ctx.db.insert("founders", { token: a.token, inviteCode: code, company, name, sectors, stage: a.stage, ask: a.ask, emailsStatus: "none" });
    await ctx.db.insert("steps", { step: "signup_done" });
    return { ok: true as const };
  },
});

/** "So the email sounds like you": the one-liner parts and the founder line. */
export const saveProfile = mutation({
  args: { token: v.string(), forWho: v.string(), outcome: v.string(), how: v.string(), reduce: v.string(), founderLine: v.string(), revenue: v.optional(v.string()), customers: v.optional(v.string()) },
  returns: v.union(v.object({ ok: v.literal(true) }), v.object({ ok: v.literal(false), error: v.string() })),
  handler: async (ctx, a) => {
    const f = await founderByToken(ctx, a.token);
    if (!f) return { ok: false as const, error: "Please start again from the first step." };
    const fields = { forWho: short(a.forWho, 80), outcome: short(a.outcome, 100), how: short(a.how, 100), reduce: short(a.reduce, 100), founderLine: short(a.founderLine, 220) };
    if (!fields.forWho || !fields.outcome || !fields.how) return { ok: false as const, error: "Please fill in who you help, what they achieve, and how." };
    if (!fields.founderLine) return { ok: false as const, error: "Please add one line about you." };
    await ctx.db.patch("founders", f._id, { ...fields, revenue: short(a.revenue, 80) || undefined, customers: short(a.customers, 80) || undefined });
    if (!f.forWho) await ctx.db.insert("steps", { step: "profile_done" });
    return { ok: true as const };
  },
});

/** What the founder screens show: her details, writing status, and her top picks with emails. */
export const me = query({
  args: { token: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      company: v.string(), name: v.string(), stage: v.string(), ask: v.string(), sectors: v.array(v.string()),
      hasProfile: v.boolean(), emailsStatus: v.string(),
      picks: v.array(v.object({
        rank: v.number(), score: v.number(), displayName: v.string(), person: v.union(v.string(), v.null()),
        kind: v.string(), city: v.union(v.string(), v.null()), email: v.string(), lastChecked: v.union(v.string(), v.null()),
        sourceUrls: v.array(v.string()),
        draft: v.union(v.null(), v.object({ reason: v.string(), whyFit: v.array(v.string()), watchOut: v.array(v.string()), subject: v.string(), body: v.string(), warnings: v.array(v.string()) })),
      })),
    }),
  ),
  handler: async (ctx, { token }) => {
    const f = await founderByToken(ctx, token);
    if (!f) return null;
    const matches = await ctx.db.query("matches").withIndex("by_founder_and_rank", (q) => q.eq("founderId", f._id)).take(20);
    const picks = [];
    for (const m of matches) {
      const inv = await ctx.db.get("investors", m.investorId);
      if (!inv) continue;
      const d = await ctx.db.query("drafts").withIndex("by_founder_and_investor", (q) => q.eq("founderId", f._id).eq("investorId", inv._id)).first();
      picks.push({
        rank: m.rank, score: m.score, displayName: inv.displayName, person: inv.person ?? null, kind: inv.kind, city: inv.city ?? null,
        email: inv.email, lastChecked: inv.lastChecked ?? null, sourceUrls: inv.sourceUrls,
        draft: d ? { reason: d.reason, whyFit: d.whyFit, watchOut: d.watchOut, subject: d.editedSubject ?? d.subject, body: d.editedBody ?? d.body, warnings: d.warnings } : null,
      });
    }
    return { company: f.company, name: f.name, stage: f.stage, ask: f.ask, sectors: f.sectors, hasProfile: !!f.forWho && !!f.founderLine, emailsStatus: f.emailsStatus, picks };
  },
});

/* ---------- internal helpers for the drafting action ---------- */

export const forDrafting = internalQuery({
  args: { token: v.string() },
  returns: v.any(),
  handler: async (ctx, { token }) => {
    const f = await founderByToken(ctx, token);
    if (!f) return null;
    const investors = await ctx.db.query("investors").take(2000);
    return { founder: f, investors };
  },
});

export const setStatus = internalMutation({
  args: { founderId: v.id("founders"), status: v.union(v.literal("none"), v.literal("writing"), v.literal("ready"), v.literal("failed")) },
  returns: v.null(),
  handler: async (ctx, { founderId, status }) => {
    await ctx.db.patch("founders", founderId, { emailsStatus: status });
    return null;
  },
});

export const saveMatches = internalMutation({
  args: { founderId: v.id("founders"), picks: v.array(v.object({ investorId: v.id("investors"), score: v.number() })) },
  returns: v.null(),
  handler: async (ctx, { founderId, picks }) => {
    const old = await ctx.db.query("matches").withIndex("by_founder_and_rank", (q) => q.eq("founderId", founderId)).take(50);
    for (const m of old) await ctx.db.delete("matches", m._id);
    const oldDrafts = await ctx.db.query("drafts").withIndex("by_founder_and_investor", (q) => q.eq("founderId", founderId)).take(50);
    for (const d of oldDrafts) await ctx.db.delete("drafts", d._id);
    for (const [rank, p] of picks.entries()) await ctx.db.insert("matches", { founderId, investorId: p.investorId, rank, score: p.score });
    return null;
  },
});

export const saveDraft = internalMutation({
  args: { founderId: v.id("founders"), investorId: v.id("investors"), reason: v.string(), whyFit: v.array(v.string()), watchOut: v.array(v.string()), subject: v.string(), body: v.string(), warnings: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, a) => {
    await ctx.db.insert("drafts", { ...a, kind: "first" });
    return null;
  },
});

export const logAiCall = internalMutation({
  args: { founderId: v.optional(v.id("founders")), purpose: v.string(), model: v.string(), input: v.string(), output: v.string(), ms: v.number(), inputTokens: v.optional(v.number()), outputTokens: v.optional(v.number()), error: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, a) => {
    await ctx.db.insert("aiCalls", a);
    return null;
  },
});
