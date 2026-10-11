import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc } from "./_generated/dataModel";
import { ASK_LAKH, SECTOR_KEYS, STAGE_KEYS } from "./lib/match";
import { domainOf, normaliseLinkedin, normaliseUrl } from "./lib/links";

const TOKEN = /^[a-f0-9]{48}$/;
const normaliseCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");
const short = (s: string | undefined, max: number) => (s ?? "").trim().slice(0, max);
/** "anurag rao" → "Anurag Rao"; leaves "DeVries" or "iCAN" alone. */
export const nameCase = (s: string) => (s === s.toLowerCase() ? s.replace(/(^|[\s'-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()) : s);
/** "monsoon grid" → "Monsoon Grid"; a name with any capital stays as she typed it. */
export const companyCase = nameCase;

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
    const company = companyCase(short(a.company, 80)), name = nameCase(short(a.name, 80));
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

/** "So the email sounds like you": her links, one-liner and founder line. */
export const saveProfile = mutation({
  args: { token: v.string(), website: v.string(), linkedin: v.string(), oneLiner: v.string(), founderLine: v.string(), vision: v.optional(v.string()), traction: v.optional(v.string()), revenue: v.optional(v.string()), customers: v.optional(v.string()) },
  returns: v.union(v.object({ ok: v.literal(true) }), v.object({ ok: v.literal(false), error: v.string() })),
  handler: async (ctx, a) => {
    const f = await founderByToken(ctx, a.token);
    if (!f) return { ok: false as const, error: "Please start again from the first step." };
    const website = a.website.trim() ? normaliseUrl(a.website) : null;
    if (a.website.trim() && !website) return { ok: false as const, error: "That website doesn't look right. Try something like verdera.ai." };
    const linkedin = a.linkedin.trim() ? normaliseLinkedin(a.linkedin) : null;
    if (a.linkedin.trim() && !linkedin) return { ok: false as const, error: "Use your LinkedIn profile link, like linkedin.com/in/your-name." };
    const oneLiner = short(a.oneLiner, 200), founderLine = short(a.founderLine, 220);
    if (!oneLiner) return { ok: false as const, error: "Please add your one-liner." };
    if (!founderLine) return { ok: false as const, error: "Please add one line about you." };
    await ctx.db.patch("founders", f._id, {
      website: website ?? undefined, linkedin: linkedin ?? undefined, oneLiner, founderLine,
      revenue: short(a.revenue, 80) || undefined, customers: short(a.customers, 80) || undefined,
      vision: short(a.vision, 120) || undefined, traction: short(a.traction, 200) || undefined,
    });
    if (!f.founderLine) await ctx.db.insert("steps", { step: "profile_done" });
    return { ok: true as const };
  },
});

/** She signs in on the reveal screen: her visitor list moves to her account. */
export const claim = mutation({
  args: { token: v.string() },
  returns: v.union(v.object({ ok: v.literal(true) }), v.object({ ok: v.literal(false), error: v.string() })),
  handler: async (ctx, { token }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { ok: false as const, error: "Please sign in first." };
    const f = await founderByToken(ctx, token);
    if (!f) return { ok: false as const, error: "Please start again from the first step." };
    if (f.userId && f.userId !== userId) return { ok: false as const, error: "This list belongs to another account." };
    if (!f.userId) {
      const user = await ctx.db.get("users", userId);
      // Internal only, never shown to her: does her sign-in email match her company's website?
      const domainMatch = user?.email && f.website ? domainOf(user.email) === domainOf(f.website) : undefined;
      await ctx.db.patch("founders", f._id, { userId, domainMatch });
      await ctx.db.insert("steps", { step: "signed_in" });
    }
    return { ok: true as const };
  },
});

/** "I sent it" on one investor (tap again to undo). */
export const markSent = mutation({
  args: { token: v.string(), rank: v.number(), sent: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { token, rank, sent }) => {
    const f = await founderByToken(ctx, token);
    if (!f) return null;
    const m = await ctx.db.query("matches").withIndex("by_founder_and_rank", (q) => q.eq("founderId", f._id).eq("rank", rank)).unique();
    if (!m) return null;
    await ctx.db.patch("matches", m._id, { sentAt: sent ? Date.now() : undefined });
    if (sent) await ctx.db.insert("steps", { step: "sent" });
    return null;
  },
});

/** Signed in, and the list is hers. Until then the names and emails beyond her top 3 stay on the server. */
export async function isUnlocked(ctx: QueryCtx | MutationCtx, f: Doc<"founders">) {
  if (!f.userId) return false;
  return (await getAuthUserId(ctx)) === f.userId;
}

const draftV = v.object({ reason: v.string(), whyFit: v.array(v.string()), watchOut: v.array(v.string()), hook: v.union(v.string(), v.null()), subject: v.string(), body: v.string(), warnings: v.array(v.string()) });
const rowV = v.object({
  rank: v.number(), score: v.number(), kind: v.string(), city: v.union(v.string(), v.null()),
  chequeMinLakh: v.union(v.number(), v.null()), chequeMaxLakh: v.union(v.number(), v.null()), sentAt: v.union(v.number(), v.null()),
  // null while she's signed out (rows beyond her top 3)
  displayName: v.union(v.string(), v.null()), person: v.union(v.string(), v.null()), email: v.union(v.string(), v.null()),
  website: v.union(v.string(), v.null()), lastChecked: v.union(v.string(), v.null()), sourceUrls: v.array(v.string()),
  draft: v.union(v.null(), draftV),
});

/** What the founder screens show: her details, writing status, her list and the emails written so far. */
export const me = query({
  args: { token: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      company: v.string(), name: v.string(), stage: v.string(), ask: v.string(), sectors: v.array(v.string()),
      website: v.union(v.string(), v.null()), hasProfile: v.boolean(), emailsStatus: v.string(),
      gmail: v.union(v.string(), v.null()), // her sign-in email, so "Open in Gmail" picks the right account
      unlocked: v.boolean(), matchCount: v.number(), activeCount: v.number(), leadCount: v.number(), rows: v.array(rowV),
    }),
  ),
  handler: async (ctx, { token }) => {
    const f = await founderByToken(ctx, token);
    if (!f) return null;
    const unlocked = await isUnlocked(ctx, f);
    const matches = await ctx.db.query("matches").withIndex("by_founder_and_rank", (q) => q.eq("founderId", f._id)).take(20);
    const rows = [];
    for (const m of matches) {
      const inv = await ctx.db.get("investors", m.investorId);
      if (!inv) continue;
      const open = unlocked || m.rank < 3;
      const d = open ? await ctx.db.query("drafts").withIndex("by_founder_and_investor", (q) => q.eq("founderId", f._id).eq("investorId", inv._id)).first() : null;
      rows.push({
        rank: m.rank, score: m.score, kind: inv.kind, city: inv.city ?? null,
        chequeMinLakh: inv.chequeMinLakh ?? null, chequeMaxLakh: inv.chequeMaxLakh ?? null, sentAt: m.sentAt ?? null,
        displayName: open ? inv.displayName : null, person: open ? inv.person ?? null : null, email: open ? inv.email : null,
        website: open ? inv.website ?? null : null, lastChecked: inv.lastChecked ?? null, sourceUrls: open ? inv.sourceUrls : [],
        draft: d ? { reason: d.reason, whyFit: d.whyFit, watchOut: d.watchOut, hook: d.hook ?? null, subject: d.editedSubject ?? d.subject, body: d.editedBody ?? d.body, warnings: d.warnings } : null,
      });
    }
    return {
      company: f.company, name: f.name, stage: f.stage, ask: f.ask, sectors: f.sectors, website: f.website ?? null,
      hasProfile: !!(f.oneLiner || f.forWho) && !!f.founderLine, emailsStatus: f.emailsStatus,
      gmail: unlocked && f.userId ? (await ctx.db.get("users", f.userId))?.email ?? null : null,
      unlocked, matchCount: f.matchCount ?? rows.length, activeCount: f.activeCount ?? 0, leadCount: f.leadCount ?? 0, rows,
    };
  },
});

/* ---------- internal helpers for the drafting action ---------- */

/** Just her record, for actions that don't need the investors. */
export const founderForAction = internalQuery({
  args: { token: v.string() },
  returns: v.any(),
  handler: async (ctx, { token }) => await founderByToken(ctx, token),
});

/** One investor on her list, for "Write email". Only when she's signed in and the list is hers. */
export const rowForDrafting = internalQuery({
  args: { token: v.string(), rank: v.number(), userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, { token, rank, userId }) => {
    const f = await founderByToken(ctx, token);
    if (!f || f.userId !== userId) return null;
    const m = await ctx.db.query("matches").withIndex("by_founder_and_rank", (q) => q.eq("founderId", f._id).eq("rank", rank)).unique();
    if (!m) return null;
    const inv = await ctx.db.get("investors", m.investorId);
    const existing = inv ? await ctx.db.query("drafts").withIndex("by_founder_and_investor", (q) => q.eq("founderId", f._id).eq("investorId", inv._id)).first() : null;
    return inv ? { founder: f, investor: inv, hasDraft: !!existing } : null;
  },
});

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
  args: { founderId: v.id("founders"), matchCount: v.number(), activeCount: v.number(), leadCount: v.number(), picks: v.array(v.object({ investorId: v.id("investors"), score: v.number() })) },
  returns: v.null(),
  handler: async (ctx, { founderId, matchCount, activeCount, leadCount, picks }) => {
    await ctx.db.patch("founders", founderId, { matchCount, activeCount, leadCount });
    const old = await ctx.db.query("matches").withIndex("by_founder_and_rank", (q) => q.eq("founderId", founderId)).take(50);
    for (const m of old) await ctx.db.delete("matches", m._id);
    const oldDrafts = await ctx.db.query("drafts").withIndex("by_founder_and_investor", (q) => q.eq("founderId", founderId)).take(50);
    for (const d of oldDrafts) await ctx.db.delete("drafts", d._id);
    for (const [rank, p] of picks.entries()) await ctx.db.insert("matches", { founderId, investorId: p.investorId, rank, score: p.score });
    return null;
  },
});

export const saveDraft = internalMutation({
  args: { founderId: v.id("founders"), investorId: v.id("investors"), hook: v.string(), reason: v.string(), whyFit: v.array(v.string()), watchOut: v.array(v.string()), subject: v.string(), body: v.string(), warnings: v.array(v.string()) },
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
