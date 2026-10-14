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

  test("profile edits fix her name and lines, and check her links", async () => {
    const t = await setup();
    await t.mutation(api.founders.start, { ...nisha, token: tokenA });
    await t.mutation(api.founders.saveProfile, { ...profile, token: tokenA });
    const base = { token: tokenA, company: "ledgerly labs", name: "nisha k", website: "ledgerly.example.in", linkedin: "", oneLiner: "Ledgerly files GST returns 3x faster.", founderLine: "I'm Nisha.", traction: "8 CA firms on pilot" };
    expect((await t.mutation(api.founders.updateProfile, { ...base, website: "nope" })).ok).toBe(false);
    expect((await t.mutation(api.founders.updateProfile, { ...base, token: tokenB })).ok).toBe(false);
    expect(await t.mutation(api.founders.updateProfile, base)).toEqual({ ok: true });
    const me = (await t.query(api.founders.me, { token: tokenA }))!;
    expect([me.company, me.name, me.profile.traction]).toEqual(["Ledgerly Labs", "Nisha K", "8 CA firms on pilot"]);
  });

  test("founding list saves interest once per email and plan, and checks the email", async () => {
    const t = await setup();
    expect((await t.mutation(api.founders.joinList, { email: "nope", name: "Nisha", plan: "round_pass" })).ok).toBe(false);
    expect(await t.mutation(api.founders.joinList, { email: "Nisha@Ledgerly.example ", name: "Nisha", plan: "round_pass" })).toEqual({ ok: true });
    await t.mutation(api.founders.joinList, { email: "nisha@ledgerly.example", name: "Nisha", plan: "round_pass" });
    await t.mutation(api.founders.joinList, { email: "nisha@ledgerly.example", name: "Nisha", plan: "custom" });
    expect(await t.run((ctx) => ctx.db.query("passInterest").take(10))).toHaveLength(2);
  });

  test("Round Pass shows up to 100 investors; free shows 20", async () => {
    const t = await setup();
    await t.mutation(api.founders.start, { ...nisha, token: tokenA });
    const userId = await t.run(async (ctx) => {
      const f = (await ctx.db.query("founders").first())!;
      for (let rank = 0; rank < 30; rank++) {
        const investorId = await ctx.db.insert("investors", { seedId: `p${rank}`, kind: "vc", displayName: `Made-up Fund ${rank}`, email: `f${rank}@fund.example`, sectors: ["ai"], stages: ["seed"], portfolio: [], recent: [], sourceUrls: [] });
        await ctx.db.insert("matches", { founderId: f._id, investorId, rank, score: 90 });
      }
      const u = await ctx.db.insert("users", { email: "nisha@ledgerly.example" });
      await ctx.db.patch("founders", f._id, { userId: u });
      return u;
    });
    const me = () => t.withIdentity({ subject: `${userId}|s1` }).query(api.founders.me, { token: tokenA });
    expect((await me())!.rows).toHaveLength(20);
    expect(await t.mutation(internal.founders.grantPass, { email: "nisha@ledgerly.example", days: 120 })).toBeNull();
    expect((await me())!.rows).toHaveLength(30);
    expect((await me())!.plan).toBe("round_pass");
  });

  test("landing counts are by kind and skip retired investors", async () => {
    const t = await setup();
    await t.run(async (ctx) => {
      const base = { email: "x@fund.example", sectors: ["ai"], stages: ["seed"], portfolio: [], recent: [], sourceUrls: [] };
      await ctx.db.insert("investors", { ...base, seedId: "1", kind: "vc", displayName: "A" });
      await ctx.db.insert("investors", { ...base, seedId: "2", kind: "incubator", displayName: "B" });
      await ctx.db.insert("investors", { ...base, seedId: "3", kind: "vc", displayName: "C", retired: true });
    });
    const s = await t.query(api.founders.publicStats, {});
    expect([s.total, s.vc, s.incubator]).toEqual([2, 1, 1]);
  });
});

describe("a claimed list after sign-out", () => {
  test("hides its emails and profile from a signed-out browser, and myToken finds it for its owner", async () => {
    const t = await setup();
    await t.mutation(api.founders.start, { ...nisha, token: tokenA });
    await t.mutation(api.founders.saveProfile, { token: tokenA, ...profile, vision: "", revenue: "", customers: "", traction: "" });
    const userId = await t.run((ctx) => ctx.db.insert("users", { email: "nisha@example.test" }));
    const founderId = await t.run(async (ctx) => (await ctx.db.query("founders").withIndex("by_token", (q) => q.eq("token", tokenA)).unique())!._id);
    const inv = await t.run((ctx) => ctx.db.insert("investors", { seedId: "x1", kind: "vc", firm: "Made-up Fund", displayName: "Made-up Fund", email: "a@made-up.example", sectors: ["ai"], stages: ["seed"], portfolio: [], recent: [], sourceUrls: [] } as never));
    await t.run(async (ctx) => {
      await ctx.db.insert("matches", { founderId, investorId: inv, rank: 0, score: 90 });
      await ctx.db.insert("drafts", { founderId, investorId: inv, kind: "first", reason: "r", whyFit: [], watchOut: [], subject: "s", body: "b", warnings: [] });
    });
    expect((await t.query(api.founders.me, { token: tokenA }))?.rows[0].draft).not.toBeNull(); // before sign-in: her browser sees her top 3
    const owner = t.withIdentity({ subject: `${userId}|s1` });
    await owner.mutation(api.founders.claim, { token: tokenA });
    const signedOut = await t.query(api.founders.me, { token: tokenA });
    expect(signedOut?.claimed).toBe(true);
    expect(signedOut?.rows[0].draft).toBeNull();
    expect(signedOut?.rows[0].displayName).toBeNull();
    expect(signedOut?.profile.oneLiner).toBe("");
    expect((await owner.query(api.founders.myToken, {}))?.token).toBe(tokenA);
    expect(await t.query(api.founders.myToken, {})).toBeNull();
    expect((await owner.query(api.founders.me, { token: tokenA }))?.rows[0].draft).not.toBeNull();
  });
});

describe("a retired investor on her list", () => {
  test("stays on the list as retired, with no website, sources, LinkedIn or apply link", async () => {
    const t = await setup();
    await t.mutation(api.founders.start, { ...nisha, token: tokenA });
    const founderId = await t.run(async (ctx) => (await ctx.db.query("founders").withIndex("by_token", (q) => q.eq("token", tokenA)).unique())!._id);
    // Made-up investor whose domain was taken over.
    const inv = await t.run((ctx) => ctx.db.insert("investors", { seedId: "gone1", kind: "vc", firm: "Old Fund", displayName: "Old Fund", email: "a@oldfund.example", website: "https://oldfund.example", linkedin: "https://www.linkedin.com/company/oldfund", applyUrl: "https://oldfund.example/apply", sectors: ["ai"], stages: ["seed"], portfolio: [], recent: [], sourceUrls: ["https://oldfund.example/team"], retired: true } as never));
    await t.run((ctx) => ctx.db.insert("matches", { founderId, investorId: inv, rank: 0, score: 80 }));
    const row = (await t.query(api.founders.me, { token: tokenA }))!.rows[0];
    expect(row.retired).toBe(true);
    expect([row.website, row.linkedin, row.applyUrl, row.sourceUrls.length]).toEqual([null, null, null, 0]);
    expect(row.displayName).toBe("Old Fund");
  });
});

describe("fit question", () => {
  test("only her, signed in, after 3 emails sent; one answer kept, the latest wins", async () => {
    const t = await setup();
    await t.mutation(api.founders.start, { ...nisha, token: tokenA });
    const userId = await t.run((ctx) => ctx.db.insert("users", { email: "nisha@example.test" }));
    const me = t.withIdentity({ subject: `${userId}|s1` });
    await me.mutation(api.founders.claim, { token: tokenA });
    const founderId = await t.run(async (ctx) => (await ctx.db.query("founders").withIndex("by_token", (q) => q.eq("token", tokenA)).unique())!._id);
    expect((await t.mutation(api.pmf.answer, { token: tokenA, answer: "very" })).ok).toBe(false); // signed out
    expect(await me.mutation(api.pmf.answer, { token: tokenA, answer: "very" })).toEqual({ ok: false, error: "Send a few emails first." });
    for (let i = 0; i < 3; i++) {
      // Made-up investors.
      const inv = await t.run((ctx) => ctx.db.insert("investors", { seedId: `p${i}`, kind: "vc", firm: `Fund ${i}`, displayName: `Fund ${i}`, email: `a@fund${i}.example`, sectors: ["ai"], stages: ["seed"], portfolio: [], recent: [], sourceUrls: [] } as never));
      await t.run((ctx) => ctx.db.insert("matches", { founderId, investorId: inv, rank: i, score: 80, status: "sent" }));
    }
    expect(await me.mutation(api.pmf.answer, { token: tokenA, answer: "somewhat" })).toEqual({ ok: true });
    expect(await me.mutation(api.pmf.answer, { token: tokenA, answer: "very", benefit: "Saved me two weeks." })).toEqual({ ok: true });
    const rows = await t.run((ctx) => ctx.db.query("pmf").collect());
    expect(rows.map((r) => [r.answer, r.benefit])).toEqual([["very", "Saved me two weeks."]]);
    expect((await me.query(api.founders.me, { token: tokenA }))?.pmfAsked).toBe(true);
  });
});

describe("one Google account, one startup", () => {
  test("an account that already holds a list can't claim a second startup's list", async () => {
    const t = await setup();
    await t.mutation(internal.invites.createCode, { code: "TEST-TWO", label: "test", maxUses: 1 });
    await t.mutation(api.founders.start, { ...nisha, token: tokenA });
    await t.mutation(api.founders.start, { ...nisha, inviteCode: "TEST-TWO", company: "Paniwala Agro", token: tokenB });
    const userId = await t.run((ctx) => ctx.db.insert("users", { email: "nisha@example.test" }));
    const me = t.withIdentity({ subject: `${userId}|s1` });
    expect(await me.mutation(api.founders.claim, { token: tokenA })).toEqual({ ok: true });
    expect(await me.mutation(api.founders.claim, { token: tokenB })).toEqual({ ok: false, error: "This Google account already holds Ledgerly's list." });
    expect(await me.query(api.founders.myToken, {})).toEqual({ token: tokenA, company: "Ledgerly" });
    expect((await t.query(api.founders.me, { token: tokenB }))?.claimed).toBe(false); // the new list stays unclaimed, for another account
  });
});
