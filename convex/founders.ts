import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc } from "./_generated/dataModel";
import { ASK_LAKH, SECTOR_KEYS, STAGE_KEYS, dealToShow, scoreParts } from "./lib/match";
import { cleanCity, cleanWebsite, domainOf, normaliseLinkedin, normaliseUrl, roundLabel, sharesHerDomain, shortUrl } from "./lib/links";
import { withSignature } from "./lib/checks";
import { limits } from "./limits";

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
    if (!(await limits.limit(ctx, "newFoundersGlobal")).ok) return { ok: false as const, error: "Lots of sign-ups right now. Try again in a few minutes." };
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

/** Profile page: she fixes her name, company or lines later. Sector, stage and raise stay as matched. */
export const updateProfile = mutation({
  args: { token: v.string(), company: v.string(), name: v.string(), website: v.string(), linkedin: v.string(), oneLiner: v.string(), founderLine: v.string(), traction: v.string() },
  returns: v.union(v.object({ ok: v.literal(true) }), v.object({ ok: v.literal(false), error: v.string() })),
  handler: async (ctx, a) => {
    const f = await founderByToken(ctx, a.token);
    if (!f) return { ok: false as const, error: "Please reload the page and try again." };
    const company = companyCase(short(a.company, 80)), name = nameCase(short(a.name, 80));
    if (!company || !name) return { ok: false as const, error: "Please keep your name and your startup's name." };
    const website = a.website.trim() ? normaliseUrl(a.website) : null;
    if (a.website.trim() && !website) return { ok: false as const, error: "That website doesn't look right. Try something like ledgerly.in." };
    const linkedin = a.linkedin.trim() ? normaliseLinkedin(a.linkedin) : null;
    if (a.linkedin.trim() && !linkedin) return { ok: false as const, error: "Use your LinkedIn profile link, like linkedin.com/in/your-name." };
    const oneLiner = short(a.oneLiner, 200), founderLine = short(a.founderLine, 220);
    if (!oneLiner || !founderLine) return { ok: false as const, error: "Please keep your one-liner and the line about you." };
    await ctx.db.patch("founders", f._id, { company, name, website: website ?? undefined, linkedin: linkedin ?? undefined, oneLiner, founderLine, traction: short(a.traction, 200) || undefined });
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
      await ctx.scheduler.runAfter(0, internal.notify.welcome, { founderId: f._id });
    }
    return { ok: true as const };
  },
});

/** Signed in on a browser that doesn't hold her list (another device, or after signing out): her list's token, so the browser can use it. */
export const myToken = query({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const f = await ctx.db.query("founders").withIndex("by_userId", (q) => q.eq("userId", userId)).order("desc").first();
    return f?.token ?? null;
  },
});

/** Signed in, and the list is hers. Until then the names and emails beyond her top 3 stay on the server. */
export async function isUnlocked(ctx: QueryCtx | MutationCtx, f: Doc<"founders">) {
  if (!f.userId) return false;
  return (await getAuthUserId(ctx)) === f.userId;
}

const draftV = v.object({ reason: v.string(), whyFit: v.array(v.string()), watchOut: v.array(v.string()), hook: v.union(v.string(), v.null()), subject: v.string(), body: v.string(), warnings: v.array(v.string()), linkedin: v.union(v.string(), v.null()) });
const rowV = v.object({
  rank: v.number(), score: v.number(), kind: v.string(), city: v.union(v.string(), v.null()),
  chequeMinLakh: v.union(v.number(), v.null()), chequeMaxLakh: v.union(v.number(), v.null()), sentAt: v.union(v.number(), v.null()),
  // null while she's signed out (rows beyond her top 3)
  displayName: v.union(v.string(), v.null()), person: v.union(v.string(), v.null()), email: v.union(v.string(), v.null()),
  website: v.union(v.string(), v.null()), lastChecked: v.union(v.string(), v.null()), sourceUrls: v.array(v.string()),
  linkedin: v.union(v.string(), v.null()), // the investor's LinkedIn profile, when the research found one
  retired: v.boolean(), // dropped from the research (stopped investing, not a fit, dead site): shown as "No longer active", no links
  draft: v.union(v.null(), draftV),
  reason: v.union(v.string(), v.null()), // one line on why they fit
  parts: v.array(v.object({ key: v.string(), label: v.string(), got: v.number(), max: v.number() })), // the score, part by part
  leadsRounds: v.boolean(), lastDealYear: v.union(v.number(), v.null()), firstCheques: v.boolean(),
  // the deal shown in her table (null while hidden): newest in her sector, else newest, else a portfolio company
  deal: v.union(v.null(), v.object({ company: v.string(), year: v.union(v.number(), v.null()), round: v.union(v.string(), v.null()), inHers: v.boolean() })),
  // Programmes and form-only funds: an application link instead of an email
  applyUrl: v.union(v.string(), v.null()), applyDeadline: v.union(v.string(), v.null()), hasEmail: v.boolean(),
  status: v.union(v.literal("new"), v.literal("sent"), v.literal("replied"), v.literal("meeting"), v.literal("passed")),
  followups: v.array(v.object({ id: v.id("followups"), n: v.number(), state: v.string(), dueAt: v.number(), subject: v.union(v.string(), v.null()), body: v.union(v.string(), v.null()) })),
});

/** What the founder screens show: her details, writing status, her list and the emails written so far. */
export const me = query({
  args: { token: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      company: v.string(), name: v.string(), stage: v.string(), ask: v.string(), sectors: v.array(v.string()),
      website: v.union(v.string(), v.null()), hasProfile: v.boolean(), emailsStatus: v.string(),
      profile: v.object({ linkedin: v.string(), oneLiner: v.string(), founderLine: v.string(), traction: v.string() }),
      plan: v.union(v.literal("round_pass"), v.null()),
      emailReminders: v.boolean(),
      gmail: v.union(v.string(), v.null()), // her sign-in email, so "Open in Gmail" picks the right account
      unlocked: v.boolean(), matchCount: v.number(), activeCount: v.number(), leadCount: v.number(), rows: v.array(rowV),
      claimed: v.boolean(), // the list belongs to a Google account: its emails show only to that account, signed in
    }),
  ),
  handler: async (ctx, { token }) => {
    const f = await founderByToken(ctx, token);
    if (!f) return null;
    const unlocked = await isUnlocked(ctx, f);
    // Free: her best 20. Round Pass: up to 100 (we always keep 100 ranked).
    const matches = await ctx.db.query("matches").withIndex("by_founder_and_rank", (q) => q.eq("founderId", f._id)).take(f.plan === "round_pass" ? 100 : 20);
    const rows = [];
    const sig = { name: f.name, company: f.company, website: f.website ? shortUrl(f.website) : undefined, linkedin: f.linkedin ? shortUrl(f.linkedin) : undefined };
    for (const m of matches) {
      const inv = await ctx.db.get("investors", m.investorId);
      if (!inv) continue;
      if (sharesHerDomain(f.website, inv)) continue; // her own company's fund or team: never shown as her investor
      // Before sign-in her top 3 are open to her browser; once the list is claimed, only to the signed-in owner.
      const open = unlocked || (m.rank < 3 && !f.userId);
      const d = open ? await ctx.db.query("drafts").withIndex("by_founder_and_investor", (q) => q.eq("founderId", f._id).eq("investorId", inv._id)).first() : null;
      rows.push({
        rank: m.rank, score: m.score, kind: inv.kind, city: cleanCity(inv.city),
        chequeMinLakh: inv.chequeMinLakh ?? null, chequeMaxLakh: inv.chequeMaxLakh ?? null, sentAt: m.sentAt ?? null,
        // Beyond her top 3, an email address is only revealed once she asks for that investor's email ("Write email", capped daily).
        displayName: open ? inv.displayName : null, person: open ? inv.person ?? null : null, email: m.rank < 3 || d ? inv.email ?? null : null,
        // A retired investor keeps its place on her list, but its links are gone: a dead or taken-over site must never open from here.
        website: open && !inv.retired ? cleanWebsite(inv.website) : null, lastChecked: inv.lastChecked ?? null, sourceUrls: open && !inv.retired ? inv.sourceUrls : [],
        linkedin: open && !inv.retired ? inv.linkedin ?? null : null, retired: !!inv.retired,
        reason: d?.reason ?? m.reason ?? null,
        applyUrl: open && !inv.retired ? inv.applyUrl ?? null : null, applyDeadline: inv.applyDeadline ?? null, hasEmail: !!inv.email,
        parts: scoreParts(inv, f, new Date(m._creationTime).getFullYear()) ?? [], // the year she was matched (queries don't read the clock)
        leadsRounds: !!inv.leadsRounds, firstCheques: inv.stages.includes("idea") || inv.stages.includes("pre_seed"), lastDealYear: inv.recent.reduce<number | null>((y, r) => (r.year && (!y || r.year > y) ? r.year : y), null),
        deal: open ? (() => { const x = dealToShow(inv, f.sectors, d ? [d.hook ?? "", (d.editedBody ?? d.body).slice(0, 400)] : []); return x && { ...x, round: x.round && roundLabel(x.round) }; })() : null,
        status: m.status ?? ("new" as const),
        followups: open ? (await ctx.db.query("followups").withIndex("by_match_and_n", (q) => q.eq("matchId", m._id)).take(4))
          .filter((x) => x.state !== "cancelled")
          .map((x) => ({ id: x._id, n: x.n, state: x.state, dueAt: x.dueAt, subject: x.subject ?? null, body: x.body ?? null })) : [],
        draft: d ? { reason: d.reason, whyFit: d.whyFit, watchOut: d.watchOut, hook: d.hook ?? null, subject: d.editedSubject ?? d.subject, body: d.editedBody ?? withSignature(d.body, sig), warnings: d.warnings, linkedin: d.linkedin ?? null } : null,
      });
    }
    return {
      company: f.company, name: f.name, stage: f.stage, ask: f.ask, sectors: f.sectors, website: f.website ?? null,
      // A claimed list's profile shows only to its signed-in owner.
      profile: f.userId && !unlocked ? { linkedin: "", oneLiner: "", founderLine: "", traction: "" } : { linkedin: f.linkedin ?? "", oneLiner: f.oneLiner ?? "", founderLine: f.founderLine ?? "", traction: f.traction ?? "" },
      hasProfile: !!(f.oneLiner || f.forWho) && !!f.founderLine, emailsStatus: f.emailsStatus,
      gmail: unlocked && f.userId ? (await ctx.db.get("users", f.userId))?.email ?? null : null,
      plan: f.plan ?? null,
      emailReminders: f.emailReminders !== false,
      unlocked, claimed: !!f.userId, matchCount: f.matchCount ?? rows.length, activeCount: f.activeCount ?? 0, leadCount: f.leadCount ?? 0, rows,
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
    // Never match her with her own company's fund or team (same website or email domain).
    const investors = (await ctx.db.query("investors").take(2000)).filter((i) => !sharesHerDomain(f.website, i));
    // Re-running matching rewrites her list; never do that once her pipeline has started.
    const mine = await ctx.db.query("matches").withIndex("by_founder_and_rank", (q) => q.eq("founderId", f._id)).take(150);
    return { founder: f, investors, hasSent: mine.some((m) => !!m.sentAt) };
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
    const old = await ctx.db.query("matches").withIndex("by_founder_and_rank", (q) => q.eq("founderId", founderId)).take(150);
    for (const m of old) await ctx.db.delete("matches", m._id);
    const oldDrafts = await ctx.db.query("drafts").withIndex("by_founder_and_investor", (q) => q.eq("founderId", founderId)).take(150);
    for (const d of oldDrafts) await ctx.db.delete("drafts", d._id);
    for (const [rank, p] of picks.entries()) await ctx.db.insert("matches", { founderId, investorId: p.investorId, rank, score: p.score });
    return null;
  },
});

export const saveReasons = internalMutation({
  args: { founderId: v.id("founders"), reasons: v.array(v.object({ rank: v.number(), reason: v.string() })) },
  returns: v.null(),
  handler: async (ctx, { founderId, reasons }) => {
    for (const r of reasons) {
      const m = await ctx.db.query("matches").withIndex("by_founder_and_rank", (q) => q.eq("founderId", founderId).eq("rank", r.rank)).unique();
      if (m) await ctx.db.patch("matches", m._id, { reason: r.reason.slice(0, 160) });
    }
    return null;
  },
});

/** The investors on her list that still need a one-line reason. */
export const forReasons = internalQuery({
  args: { founderId: v.id("founders") },
  returns: v.any(),
  handler: async (ctx, { founderId }) => {
    const f = await ctx.db.get("founders", founderId);
    const visible = f?.plan === "round_pass" ? 100 : 20;
    const matches = (await ctx.db.query("matches").withIndex("by_founder_and_rank", (q) => q.eq("founderId", founderId).gte("rank", 3)).take(visible)).filter((m) => m.rank < visible);
    const out = [];
    for (const m of matches) if (!m.reason) { const inv = await ctx.db.get("investors", m.investorId); if (inv) out.push({ rank: m.rank, investor: inv }); }
    return out;
  },
});

export const saveDraft = internalMutation({
  args: { founderId: v.id("founders"), investorId: v.id("investors"), hook: v.string(), reason: v.string(), whyFit: v.array(v.string()), watchOut: v.array(v.string()), subject: v.string(), body: v.string(), warnings: v.array(v.string()), linkedin: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, a) => {
    await ctx.db.insert("drafts", { ...a, kind: "first" });
    return null;
  },
});

/** A signed-in founder's draft for one investor, for writing its LinkedIn note. */
export const draftForNote = internalQuery({
  args: { token: v.string(), rank: v.number(), userId: v.id("users") },
  returns: v.union(v.null(), v.object({ founder: v.any(), investor: v.any(), draftId: v.id("drafts"), body: v.string(), hasNote: v.boolean() })),
  handler: async (ctx, { token, rank, userId }) => {
    const f = await founderByToken(ctx, token);
    if (!f || f.userId !== userId) return null;
    const m = await ctx.db.query("matches").withIndex("by_founder_and_rank", (q) => q.eq("founderId", f._id).eq("rank", rank)).unique();
    if (!m) return null;
    const inv = await ctx.db.get("investors", m.investorId);
    const d = await ctx.db.query("drafts").withIndex("by_founder_and_investor", (q) => q.eq("founderId", f._id).eq("investorId", m.investorId)).first();
    if (!inv || !d) return null;
    return { founder: f, investor: inv, draftId: d._id, body: d.editedBody ?? d.body, hasNote: !!d.linkedin };
  },
});

export const saveNote = internalMutation({
  args: { draftId: v.id("drafts"), linkedin: v.string() },
  returns: v.null(),
  handler: async (ctx, { draftId, linkedin }) => {
    await ctx.db.patch("drafts", draftId, { linkedin });
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

/** Founding-list pre-sale, by hand until payments exist: npx convex run [--prod] founders:grantPass '{"email":"her sign-in email","days":120}' */
export const grantPass = internalMutation({
  args: { email: v.string(), days: v.number() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { email, days }) => {
    const user = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", email.trim().toLowerCase())).first();
    if (!user) return "No signed-in founder with that email.";
    const f = await ctx.db.query("founders").withIndex("by_userId", (q) => q.eq("userId", user._id)).first();
    if (!f) return "That account has no founder list yet.";
    await ctx.db.patch("founders", f._id, { plan: "round_pass", planUntil: Date.now() + days * 24 * 60 * 60 * 1000 });
    return null;
  },
});

/** Landing page proof bar: live counts by kind (retired investors excluded). Counts only, no names. */
export const publicStats = query({
  args: {},
  returns: v.object({ total: v.number(), vc: v.number(), angel: v.number(), angelNetwork: v.number(), accelerator: v.number(), incubator: v.number(), grant: v.number() }),
  handler: async (ctx) => {
    const all = await ctx.db.query("investors").take(5000);
    const live = all.filter((i) => !i.retired);
    const n = (...kinds: string[]) => live.filter((i) => kinds.includes(i.kind)).length;
    return { total: live.length, vc: n("vc", "corporate_vc"), angel: n("angel"), angelNetwork: n("angel_network"), accelerator: n("accelerator"), incubator: n("incubator"), grant: n("grant") };
  },
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** "Join the founding list" (Round Pass) and "Book a call" (Custom). Saves interest; takes no payment. */
export const joinList = mutation({
  args: { email: v.string(), name: v.string(), plan: v.union(v.literal("round_pass"), v.literal("custom")), note: v.optional(v.string()) },
  returns: v.union(v.object({ ok: v.literal(true) }), v.object({ ok: v.literal(false), error: v.string() })),
  handler: async (ctx, a) => {
    const email = a.email.trim().toLowerCase(), name = short(a.name, 100);
    if (!EMAIL.test(email) || email.length > 200) return { ok: false as const, error: "Please enter a valid email." };
    if (!name) return { ok: false as const, error: "Please enter your name." };
    if (!(await limits.limit(ctx, "interestGlobal")).ok) return { ok: false as const, error: "Lots of requests right now. Try again in a few minutes." };
    const existing = await ctx.db.query("passInterest").withIndex("by_email_and_plan", (q) => q.eq("email", email).eq("plan", a.plan)).first();
    if (!existing) await ctx.db.insert("passInterest", { email, name, plan: a.plan, note: short(a.note, 500) || undefined });
    return { ok: true as const };
  },
});
