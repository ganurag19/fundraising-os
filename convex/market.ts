import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { SECTOR_KEYS } from "./lib/match";
import { roundLabel } from "./lib/links";
import { founderByToken, isUnlocked, KIT_NAMED, maskName } from "./founders";

// Her market and competition (16 Oct): who else is building, recent funding rounds in her space (India and global,
// each with its source) and, from our own records, who funded companies in her sector. Free shows a part of it.

const FREE = { competitors: 3, deals: 5, trends: 1 };
const where = v.union(v.literal("india"), v.literal("global"));
const competitorV = v.object({ name: v.string(), what: v.string(), where, funding: v.optional(v.string()), website: v.optional(v.string()), logo: v.optional(v.string()), source: v.string() });
const dealV = v.object({ company: v.string(), what: v.optional(v.string()), amount: v.string(), round: v.string(), date: v.string(), investors: v.array(v.string()), where, atStage: v.boolean(), source: v.string() });
const trendV = v.object({ line: v.string(), source: v.string() });

export const mine = query({
  args: { token: v.string() },
  returns: v.union(v.null(), v.object({
    status: v.union(v.literal("none"), v.literal("running"), v.literal("ready"), v.literal("failed")),
    summary: v.union(v.string(), v.null()),
    competitors: v.array(competitorV), deals: v.array(dealV), trends: v.array(trendV),
    locked: v.object({ competitors: v.number(), deals: v.number(), trends: v.number() }),
    // From our investor records: companies in her sector that investors on her list backed.
    ours: v.array(v.object({ company: v.string(), year: v.union(v.number(), v.null()), round: v.union(v.string(), v.null()), investors: v.array(v.string()) })),
  })),
  handler: async (ctx, { token }) => {
    const f = await founderByToken(ctx, token);
    if (!f) return null;
    const unlocked = await isUnlocked(ctx, f);
    if (f.userId && !unlocked) return null; // saved to an account: only that account
    const m = await ctx.db.query("markets").withIndex("by_founderId", (q) => q.eq("founderId", f._id)).first();
    const full = f.plan === "round_pass";
    const wanted = f.sectors.map((s) => SECTOR_KEYS[s]).filter(Boolean);
    const byCompany = new Map<string, { company: string; year: number | null; round: string | null; investors: string[] }>();
    const matches = await ctx.db.query("matches").withIndex("by_founder_and_rank", (q) => q.eq("founderId", f._id)).take(60);
    for (const x of matches) {
      const inv = await ctx.db.get("investors", x.investorId);
      if (!inv || inv.retired) continue;
      const name = full || x.rank < KIT_NAMED ? inv.displayName : maskName(inv.displayName);
      for (const r of inv.recent) {
        if (!r.sector || !wanted.includes(r.sector)) continue;
        const key = r.company.toLowerCase();
        const cur = byCompany.get(key) ?? { company: r.company, year: r.year ?? null, round: r.round ? roundLabel(r.round) : null, investors: [] };
        if (!cur.investors.includes(name) && cur.investors.length < 4) cur.investors.push(name);
        if ((r.year ?? 0) > (cur.year ?? 0)) cur.year = r.year ?? null;
        byCompany.set(key, cur);
      }
    }
    const ours = [...byCompany.values()].sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || b.investors.length - a.investors.length).slice(0, full ? 20 : 8);
    if (!m) return { status: "none" as const, summary: null, competitors: [], deals: [], trends: [], locked: { competitors: 0, deals: 0, trends: 0 }, ours };
    const cut = <T,>(xs: T[], n: number) => (full ? xs : xs.slice(0, n));
    return {
      status: m.status, summary: m.summary ?? null,
      competitors: cut(m.competitors, FREE.competitors), deals: cut(m.deals, FREE.deals), trends: cut(m.trends, FREE.trends),
      locked: full ? { competitors: 0, deals: 0, trends: 0 } : { competitors: Math.max(0, m.competitors.length - FREE.competitors), deals: Math.max(0, m.deals.length - FREE.deals), trends: Math.max(0, m.trends.length - FREE.trends) },
      ours,
    };
  },
});

/** What the research needs: her facts. Null if the token isn't hers to use. */
export const forResearch = internalQuery({
  args: { token: v.optional(v.string()), founderId: v.optional(v.id("founders")), userId: v.optional(v.id("users")) },
  returns: v.any(),
  handler: async (ctx, { token, founderId, userId }) => {
    const f = founderId ? await ctx.db.get("founders", founderId) : token ? await founderByToken(ctx, token) : null;
    if (!f) return null;
    if (token && f.userId && f.userId !== userId) return null; // a claimed kit: only its signed-in owner
    const kit = await ctx.db.query("kits").withIndex("by_founderId", (q) => q.eq("founderId", f._id)).first();
    if (!kit) return null;
    const m = await ctx.db.query("markets").withIndex("by_founderId", (q) => q.eq("founderId", f._id)).first();
    return { founder: f, kit, market: m ? { status: m.status, at: m._creationTime } : null };
  },
});

/** Marks a run as started. False if one is already running. */
export const start = internalMutation({
  args: { founderId: v.id("founders") },
  returns: v.boolean(),
  handler: async (ctx, { founderId }) => {
    const m = await ctx.db.query("markets").withIndex("by_founderId", (q) => q.eq("founderId", founderId)).first();
    if (m?.status === "running") return false;
    if (m) await ctx.db.patch("markets", m._id, { status: "running" });
    else await ctx.db.insert("markets", { founderId, status: "running", competitors: [], deals: [], trends: [] });
    return true;
  },
});

export const save = internalMutation({
  args: { founderId: v.id("founders"), ok: v.boolean(), summary: v.optional(v.string()), competitors: v.optional(v.array(competitorV)), deals: v.optional(v.array(dealV)), trends: v.optional(v.array(trendV)), searches: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, a) => {
    const m = await ctx.db.query("markets").withIndex("by_founderId", (q) => q.eq("founderId", a.founderId)).first();
    if (!m) return null;
    if (!a.ok) {
      // A failed rerun keeps what she had.
      await ctx.db.patch("markets", m._id, { status: m.competitors.length || m.deals.length ? "ready" : "failed" });
      return null;
    }
    await ctx.db.patch("markets", m._id, { status: "ready", summary: a.summary, competitors: a.competitors ?? [], deals: a.deals ?? [], trends: a.trends ?? [], searches: a.searches });
    return null;
  },
});
