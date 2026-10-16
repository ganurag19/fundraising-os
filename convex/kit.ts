import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ASK_LAKH, SECTOR_KEYS, STAGE_KEYS } from "./lib/match";
import { normaliseLinkedin, normaliseUrl } from "./lib/links";
import { companyCase, founderByToken, isUnlocked, nameCase } from "./founders";
import { limits } from "./limits";

// The Raise Kit (15 Oct): /build reads her site and files, she confirms her facts, we build her kit.
// Every function finds her from her own token (AGENTS.md section 3).

const TOKEN = /^[a-f0-9]{48}$/;
const HEX = /^#[0-9a-f]{6}$/i;
const short = (s: string | undefined, max: number) => (s ?? "").trim().slice(0, max);
const normaliseCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");
/** "Kiln Labs" → "kiln-labs" (then "kiln-labs-2" if taken): her pitch room's address. */
export async function freeSlug(ctx: MutationCtx, company: string) {
  const base = company.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "startup";
  for (let i = 1; i < 50; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    if (!(await ctx.db.query("kits").withIndex("by_slug", (q) => q.eq("slug", slug)).first())) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** The code a /kit link uses when it carries none (friends and colleagues test). */
export const KIT_CODE = "KIT";

const brandV = v.object({ primary: v.string(), accent: v.optional(v.string()), logo: v.optional(v.string()), font: v.optional(v.string()), fontCss: v.optional(v.string()) });
const teamV = v.array(v.object({ name: v.string(), role: v.string(), line: v.string() }));
const factsV = v.object({
  problem: v.optional(v.string()), product: v.optional(v.string()), forWho: v.optional(v.string()), customers: v.optional(v.string()),
  market: v.optional(v.string()), businessModel: v.optional(v.string()), competitors: v.optional(v.string()),
  useOfFunds: v.optional(v.string()), whyNow: v.optional(v.string()), team: teamV,
});
const slideV = v.object({ key: v.string(), headline: v.string(), points: v.array(v.string()), metrics: v.array(v.object({ value: v.string(), label: v.string() })) });
const result = v.union(v.object({ ok: v.literal(true) }), v.object({ ok: v.literal(false), error: v.string() }));

/** A private upload link for one PDF (her deck, CV or LinkedIn PDF). Read once by kitAi.readDocs, then deleted. */
export const uploadUrl = mutation({
  args: { token: v.string() },
  returns: v.union(v.object({ ok: v.literal(true), url: v.string() }), v.object({ ok: v.literal(false), error: v.string() })),
  handler: async (ctx, { token }) => {
    if (!TOKEN.test(token)) return { ok: false as const, error: "Please reload the page and try again." };
    if (!(await limits.limit(ctx, "uploadsPerVisitor", { key: token })).ok) return { ok: false as const, error: "That's enough files for today. Fill in the facts on the next screen instead." };
    return { ok: true as const, url: await ctx.storage.generateUploadUrl() };
  },
});

/** "Confirm your facts": creates (or updates) her founder record and her kit, ready to build. */
export const confirm = mutation({
  args: {
    token: v.string(), code: v.string(),
    company: v.string(), name: v.string(), website: v.string(), linkedin: v.string(),
    sectors: v.array(v.string()), stage: v.string(), ask: v.string(),
    oneLiner: v.string(), founderLine: v.string(), traction: v.string(),
    brand: brandV, facts: factsV, uploads: v.number(),
  },
  returns: result,
  handler: async (ctx, a) => {
    if (!TOKEN.test(a.token)) return { ok: false as const, error: "Please reload the page and try again." };
    const company = companyCase(short(a.company, 80)), name = nameCase(short(a.name, 80));
    if (!company) return { ok: false as const, error: "Please add your startup's name." };
    if (!name) return { ok: false as const, error: "Please add your name." };
    const sectors = a.sectors.filter((s) => s in SECTOR_KEYS).slice(0, 3);
    if (!sectors.length) return { ok: false as const, error: "Please pick at least one sector." };
    if (!(a.stage in STAGE_KEYS)) return { ok: false as const, error: "Please pick your stage." };
    if (!(a.ask in ASK_LAKH)) return { ok: false as const, error: "Please pick how much you're raising." };
    const oneLiner = short(a.oneLiner, 200), founderLine = short(a.founderLine, 220);
    if (!oneLiner) return { ok: false as const, error: "Please add what your startup does, in one line." };
    if (!founderLine) return { ok: false as const, error: "Please add one line about you." };
    const website = a.website.trim() ? normaliseUrl(a.website) : null;
    if (a.website.trim() && !website) return { ok: false as const, error: "That website doesn't look right. Try something like kilnlabs.in." };
    const linkedin = a.linkedin.trim() ? normaliseLinkedin(a.linkedin) : null;
    if (a.linkedin.trim() && !linkedin) return { ok: false as const, error: "Use your LinkedIn profile link, like linkedin.com/in/your-name." };

    const brand = {
      primary: HEX.test(a.brand.primary) ? a.brand.primary : "#3D7BFF",
      accent: a.brand.accent && HEX.test(a.brand.accent) ? a.brand.accent : undefined,
      logo: a.brand.logo && /^https:\/\/[^\s"'<>]{4,500}$/.test(a.brand.logo) ? a.brand.logo : undefined,
      font: a.brand.font && /^[A-Za-z0-9 ]{2,40}$/.test(a.brand.font) ? a.brand.font : undefined,
      // her site's own Google Fonts link, so the deck gets exactly the weights her site uses
      fontCss: a.brand.fontCss && /^https:\/\/fonts\.googleapis\.com\/css2?\?[\w\-+:;,@.&=%]{3,400}$/.test(a.brand.fontCss) ? a.brand.fontCss : undefined,
    };
    const f8 = (s?: string, max = 300) => short(s, max) || undefined;
    const facts = {
      problem: f8(a.facts.problem), product: f8(a.facts.product), forWho: f8(a.facts.forWho, 120), customers: f8(a.facts.customers, 200),
      market: f8(a.facts.market), businessModel: f8(a.facts.businessModel), competitors: f8(a.facts.competitors),
      useOfFunds: f8(a.facts.useOfFunds), whyNow: f8(a.facts.whyNow),
      team: a.facts.team.filter((m) => m.name.trim()).slice(0, 4).map((m) => ({ name: nameCase(short(m.name, 60)), role: short(m.role, 60), line: short(m.line, 160) })),
    };
    const profile = { company, name, sectors, stage: a.stage, ask: a.ask, website: website ?? undefined, linkedin: linkedin ?? undefined, oneLiner, founderLine, traction: short(a.traction, 200) || undefined };

    let f = await founderByToken(ctx, a.token);
    if (f) {
      if (f.userId && !(await isUnlocked(ctx, f))) return { ok: false as const, error: "This kit is saved to a Google account. Sign in to change it." };
      await ctx.db.patch("founders", f._id, profile);
    } else {
      const code = normaliseCode(a.code || KIT_CODE);
      const invite = await ctx.db.query("inviteCodes").withIndex("by_code", (q) => q.eq("code", code)).unique();
      if (!invite || invite.uses >= invite.maxUses) return { ok: false as const, error: "This link's invite has run out. Ask the person who shared it for a new one." };
      if (!(await limits.limit(ctx, "newFoundersGlobal")).ok) return { ok: false as const, error: "Lots of sign-ups right now. Try again in a few minutes." };
      await ctx.db.patch("inviteCodes", invite._id, { uses: invite.uses + 1 });
      const id = await ctx.db.insert("founders", { token: a.token, inviteCode: code, ...profile, emailsStatus: "none" });
      f = await ctx.db.get("founders", id);
      await ctx.db.insert("steps", { step: "signup_done" });
      // A review she got before signing up (Start with your deck) moves to her record.
      for (const r of await ctx.db.query("deckReviews").withIndex("by_token", (q) => q.eq("token", a.token)).take(10)) if (!r.founderId) await ctx.db.patch("deckReviews", r._id, { founderId: id });
    }
    if (!f) return { ok: false as const, error: "Please reload the page and try again." };
    const kit = await ctx.db.query("kits").withIndex("by_founderId", (q) => q.eq("founderId", f._id)).first();
    if (kit) await ctx.db.patch("kits", kit._id, { brand, facts, uploads: Math.max(kit.uploads, a.uploads), slug: kit.slug ?? (await freeSlug(ctx, company)) });
    else await ctx.db.insert("kits", { founderId: f._id, status: "building", brand, facts, uploads: a.uploads, slug: await freeSlug(ctx, company) });
    await ctx.db.insert("steps", { step: "kit_facts_confirmed" });
    return { ok: true as const };
  },
});

/** Her kit, for /build and /app. Same rule as her list: once it's saved to a Google account, only that account sees it. */
export const mine = query({
  args: { token: v.string() },
  returns: v.union(v.null(), v.object({
    status: v.union(v.literal("building"), v.literal("ready"), v.literal("failed")),
    brand: brandV, facts: factsV, deck: v.union(v.null(), v.array(slideV)),
    teaser: v.union(v.null(), v.object({ summary: v.string(), highlights: v.array(v.string()) })),
    requested: v.boolean(), // she has asked for full access
    rated: v.boolean(), // she has given quick feedback
  })),
  handler: async (ctx, { token }) => {
    const f = await founderByToken(ctx, token);
    if (!f) return null;
    if (f.userId && !(await isUnlocked(ctx, f))) return null;
    const kit = await ctx.db.query("kits").withIndex("by_founderId", (q) => q.eq("founderId", f._id)).first();
    if (!kit) return null;
    const requested = !!(await ctx.db.query("upgradeRequests").withIndex("by_founderId", (q) => q.eq("founderId", f._id)).first());
    const rated = !!(await ctx.db.query("kitRatings").withIndex("by_founderId", (q) => q.eq("founderId", f._id)).first());
    return { status: kit.status, brand: kit.brand, facts: kit.facts, deck: kit.deck ?? null, teaser: kit.teaser ?? null, requested, rated };
  },
});

const PLANS = ["raise_kit", "raise_kit_advisors", "done_for_you"];
const ANSWERS = ["yes", "maybe", "no"];

/** "Request full access": the plan she wants and her answers. Shown on /admin. No payment yet. */
export const requestUpgrade = mutation({
  args: {
    token: v.string(), plan: v.string(), wouldPay: v.string(), price: v.string(), liked: v.string(), missing: v.string(),
    solves: v.number(), valuable: v.number(), raisingWhen: v.string(), phone: v.string(),
  },
  returns: result,
  handler: async (ctx, a) => {
    const f = await founderByToken(ctx, a.token);
    if (!f) return { ok: false as const, error: "Please reload the page and try again." };
    const userId = await getAuthUserId(ctx);
    if (!userId || f.userId !== userId) return { ok: false as const, error: "Please sign in first." };
    if (!PLANS.includes(a.plan)) return { ok: false as const, error: "Please pick a plan." };
    if (!ANSWERS.includes(a.wouldPay)) return { ok: false as const, error: "Please answer: would you pay for this?" };
    const rating = (n: number) => Math.min(5, Math.max(1, Math.round(n)));
    if (!(a.solves >= 1 && a.valuable >= 1)) return { ok: false as const, error: "Please rate both questions." };
    const phone = short(a.phone, 20);
    if (phone && !/^[+\d][\d\s-]{6,18}$/.test(phone)) return { ok: false as const, error: "That phone number doesn't look right." };
    if (!(await limits.limit(ctx, "interestGlobal")).ok) return { ok: false as const, error: "Lots of requests right now. Try again in a few minutes." };
    const user = await ctx.db.get("users", userId);
    const row = {
      founderId: f._id, email: user?.email ?? undefined, plan: a.plan, wouldPay: a.wouldPay, price: short(a.price, 40) || undefined,
      liked: short(a.liked, 600) || undefined, missing: short(a.missing, 600) || undefined, solves: rating(a.solves), valuable: rating(a.valuable),
      raisingWhen: short(a.raisingWhen, 40) || undefined, phone: phone || undefined,
    };
    const existing = await ctx.db.query("upgradeRequests").withIndex("by_founderId", (q) => q.eq("founderId", f._id)).first();
    if (existing) await ctx.db.patch("upgradeRequests", existing._id, row);
    else { await ctx.db.insert("upgradeRequests", row); await ctx.db.insert("steps", { step: "kit_upgrade_requested" }); }
    return { ok: true as const };
  },
});

/* ---------- internal, for kitAi ---------- */

export const fileInfo = internalQuery({
  args: { id: v.id("_storage") },
  returns: v.union(v.null(), v.object({ size: v.number(), contentType: v.union(v.string(), v.null()) })),
  handler: async (ctx, { id }) => {
    const m = await ctx.db.system.get("_storage", id);
    return m ? { size: m.size, contentType: m.contentType ?? null } : null;
  },
});

export const forBuild = internalQuery({
  args: { token: v.string() },
  returns: v.any(),
  handler: async (ctx, { token }) => {
    const f = await founderByToken(ctx, token);
    if (!f) return null;
    if (f.userId && !(await isUnlocked(ctx, f))) return null;
    const kit = await ctx.db.query("kits").withIndex("by_founderId", (q) => q.eq("founderId", f._id)).first();
    return kit ? { founder: f, kit } : null;
  },
});

export const saveContent = internalMutation({
  args: { founderId: v.id("founders"), status: v.union(v.literal("building"), v.literal("ready"), v.literal("failed")), deck: v.optional(v.array(slideV)), teaser: v.optional(v.object({ summary: v.string(), highlights: v.array(v.string()) })) },
  returns: v.null(),
  handler: async (ctx, { founderId, status, deck, teaser }) => {
    const kit = await ctx.db.query("kits").withIndex("by_founderId", (q) => q.eq("founderId", founderId)).first();
    if (!kit) return null;
    await ctx.db.patch("kits", kit._id, { status, ...(deck ? { deck } : {}), ...(teaser ? { teaser } : {}) });
    if (status === "ready") await ctx.db.insert("steps", { step: "kit_ready" });
    return null;
  },
});

export const logStep = internalMutation({
  args: { step: v.string() },
  returns: v.null(),
  handler: async (ctx, { step }) => {
    await ctx.db.insert("steps", { step });
    return null;
  },
});

/** Her top 5 investors whose logo we haven't looked for yet (their own websites only). */
export const topForLogos = internalQuery({
  args: { token: v.string() },
  returns: v.array(v.object({ id: v.id("investors"), website: v.string() })),
  handler: async (ctx, { token }) => {
    const f = await founderByToken(ctx, token);
    if (!f) return [];
    const ms = await ctx.db.query("matches").withIndex("by_founder_and_rank", (q) => q.eq("founderId", f._id).lt("rank", 5)).take(5);
    const out = [];
    for (const m of ms) {
      const inv = await ctx.db.get("investors", m.investorId);
      if (inv && inv.website && !inv.logoChecked && !inv.retired) out.push({ id: inv._id, website: inv.website });
    }
    return out;
  },
});

export const saveLogo = internalMutation({
  args: { id: v.id("investors"), logo: v.union(v.string(), v.null()) },
  returns: v.null(),
  handler: async (ctx, { id, logo }) => {
    await ctx.db.patch("investors", id, { logo: logo ?? undefined, logoChecked: Date.now() });
    return null;
  },
});

/** Owner only, from the terminal: remove a test founder and everything made for her, and give back the invite use.
 *  npx convex run [--prod] kit:removeTestFounder '{"founderId":"...","since":<ms>}'  (since: also drop funnel steps logged after it) */
export const removeTestFounder = internalMutation({
  args: { founderId: v.id("founders"), since: v.optional(v.number()) },
  returns: v.object({ removed: v.number() }),
  handler: async (ctx, { founderId, since }) => {
    const f = await ctx.db.get("founders", founderId);
    if (!f) return { removed: 0 };
    let n = 0;
    const del = async (rows: { _id: string }[], table: "matches" | "drafts" | "kits" | "followups" | "upgradeRequests" | "notifications" | "aiCalls") => {
      for (const r of rows) { await ctx.db.delete(table, r._id as never); n++; }
    };
    await del(await ctx.db.query("matches").withIndex("by_founder_and_rank", (q) => q.eq("founderId", founderId)).take(200), "matches");
    await del(await ctx.db.query("drafts").withIndex("by_founder_and_investor", (q) => q.eq("founderId", founderId)).take(200), "drafts");
    await del(await ctx.db.query("kits").withIndex("by_founderId", (q) => q.eq("founderId", founderId)).take(5), "kits");
    await del(await ctx.db.query("followups").withIndex("by_founder_and_state", (q) => q.eq("founderId", founderId)).take(200), "followups");
    await del(await ctx.db.query("upgradeRequests").withIndex("by_founderId", (q) => q.eq("founderId", founderId)).take(5), "upgradeRequests");
    await del(await ctx.db.query("notifications").withIndex("by_founder", (q) => q.eq("founderId", founderId)).take(20), "notifications");
    if (since) {
      for (const c of await ctx.db.query("aiCalls").withIndex("by_creation_time", (q) => q.gt("_creationTime", since)).take(200)) if (!c.founderId || c.founderId === founderId) { await ctx.db.delete("aiCalls", c._id); n++; }
      for (const s of await ctx.db.query("steps").withIndex("by_creation_time", (q) => q.gt("_creationTime", since)).take(200)) { await ctx.db.delete("steps", s._id); n++; }
    }
    const code = await ctx.db.query("inviteCodes").withIndex("by_code", (q) => q.eq("code", f.inviteCode)).unique();
    if (code && code.uses > 0) await ctx.db.patch("inviteCodes", code._id, { uses: code.uses - 1 });
    await ctx.db.delete("founders", founderId);
    return { removed: n + 1 };
  },
});

/** "Rate your kit": the one-tap usefulness score and the 60-second form. Merges into one row per founder. */
export const rate = mutation({
  args: { token: v.string(), useful: v.optional(v.number()), solves: v.optional(v.number()), valuable: v.optional(v.number()), liked: v.optional(v.string()), missing: v.optional(v.string()) },
  returns: v.union(v.object({ ok: v.literal(true) }), v.object({ ok: v.literal(false), error: v.string() })),
  handler: async (ctx, a) => {
    const f = await founderByToken(ctx, a.token);
    if (!f) return { ok: false as const, error: "Please reload the page and try again." };
    if (!(await limits.limit(ctx, "feedbackPerVisitor", { key: a.token })).ok) return { ok: false as const, error: "Thanks! That's plenty for now." };
    const r = (n?: number) => (n === undefined ? undefined : Math.min(5, Math.max(1, Math.round(n))));
    const row = { useful: r(a.useful), solves: r(a.solves), valuable: r(a.valuable), liked: short(a.liked, 600) || undefined, missing: short(a.missing, 600) || undefined };
    const clean = Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));
    const existing = await ctx.db.query("kitRatings").withIndex("by_founderId", (q) => q.eq("founderId", f._id)).first();
    if (existing) await ctx.db.patch("kitRatings", existing._id, clean);
    else { await ctx.db.insert("kitRatings", { founderId: f._id, ...clean }); await ctx.db.insert("steps", { step: "kit_rated" }); }
    return { ok: true as const };
  },
});

const fixV = v.object({ slide: v.string(), issue: v.string(), fix: v.string(), impact: v.union(v.literal("high"), v.literal("medium"), v.literal("low")) });
const testV = v.object({ question: v.string(), risk: v.union(v.literal("high"), v.literal("medium"), v.literal("low")), howToAnswer: v.string() });
const verdictV = v.union(v.literal("raise_now"), v.literal("raise_with_fixes"), v.literal("build_traction_first"));

export const saveReview = internalMutation({
  args: { founderId: v.optional(v.id("founders")), token: v.optional(v.string()), fileName: v.string(), score: v.number(), verdict: verdictV, verdictWhy: v.string(), strengths: v.array(v.string()), fixes: v.array(fixV), missing: v.array(v.string()), thesis: v.object({ claim: v.string(), tests: v.array(testV) }), questions: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, a) => {
    await ctx.db.insert("deckReviews", a);
    await ctx.db.insert("steps", { step: "deck_reviewed" });
    return null;
  },
});

/** Her latest deck review: from her account once she's signed in, or from this browser before that (deck-first).
 *  Free: the score, verdict, strengths and top 3 fixes; the rest with full access (counts shown). */
export const myReview = query({
  args: { token: v.string() },
  returns: v.union(v.null(), v.object({
    at: v.number(), fileName: v.string(), score: v.number(), verdict: verdictV, verdictWhy: v.string(), strengths: v.array(v.string()),
    fixes: v.array(fixV), missing: v.array(v.string()), thesis: v.union(v.null(), v.object({ claim: v.string(), tests: v.array(testV) })), questions: v.array(v.string()),
    locked: v.object({ fixes: v.number(), missing: v.number(), tests: v.number(), questions: v.number() }),
  })),
  handler: async (ctx, { token }) => {
    if (!TOKEN.test(token)) return null;
    const f = await founderByToken(ctx, token);
    if (f?.userId && !(await isUnlocked(ctx, f))) return null; // saved to an account: only that account
    const byFounder = f ? await ctx.db.query("deckReviews").withIndex("by_founderId", (q) => q.eq("founderId", f._id)).order("desc").first() : null;
    const r = byFounder ?? (await ctx.db.query("deckReviews").withIndex("by_token", (q) => q.eq("token", token)).order("desc").first());
    if (!r) return null;
    const full = f?.plan === "round_pass";
    return {
      at: r._creationTime, fileName: r.fileName, score: r.score, verdict: r.verdict, verdictWhy: r.verdictWhy, strengths: r.strengths,
      fixes: full ? r.fixes : r.fixes.slice(0, 3), missing: full ? r.missing : [], thesis: full ? r.thesis : { claim: r.thesis.claim, tests: r.thesis.tests.slice(0, 1) },
      questions: full ? r.questions : [],
      locked: full ? { fixes: 0, missing: 0, tests: 0, questions: 0 } : { fixes: Math.max(0, r.fixes.length - 3), missing: r.missing.length, tests: Math.max(0, r.thesis.tests.length - 1), questions: r.questions.length },
    };
  },
});
