/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import rateLimiter from "@convex-dev/rate-limiter/test";

const modules = import.meta.glob("./**/*.ts");
const tokenA = "a".repeat(48);
const tokenB = "b".repeat(48);
const profile = { website: "ledgerly.example.in", linkedin: "", oneLiner: "Ledgerly helps CA firms file GST returns 3x faster by reading bank statements with AI.", founderLine: "I'm Nisha; I ran a 40-client CA practice for five years." };
// Made-up founder.
const nisha = { inviteCode: "TEST-ONE", company: "Ledgerly", name: "Nisha Kulkarni", sectors: ["AI"], stage: "Seed", ask: "₹1–3 Cr" };

async function setup() {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  await t.mutation(internal.invites.createCode, { code: "TEST-ONE", label: "test", maxUses: 1 });
  return t;
}

describe("founder sign-up", () => {
  test("needs a working invite code, and uses it up", async () => {
    const t = await setup();
    expect(await t.mutation(api.founders.start, { ...nisha, token: tokenA })).toEqual({ ok: true });
    const second = await t.mutation(api.founders.start, { ...nisha, token: tokenB });
    expect(second.ok).toBe(false); // the one use is gone
    // the same founder can come back and change her details without a new code
    expect(await t.mutation(api.founders.start, { ...nisha, token: tokenA, stage: "Pre-seed" })).toEqual({ ok: true });
  });

  test("fixes all-lower-case names, keeps ones she capitalised", async () => {
    const t = await setup();
    await t.mutation(api.founders.start, { ...nisha, token: tokenA, company: "monsoon grid", name: "priya menon" });
    const me = await t.query(api.founders.me, { token: tokenA });
    expect([me?.company, me?.name]).toEqual(["Monsoon Grid", "Priya Menon"]);
    await t.mutation(api.founders.start, { ...nisha, token: tokenA, company: "iCAN Labs", name: "Priya Menon" });
    expect((await t.query(api.founders.me, { token: tokenA }))?.company).toBe("iCAN Labs");
  });

  test("rejects bad tokens, unknown sectors and stages", async () => {
    const t = await setup();
    expect((await t.mutation(api.founders.start, { ...nisha, token: "short" })).ok).toBe(false);
    expect((await t.mutation(api.founders.start, { ...nisha, token: tokenA, sectors: ["Crypto"] })).ok).toBe(false);
    expect((await t.mutation(api.founders.start, { ...nisha, token: tokenA, stage: "Series Z" })).ok).toBe(false);
  });

  test("a founder only sees her own data", async () => {
    const t = await setup();
    await t.mutation(api.founders.start, { ...nisha, token: tokenA });
    expect((await t.query(api.founders.me, { token: tokenA }))?.company).toBe("Ledgerly");
    expect(await t.query(api.founders.me, { token: tokenB })).toBeNull();
    const p = await t.mutation(api.founders.saveProfile, { ...profile, token: tokenB });
    expect(p.ok).toBe(false);
  });

  test("saves the profile used in every email, and checks her links", async () => {
    const t = await setup();
    await t.mutation(api.founders.start, { ...nisha, token: tokenA });
    expect((await t.mutation(api.founders.saveProfile, { ...profile, token: tokenA, website: "not a site" })).ok).toBe(false);
    expect((await t.mutation(api.founders.saveProfile, { ...profile, token: tokenA, linkedin: "linkedin.com/feed" })).ok).toBe(false);
    expect(await t.mutation(api.founders.saveProfile, { ...profile, token: tokenA })).toEqual({ ok: true });
    const me = await t.query(api.founders.me, { token: tokenA });
    expect(me?.hasProfile).toBe(true);
    expect(me?.website).toBe("https://ledgerly.example.in");
  });

  test("names and emails beyond her top 3 stay hidden until she signs in", async () => {
    const t = await setup();
    await t.mutation(api.founders.start, { ...nisha, token: tokenA });
    const { founderId, userId, otherId } = await t.run(async (ctx) => {
      const f = (await ctx.db.query("founders").first())!;
      for (let rank = 0; rank < 5; rank++) {
        const investorId = await ctx.db.insert("investors", { seedId: `x${rank}`, kind: "fund", displayName: `Made-up Fund ${rank}`, email: `hello@fund${rank}.example`, sectors: ["ai"], stages: ["seed"], portfolio: [], recent: [], sourceUrls: [] });
        await ctx.db.insert("matches", { founderId: f._id, investorId, rank, score: 90 - rank });
      }
      return { founderId: f._id, userId: await ctx.db.insert("users", { email: "nisha@ledgerly.example.in" }), otherId: await ctx.db.insert("users", { email: "someone@else.example" }) };
    });
    const locked = (await t.query(api.founders.me, { token: tokenA }))!;
    expect(locked.unlocked).toBe(false);
    expect(locked.rows[2].displayName).toBe("Made-up Fund 2");
    expect(locked.rows[3].displayName).toBeNull();
    expect(locked.rows[3].email).toBeNull();

    const nishaIn = t.withIdentity({ subject: `${userId}|s1` });
    expect(await nishaIn.mutation(api.founders.claim, { token: tokenA })).toEqual({ ok: true });
    const open = (await nishaIn.query(api.founders.me, { token: tokenA }))!;
    expect(open.unlocked).toBe(true);
    expect(open.rows[4].displayName).toBe("Made-up Fund 4");
    expect(open.rows[4].email).toBeNull(); // revealed only once she asks for that investor's email
    await t.run(async (ctx) => {
      const m = (await ctx.db.query("matches").withIndex("by_founder_and_rank", (q) => q.eq("founderId", founderId).eq("rank", 4)).unique())!;
      await ctx.db.insert("drafts", { founderId, investorId: m.investorId, kind: "first", reason: "r", whyFit: [], watchOut: [], subject: "s", body: "b", warnings: [] });
    });
    expect((await nishaIn.query(api.founders.me, { token: tokenA }))!.rows[4].email).toBe("hello@fund4.example");

    // someone else signed in with her token still can't open or take her list
    const other = t.withIdentity({ subject: `${otherId}|s2` });
    expect((await other.query(api.founders.me, { token: tokenA }))!.rows[3].displayName).toBeNull();
    expect((await other.mutation(api.founders.claim, { token: tokenA })).ok).toBe(false);
    expect((await t.run((ctx) => ctx.db.get("founders", founderId)))!.userId).toBe(userId);
  });
});
