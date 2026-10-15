import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { founderByToken, isUnlocked } from "./founders";
import { freeSlug } from "./kit";
import { send } from "./notify";
import { limits } from "./limits";

// Her pitch room (16 Oct): firstcheq.ai/p/<slug>. Anyone with the link sees her name and one-liner and can ask for
// access with their name and email; she approves or declines in her dashboard. Only an approved browser (its viewer
// code) sees the deck and teaser. Every view, slide and "ask to meet" is counted for her. Nothing is sent to investors.

const VIEWER = /^[a-f0-9]{48}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const short = (s: string | undefined, max: number) => (s ?? "").trim().slice(0, max);
const site = () => process.env.SITE_URL ?? "https://www.firstcheq.ai";

const slideV = v.object({ key: v.string(), headline: v.string(), points: v.array(v.string()), metrics: v.array(v.object({ value: v.string(), label: v.string() })) });
const brandV = v.object({ primary: v.string(), accent: v.optional(v.string()), logo: v.optional(v.string()), font: v.optional(v.string()), fontCss: v.optional(v.string()) });

/** The room as a visitor sees it. The deck and teaser only once this browser's request is approved. */
export const page = query({
  args: { slug: v.string(), viewer: v.string() },
  returns: v.union(v.null(), v.object({
    company: v.string(), founder: v.string(), oneLiner: v.string(), stage: v.string(), ask: v.string(), website: v.union(v.string(), v.null()), brand: brandV,
    state: v.union(v.literal("none"), v.literal("pending"), v.literal("approved"), v.literal("declined")),
    content: v.union(v.null(), v.object({
      slides: v.array(slideV), teaser: v.union(v.null(), v.object({ summary: v.string(), highlights: v.array(v.string()) })),
      team: v.array(v.object({ name: v.string(), role: v.string(), line: v.string() })), traction: v.union(v.string(), v.null()), met: v.boolean(),
    })),
  })),
  handler: async (ctx, { slug, viewer }) => {
    const kit = await ctx.db.query("kits").withIndex("by_slug", (q) => q.eq("slug", slug.toLowerCase())).first();
    if (!kit) return null;
    const f = await ctx.db.get("founders", kit.founderId);
    if (!f) return null;
    const req = VIEWER.test(viewer) ? await ctx.db.query("roomRequests").withIndex("by_viewer_and_kitId", (q) => q.eq("viewer", viewer).eq("kitId", kit._id)).first() : null;
    const state = req?.status ?? ("none" as const);
    let content = null;
    if (req && req.status === "approved") {
      const met = !!(await ctx.db.query("roomEvents").withIndex("by_requestId", (q) => q.eq("requestId", req._id)).take(200)).find((e) => e.kind === "meet");
      content = { slides: kit.deck ?? [], teaser: kit.teaser ?? null, team: kit.facts.team, traction: f.traction ?? null, met };
    }
    return {
      company: f.company, founder: f.name, oneLiner: f.oneLiner ?? "", stage: f.stage, ask: f.ask, website: f.website ?? null,
      brand: kit.brand, state, content,
    };
  },
});

/** "Request access": name, email and firm. One request per browser per room; asking again updates it. */
export const ask = mutation({
  args: { slug: v.string(), viewer: v.string(), name: v.string(), email: v.string(), firm: v.string() },
  returns: v.union(v.object({ ok: v.literal(true) }), v.object({ ok: v.literal(false), error: v.string() })),
  handler: async (ctx, a) => {
    if (!VIEWER.test(a.viewer)) return { ok: false as const, error: "Please reload the page and try again." };
    const name = short(a.name, 80), email = a.email.trim().toLowerCase(), firm = short(a.firm, 100);
    if (!name) return { ok: false as const, error: "Please add your name." };
    if (!EMAIL.test(email) || email.length > 200) return { ok: false as const, error: "Please add a valid work email." };
    const kit = await ctx.db.query("kits").withIndex("by_slug", (q) => q.eq("slug", a.slug.toLowerCase())).first();
    if (!kit) return { ok: false as const, error: "This room doesn't exist any more." };
    if (!(await limits.limit(ctx, "roomRequestsPerViewer", { key: a.viewer })).ok || !(await limits.limit(ctx, "roomRequestsGlobal")).ok) return { ok: false as const, error: "Too many requests right now. Try again in a few minutes." };
    const existing = await ctx.db.query("roomRequests").withIndex("by_viewer_and_kitId", (q) => q.eq("viewer", a.viewer).eq("kitId", kit._id)).first();
    if (existing) {
      if (existing.status !== "pending") return { ok: true as const };
      await ctx.db.patch("roomRequests", existing._id, { name, email, firm: firm || undefined });
      return { ok: true as const };
    }
    const id = await ctx.db.insert("roomRequests", { kitId: kit._id, viewer: a.viewer, name, email, firm: firm || undefined, status: "pending" });
    await ctx.db.insert("steps", { step: "room_access_requested" });
    await ctx.scheduler.runAfter(0, internal.room.tellFounder, { requestId: id });
    return { ok: true as const };
  },
});

/** An approved visitor opened the room, read a slide, opened the teaser, or asked to meet. */
export const track = mutation({
  args: { slug: v.string(), viewer: v.string(), kind: v.union(v.literal("view"), v.literal("slide"), v.literal("teaser"), v.literal("meet")), slide: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, a) => {
    if (!VIEWER.test(a.viewer)) return null;
    const kit = await ctx.db.query("kits").withIndex("by_slug", (q) => q.eq("slug", a.slug.toLowerCase())).first();
    if (!kit) return null;
    const req = await ctx.db.query("roomRequests").withIndex("by_viewer_and_kitId", (q) => q.eq("viewer", a.viewer).eq("kitId", kit._id)).first();
    if (!req || req.status !== "approved") return null;
    if (!(await limits.limit(ctx, "roomEventsPerViewer", { key: a.viewer })).ok) return null;
    await ctx.db.insert("roomEvents", { kitId: kit._id, requestId: req._id, kind: a.kind, slide: a.kind === "slide" ? Math.max(0, Math.min(20, Math.floor(a.slide ?? 0))) : undefined });
    if (a.kind === "meet") await ctx.scheduler.runAfter(0, internal.room.tellFounder, { requestId: req._id, meet: true });
    return null;
  },
});

/** Her side: the room's address (made on first visit), the numbers, and every request with what that investor did. */
export const mine = query({
  args: { token: v.string() },
  returns: v.union(v.null(), v.object({
    slug: v.union(v.string(), v.null()),
    stats: v.object({ views: v.number(), viewers: v.number(), slides: v.number(), meets: v.number(), pending: v.number() }),
    requests: v.array(v.object({
      id: v.id("roomRequests"), at: v.number(), name: v.string(), email: v.string(), firm: v.union(v.string(), v.null()),
      status: v.string(), views: v.number(), slidesSeen: v.number(), teaser: v.boolean(), meet: v.boolean(), lastSeen: v.union(v.number(), v.null()),
    })),
  })),
  handler: async (ctx, { token }) => {
    const f = await founderByToken(ctx, token);
    if (!f || !(await isUnlocked(ctx, f))) return null;
    const kit = await ctx.db.query("kits").withIndex("by_founderId", (q) => q.eq("founderId", f._id)).first();
    if (!kit) return null;
    const reqs = await ctx.db.query("roomRequests").withIndex("by_kitId", (q) => q.eq("kitId", kit._id)).order("desc").take(200);
    const events = await ctx.db.query("roomEvents").withIndex("by_kitId", (q) => q.eq("kitId", kit._id)).order("desc").take(3000);
    const requests = reqs.map((r) => {
      const mine = events.filter((e) => e.requestId === r._id);
      return {
        id: r._id, at: r._creationTime, name: r.name, email: r.email, firm: r.firm ?? null, status: r.status,
        views: mine.filter((e) => e.kind === "view").length, slidesSeen: new Set(mine.filter((e) => e.kind === "slide").map((e) => e.slide)).size,
        teaser: mine.some((e) => e.kind === "teaser"), meet: mine.some((e) => e.kind === "meet"), lastSeen: mine[0]?._creationTime ?? null,
      };
    });
    return {
      slug: kit.slug ?? null,
      stats: {
        views: events.filter((e) => e.kind === "view").length, viewers: new Set(events.filter((e) => e.kind === "view").map((e) => e.requestId)).size,
        slides: events.filter((e) => e.kind === "slide").length, meets: new Set(events.filter((e) => e.kind === "meet").map((e) => e.requestId)).size,
        pending: reqs.filter((r) => r.status === "pending").length,
      },
      requests,
    };
  },
});

/** Kits made before rooms existed get their address the first time she opens her pitch profile. */
export const ensureSlug = mutation({
  args: { token: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { token }) => {
    const f = await founderByToken(ctx, token);
    if (!f || !(await isUnlocked(ctx, f))) return null;
    const kit = await ctx.db.query("kits").withIndex("by_founderId", (q) => q.eq("founderId", f._id)).first();
    if (!kit) return null;
    if (kit.slug) return kit.slug;
    const slug = await freeSlug(ctx, f.company);
    await ctx.db.patch("kits", kit._id, { slug });
    return slug;
  },
});

/** She approves or declines a request. Only the signed-in owner of the kit. */
export const decide = mutation({
  args: { token: v.string(), id: v.id("roomRequests"), status: v.union(v.literal("approved"), v.literal("declined"), v.literal("pending")) },
  returns: v.union(v.object({ ok: v.literal(true) }), v.object({ ok: v.literal(false), error: v.string() })),
  handler: async (ctx, { token, id, status }) => {
    const f = await founderByToken(ctx, token);
    if (!f || !(await isUnlocked(ctx, f))) return { ok: false as const, error: "Please sign in again." };
    const kit = await ctx.db.query("kits").withIndex("by_founderId", (q) => q.eq("founderId", f._id)).first();
    const req = await ctx.db.get("roomRequests", id);
    if (!kit || !req || req.kitId !== kit._id) return { ok: false as const, error: "We couldn't find that request." };
    await ctx.db.patch("roomRequests", id, { status, decidedAt: Date.now() });
    if (status === "approved") await ctx.db.insert("steps", { step: "room_access_approved" });
    return { ok: true as const };
  },
});

/* ---------- Email to her (never to investors) when someone asks for access, or asks to meet ---------- */

export const forTell = internalQuery({
  args: { requestId: v.id("roomRequests") },
  returns: v.any(),
  handler: async (ctx, { requestId }) => {
    const r = await ctx.db.get("roomRequests", requestId);
    const kit = r ? await ctx.db.get("kits", r.kitId) : null;
    const f = kit ? await ctx.db.get("founders", kit.founderId) : null;
    const user = f?.userId ? await ctx.db.get("users", f.userId) : null;
    if (!r || !f || !user?.email || f.emailReminders === false) return null;
    return { founderId: f._id, to: user.email, name: f.name, company: f.company, who: r.name, firm: r.firm ?? null };
  },
});

export const tellFounder = internalAction({
  args: { requestId: v.id("roomRequests"), meet: v.optional(v.boolean()) },
  returns: v.null(),
  handler: async (ctx, { requestId, meet }): Promise<null> => {
    const t: { founderId: Id<"founders">; to: string; name: string; company: string; who: string; firm: string | null } | null = await ctx.runQuery(internal.room.forTell, { requestId });
    if (!t) return null;
    const who = t.firm ? `${t.who} (${t.firm})` : t.who;
    const first = t.name.split(" ")[0];
    const error = await send(t.to, meet ? `${who} wants to meet` : `${who} asked to see ${t.company}'s pitch`, meet
      ? [`Hi ${first},`, `${who} opened ${t.company}'s pitch room and asked to meet. Reply to them from your own email; we don't contact investors for you.`]
      : [`Hi ${first},`, `${who} asked for access to ${t.company}'s pitch room. Approve them and they'll see your deck and teaser; you'll see every view.`],
      { label: meet ? "See who's warm" : "Approve or decline", url: `${site()}/app` });
    await ctx.runMutation(internal.notify.log, { founderId: t.founderId, kind: "room_request", error });
    return null;
  },
});

/** One-off, from the terminal: give every kit made before rooms existed its address. npx convex run [--prod] room:backfillSlugs */
export const backfillSlugs = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    let n = 0;
    for (const kit of await ctx.db.query("kits").take(500)) {
      if (kit.slug) continue;
      const f = await ctx.db.get("founders", kit.founderId);
      await ctx.db.patch("kits", kit._id, { slug: await freeSlug(ctx, f?.company ?? "startup") });
      n++;
    }
    return n;
  },
});
