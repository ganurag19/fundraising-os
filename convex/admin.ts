import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { limits } from "./limits";

// The owner's private dashboard at /admin. Two locks, both checked here on the server:
// signed in with Google as ADMIN_EMAIL, and ADMIN_PIN (5 tries an hour). An unlock lasts 12 hours.

const SESSION_MS = 12 * 60 * 60 * 1000;
const no = (error: string) => ({ ok: false as const, error });

async function isOwner(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  const owner = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!owner) return false;
  const user = await ctx.db.get("users", userId);
  return !!user?.email && user.email.trim().toLowerCase() === owner;
}

/** Compares every character, so the time taken doesn't hint at how much of the PIN was right. */
function sameText(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** Signed-in owner, valid unlock key: her user id. Anyone else: null. */
async function ownerFromKey(ctx: QueryCtx, key: string) {
  const userId = await getAuthUserId(ctx);
  if (!userId || !/^[a-f0-9]{64}$/.test(key)) return null;
  const s = await ctx.db.query("adminSessions").withIndex("by_key", (q) => q.eq("key", key)).unique();
  if (!s || s.userId !== userId || !(await isOwner(ctx, userId))) return null;
  return userId;
}

/** Who is signed in, so the page knows whether to ask for Google or for the PIN. Says nothing about the data. */
export const whoAmI = query({
  args: {},
  returns: v.union(v.literal("signed_out"), v.literal("not_owner"), v.literal("owner")),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return "signed_out" as const;
    return (await isOwner(ctx, userId)) ? ("owner" as const) : ("not_owner" as const);
  },
});

export const unlock = mutation({
  args: { pin: v.string() },
  returns: v.union(v.object({ ok: v.literal(true), key: v.string() }), v.object({ ok: v.literal(false), error: v.string() })),
  handler: async (ctx, { pin }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return no("Sign in first.");
    if (!(await isOwner(ctx, userId))) return no("Not allowed.");
    const expected = process.env.ADMIN_PIN ?? "";
    if (expected.length < 6) return no("The PIN isn't set up yet.");
    if (!(await limits.limit(ctx, "adminPinTries", { key: userId })).ok) return no("Too many tries. Try again in an hour.");
    if (!sameText(pin.trim(), expected)) return no("Wrong PIN.");
    await limits.reset(ctx, "adminPinTries", { key: userId });
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const key = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const id = await ctx.db.insert("adminSessions", { key, userId });
    await ctx.scheduler.runAfter(SESSION_MS, internal.admin.expire, { id });
    return { ok: true as const, key };
  },
});

export const expire = internalMutation({
  args: { id: v.id("adminSessions") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    if (await ctx.db.get("adminSessions", id)) await ctx.db.delete("adminSessions", id);
    return null;
  },
});

const count = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const CAP = 6000;

/** Visits, clicks and sign-up steps since a time, as counts. */
export const funnel = query({
  args: { key: v.string(), since: v.number() },
  returns: v.union(v.null(), v.object({
    events: v.record(v.string(), v.object({ n: v.number(), people: v.number() })),
    steps: v.record(v.string(), v.number()),
    visitors: v.number(),
    capped: v.boolean(),
  })),
  handler: async (ctx, { key, since }) => {
    if (!(await ownerFromKey(ctx, key))) return null;
    const ev = await ctx.db.query("events").withIndex("by_creation_time", (q) => q.gt("_creationTime", since)).order("desc").take(CAP);
    const st = await ctx.db.query("steps").withIndex("by_creation_time", (q) => q.gt("_creationTime", since)).order("desc").take(CAP);
    const byName = new Map<string, { n: number; who: Set<string> }>();
    const all = new Set<string>();
    for (const e of ev) {
      const b = byName.get(e.name) ?? { n: 0, who: new Set<string>() };
      b.n++; b.who.add(e.visitor); byName.set(e.name, b);
      all.add(e.visitor);
    }
    const steps = new Map<string, number>();
    for (const s of st) count(steps, s.step);
    return {
      events: Object.fromEntries([...byName].map(([k, b]) => [k, { n: b.n, people: b.who.size }])),
      steps: Object.fromEntries(steps),
      visitors: all.size,
      capped: ev.length === CAP || st.length === CAP,
    };
  },
});

/** The founders who started since a time, newest first, with how far each got. */
export const people = query({
  args: { key: v.string(), since: v.number() },
  returns: v.union(v.null(), v.array(v.object({
    at: v.number(), company: v.string(), name: v.string(), sectors: v.array(v.string()), stage: v.string(), ask: v.string(),
    website: v.union(v.string(), v.null()), linkedin: v.union(v.string(), v.null()), code: v.string(),
    emails: v.string(), signedIn: v.union(v.string(), v.null()), sent: v.number(), plan: v.boolean(),
  }))),
  handler: async (ctx, { key, since }) => {
    if (!(await ownerFromKey(ctx, key))) return null;
    const fs = await ctx.db.query("founders").withIndex("by_creation_time", (q) => q.gt("_creationTime", since)).order("desc").take(60);
    return await Promise.all(fs.map(async (f) => {
      const user = f.userId ? await ctx.db.get("users", f.userId) : null;
      const ms = await ctx.db.query("matches").withIndex("by_founder_and_rank", (q) => q.eq("founderId", f._id)).take(100);
      return {
        at: f._creationTime, company: f.company, name: f.name, sectors: f.sectors, stage: f.stage, ask: f.ask,
        website: f.website ?? null, linkedin: f.linkedin ?? null, code: f.inviteCode,
        emails: f.emailsStatus, signedIn: user?.email ?? null, sent: ms.filter((m) => m.status).length, plan: f.plan === "round_pass",
      };
    }));
  },
});

/** Invite requests, founding-list and access requests, invite codes, and AI health since a time. */
export const forms = query({
  args: { key: v.string(), since: v.number() },
  returns: v.union(v.null(), v.object({
    invites: v.array(v.object({ at: v.number(), name: v.string(), email: v.string(), company: v.string(), stage: v.string(), status: v.string() })),
    interest: v.array(v.object({ at: v.number(), name: v.string(), email: v.string(), plan: v.string(), note: v.union(v.string(), v.null()) })),
    codes: v.array(v.object({ code: v.string(), label: v.string(), uses: v.number(), maxUses: v.number() })),
    feedback: v.array(v.object({ at: v.number(), page: v.string(), text: v.string(), email: v.union(v.string(), v.null()), company: v.union(v.string(), v.null()) })),
    pmf: v.object({ very: v.number(), somewhat: v.number(), not: v.number(), benefits: v.array(v.object({ answer: v.string(), text: v.string(), company: v.string() })) }),
    ai: v.object({ calls: v.number(), failed: v.number(), byPurpose: v.record(v.string(), v.number()), lastErrors: v.array(v.object({ at: v.number(), purpose: v.string(), error: v.string() })) }),
  })),
  handler: async (ctx, { key, since }) => {
    if (!(await ownerFromKey(ctx, key))) return null;
    const invites = await ctx.db.query("waitlist").withIndex("by_creation_time", (q) => q.gt("_creationTime", since)).order("desc").take(100);
    const interest = await ctx.db.query("passInterest").withIndex("by_creation_time", (q) => q.gt("_creationTime", since)).order("desc").take(100);
    const codes = await ctx.db.query("inviteCodes").take(50);
    const fit = await ctx.db.query("pmf").order("desc").take(500); // all time: the fit score needs every answer
    const notes = await ctx.db.query("feedback").withIndex("by_creation_time", (q) => q.gt("_creationTime", since)).order("desc").take(100);
    const calls = await ctx.db.query("aiCalls").withIndex("by_creation_time", (q) => q.gt("_creationTime", since)).order("desc").take(3000);
    const byPurpose = new Map<string, number>();
    for (const c of calls) count(byPurpose, c.purpose);
    const failed = calls.filter((c) => c.error);
    return {
      invites: invites.map((w) => ({ at: w._creationTime, name: w.name, email: w.email, company: w.company, stage: w.stage, status: w.status })),
      interest: interest.map((p) => ({ at: p._creationTime, name: p.name, email: p.email, plan: p.plan, note: p.note ?? null })),
      codes: codes.map((c) => ({ code: c.code, label: c.label, uses: c.uses, maxUses: c.maxUses })),
      pmf: {
        very: fit.filter((x) => x.answer === "very").length, somewhat: fit.filter((x) => x.answer === "somewhat").length, not: fit.filter((x) => x.answer === "not").length,
        benefits: await Promise.all(fit.filter((x) => x.benefit).slice(0, 40).map(async (x) => ({ answer: x.answer, text: x.benefit!, company: (await ctx.db.get("founders", x.founderId))?.company ?? "" }))),
      },
      feedback: notes.map((n) => ({ at: n._creationTime, page: n.page, text: n.text, email: n.email ?? null, company: n.company ?? null })),
      ai: { calls: calls.length, failed: failed.length, byPurpose: Object.fromEntries(byPurpose), lastErrors: failed.slice(0, 5).map((c) => ({ at: c._creationTime, purpose: c.purpose, error: (c.error ?? "").slice(0, 160) })) },
    };
  },
});
