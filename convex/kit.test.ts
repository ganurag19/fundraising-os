/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import rateLimiter from "@convex-dev/rate-limiter/test";
import { cleanDeck, deckProblems } from "./lib/checks";

// The Raise Kit (15 Oct). Made-up founder and startup only.
const modules = import.meta.glob("./**/*.ts");
const tokenA = "a".repeat(48);
const tokenB = "b".repeat(48);
const facts = { problem: "Brick kilns burn coal by guesswork.", product: "A retrofit burner and a fuel app.", forWho: "Brick kiln owners", customers: "", market: "", businessModel: "₹4,500 a month per kiln", competitors: "", useOfFunds: "", whyNow: "", team: [{ name: "arjun rao", role: "Founder", line: "Ran his family's kiln for six years" }] };
const arjun = {
  code: "", company: "kiln labs", name: "arjun rao", website: "kilnlabs.example.in", linkedin: "", sectors: ["Climate & Energy"], stage: "Seed", ask: "₹1–3 Cr",
  oneLiner: "Kiln Labs helps brick kilns cut coal use by 18% with a retrofit burner and an app.", founderLine: "I'm Arjun; I ran my family's kiln for six years.",
  traction: "62 kilns pay us monthly", brand: { primary: "#E8673A", logo: "https://kilnlabs.example.in/logo.svg", font: "Inter" }, facts, uploads: 0,
};

async function setup(maxUses = 5) {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  await t.mutation(internal.invites.createCode, { code: "KIT", label: "test", maxUses });
  return t;
}

describe("Raise Kit: confirm your facts", () => {
  test("creates her founder record and kit, with names fixed and the KIT code used", async () => {
    const t = await setup();
    expect(await t.mutation(api.kit.confirm, { ...arjun, token: tokenA })).toEqual({ ok: true });
    const me = await t.query(api.founders.me, { token: tokenA });
    expect([me?.company, me?.name, me?.profile.traction]).toEqual(["Kiln Labs", "Arjun Rao", "62 kilns pay us monthly"]);
    const kit = await t.query(api.kit.mine, { token: tokenA });
    expect(kit?.brand.primary).toBe("#E8673A");
    expect(kit?.facts.team[0].name).toBe("Arjun Rao");
    // confirming again updates, without using another invite
    expect(await t.mutation(api.kit.confirm, { ...arjun, token: tokenA, stage: "Pre-seed" })).toEqual({ ok: true });
    const codes = await t.run((ctx) => ctx.db.query("inviteCodes").collect());
    expect(codes[0].uses).toBe(1);
  });

  test("needs the basics, and rejects bad colours, logos and fonts", async () => {
    const t = await setup();
    expect((await t.mutation(api.kit.confirm, { ...arjun, token: tokenA, oneLiner: " " })).ok).toBe(false);
    expect((await t.mutation(api.kit.confirm, { ...arjun, token: tokenA, sectors: ["Crypto"] })).ok).toBe(false);
    expect((await t.mutation(api.kit.confirm, { ...arjun, token: "short" })).ok).toBe(false);
    await t.mutation(api.kit.confirm, { ...arjun, token: tokenA, brand: { primary: "red; background:url(x)", logo: "javascript:alert(1)", font: "<script>" } });
    const kit = await t.query(api.kit.mine, { token: tokenA });
    expect(kit?.brand).toEqual({ primary: "#3D7BFF", accent: undefined, logo: undefined, font: undefined });
  });

  test("a used-up link can't start a new kit", async () => {
    const t = await setup(1);
    expect((await t.mutation(api.kit.confirm, { ...arjun, token: tokenA })).ok).toBe(true);
    expect((await t.mutation(api.kit.confirm, { ...arjun, token: tokenB })).ok).toBe(false);
  });

  test("her kit is hers: another token sees nothing; once saved to Google, only that account", async () => {
    const t = await setup();
    await t.mutation(api.kit.confirm, { ...arjun, token: tokenA });
    expect(await t.query(api.kit.mine, { token: tokenB })).toBeNull();
    const { userId, otherId } = await t.run(async (ctx) => ({ userId: await ctx.db.insert("users", { email: "arjun@kilnlabs.example.in" }), otherId: await ctx.db.insert("users", { email: "someone@else.example" }) }));
    expect(await t.withIdentity({ subject: `${userId}|s1` }).mutation(api.founders.claim, { token: tokenA })).toEqual({ ok: true });
    expect(await t.query(api.kit.mine, { token: tokenA })).toBeNull(); // signed out
    expect(await t.withIdentity({ subject: `${otherId}|s2` }).query(api.kit.mine, { token: tokenA })).toBeNull();
    expect((await t.withIdentity({ subject: `${userId}|s1` }).query(api.kit.mine, { token: tokenA }))?.brand.primary).toBe("#E8673A");
    // and a signed-out browser can't change her facts
    expect((await t.mutation(api.kit.confirm, { ...arjun, token: tokenA, company: "Someone Else" })).ok).toBe(false);
  });
});

describe("Raise Kit: request full access", () => {
  const answers = { plan: "raise_kit", wouldPay: "yes", price: "₹15,000–25,000", liked: "The pitches", missing: "", solves: 4, valuable: 5, raisingWhen: "Now", phone: "" };
  test("needs her signed in, a plan and both ratings; saves once and updates after", async () => {
    const t = await setup();
    await t.mutation(api.kit.confirm, { ...arjun, token: tokenA });
    expect((await t.mutation(api.kit.requestUpgrade, { ...answers, token: tokenA })).ok).toBe(false); // not signed in
    const userId = await t.run((ctx) => ctx.db.insert("users", { email: "arjun@kilnlabs.example.in" }));
    const arjunIn = t.withIdentity({ subject: `${userId}|s1` });
    await arjunIn.mutation(api.founders.claim, { token: tokenA });
    expect((await arjunIn.mutation(api.kit.requestUpgrade, { ...answers, token: tokenA, plan: "free_forever" })).ok).toBe(false);
    expect((await arjunIn.mutation(api.kit.requestUpgrade, { ...answers, token: tokenA, solves: 0 })).ok).toBe(false);
    expect((await arjunIn.mutation(api.kit.requestUpgrade, { ...answers, token: tokenA, phone: "call me" })).ok).toBe(false);
    expect(await arjunIn.mutation(api.kit.requestUpgrade, { ...answers, token: tokenA, valuable: 9 })).toEqual({ ok: true });
    expect(await arjunIn.mutation(api.kit.requestUpgrade, { ...answers, token: tokenA, wouldPay: "maybe" })).toEqual({ ok: true });
    const rows = await t.run((ctx) => ctx.db.query("upgradeRequests").collect());
    expect(rows.length).toBe(1);
    expect([rows[0].wouldPay, rows[0].valuable, rows[0].email]).toEqual(["maybe", 5, "arjun@kilnlabs.example.in"]);
    expect((await arjunIn.query(api.kit.mine, { token: tokenA }))?.requested).toBe(true);
  });
});

describe("Raise Kit: the deck only uses her numbers", () => {
  const factsText = JSON.stringify({ traction: "62 kilns pay us monthly, up from 9 in March", raising: "₹1–3 Cr", oneLiner: "cut coal use by 18%" });
  const slides = [
    { key: "traction", headline: "62 kilns pay us monthly", points: ["Up from 9 in March", "Growing 40% a month"], metrics: [{ value: "62", label: "paying kilns" }, { value: "₹2 Cr", label: "ARR" }] },
    { key: "market", headline: "A ₹12,000 Cr market", points: [], metrics: [] },
    { key: "solution", headline: "A revolutionary burner", points: ["Cuts coal by 18%"], metrics: [] },
  ];
  const teaser = { summary: "Kiln Labs cuts coal by 18%. We have 500 customers. We're raising ₹1–3 Cr.", highlights: ["62 paying kilns", "TAM of ₹12,000 Cr"] };
  test("finds every number she didn't give, and hype", () => {
    const p = deckProblems(slides, teaser, factsText).join(" | ");
    for (const bad of ["40", "12000", "500", "revolutionary"]) expect(p).toContain(bad);
    expect(p).not.toContain('"62"');
  });
  test("cleaning drops those lines and keeps the rest", () => {
    const c = cleanDeck(slides, teaser, factsText);
    expect(c.slides[0].points).toEqual(["Up from 9 in March"]);
    expect(c.slides[0].metrics.map((m) => m.value)).toEqual(["62"]);
    expect(c.slides[1].headline).toBe(""); // invented market size: gone, the slide shows "To add"
    expect(c.slides[2].headline).toBe("Cuts coal by 18%");
    expect(c.teaser.summary).toBe("Kiln Labs cuts coal by 18%. We're raising ₹1–3 Cr.");
    expect(c.teaser.highlights).toEqual(["62 paying kilns"]);
  });
});

describe("Raise Kit: the free kit keeps investors beyond the top 5 locked", () => {
  test("names are part-hidden, and no email, link or pitch leaves the server", async () => {
    const t = await setup();
    await t.mutation(api.kit.confirm, { ...arjun, token: tokenA });
    const userId = await t.run(async (ctx) => {
      const f = (await ctx.db.query("founders").collect())[0];
      for (let rank = 0; rank < 7; rank++) {
        const inv = await ctx.db.insert("investors", { seedId: `s${rank}`, kind: "vc", displayName: `Made Up Capital ${rank}`, email: `team${rank}@madeup.example`, website: "https://madeup.example", sectors: ["climate"], stages: ["seed"], portfolio: [], recent: [], sourceUrls: ["https://madeup.example/portfolio"] });
        await ctx.db.insert("matches", { founderId: f._id, investorId: inv, rank, score: 80 - rank });
      }
      return await ctx.db.insert("users", { email: "arjun@kilnlabs.example.in" });
    });
    const arjunIn = t.withIdentity({ subject: `${userId}|s1` });
    await arjunIn.mutation(api.founders.claim, { token: tokenA });
    const me = await arjunIn.query(api.founders.me, { token: tokenA });
    const open = me!.rows.filter((r) => r.rank < 5), locked = me!.rows.filter((r) => r.rank >= 5);
    expect(open.every((r) => !r.locked && r.email && r.displayName?.startsWith("Made Up"))).toBe(true);
    expect(locked.length).toBe(2);
    for (const r of locked) {
      expect(r.locked).toBe(true);
      expect([r.email, r.website, r.linkedin, r.draft]).toEqual([null, null, null, null]);
      expect(r.sourceUrls).toEqual([]);
      expect(r.displayName).toMatch(/^Ma•+ Up•+ Capital/);
    }
  });
});

describe("Pitch room", () => {
  const viewer = "c".repeat(48), other = "d".repeat(48);
  async function withRoom() {
    const t = await setup();
    await t.mutation(api.kit.confirm, { ...arjun, token: tokenA });
    await t.run(async (ctx) => { const k = (await ctx.db.query("kits").collect())[0]; await ctx.db.patch("kits", k._id, { status: "ready", deck: [{ key: "cover", headline: "Kiln Labs cuts coal", points: [], metrics: [] }] }); });
    const { userId, otherId } = await t.run(async (ctx) => ({ userId: await ctx.db.insert("users", { email: "arjun@kilnlabs.example.in" }), otherId: await ctx.db.insert("users", { email: "someone@else.example" }) }));
    const owner = t.withIdentity({ subject: `${userId}|s1` });
    await owner.mutation(api.founders.claim, { token: tokenA });
    return { t, owner, stranger: t.withIdentity({ subject: `${otherId}|s2` }) };
  }
  test("a visitor sees the name, not the deck, until she approves; then views are counted for her", async () => {
    const { t, owner, stranger } = await withRoom();
    const before = await t.query(api.room.page, { slug: "kiln-labs", viewer });
    expect([before?.company, before?.state, before?.content]).toEqual(["Kiln Labs", "none", null]);
    expect((await t.mutation(api.room.ask, { slug: "kiln-labs", viewer, name: "Meera", email: "not-an-email", firm: "" })).ok).toBe(false);
    expect(await t.mutation(api.room.ask, { slug: "kiln-labs", viewer, name: "Meera Iyer", email: "meera@verdantarc.example", firm: "Verdant Arc" })).toEqual({ ok: true });
    expect((await t.query(api.room.page, { slug: "kiln-labs", viewer }))?.state).toBe("pending");
    // views before approval aren't counted; another browser can't see it
    await t.mutation(api.room.track, { slug: "kiln-labs", viewer, kind: "view" });
    const room = await owner.query(api.room.mine, { token: tokenA });
    expect(room?.stats.pending).toBe(1);
    const id = room!.requests[0].id;
    // only the owner can decide
    expect((await stranger.mutation(api.room.decide, { token: tokenA, id, status: "approved" })).ok).toBe(false);
    expect(await owner.mutation(api.room.decide, { token: tokenA, id, status: "approved" })).toEqual({ ok: true });
    const open = await t.query(api.room.page, { slug: "kiln-labs", viewer });
    expect(open?.content?.slides[0].headline).toBe("Kiln Labs cuts coal");
    expect((await t.query(api.room.page, { slug: "kiln-labs", viewer: other }))?.content).toBeNull();
    await t.mutation(api.room.track, { slug: "kiln-labs", viewer, kind: "view" });
    await t.mutation(api.room.track, { slug: "kiln-labs", viewer, kind: "slide", slide: 0 });
    await t.mutation(api.room.track, { slug: "kiln-labs", viewer, kind: "meet" });
    await t.mutation(api.room.track, { slug: "kiln-labs", viewer: other, kind: "view" }); // not approved: ignored
    const after = await owner.query(api.room.mine, { token: tokenA });
    expect(after?.stats).toEqual({ views: 1, viewers: 1, slides: 1, meets: 1, pending: 0 });
    expect(after?.requests[0]).toMatchObject({ name: "Meera Iyer", firm: "Verdant Arc", status: "approved", views: 1, slidesSeen: 1, meet: true });
    // a stranger can't read her requests
    expect(await stranger.query(api.room.mine, { token: tokenA })).toBeNull();
  });
});

describe("Pitch room link in every pitch", () => {
  const room = "https://www.firstcheq.ai/p/kiln-labs";
  test("goes just above her sign-off, once", async () => {
    const { withRoomLink, noteWithRoom } = await import("./founders");
    const body = "Hi Meera,\n\nWe're raising ₹3 Cr at seed.\n\nArjun Rao\nFounder, Kiln Labs";
    const out = withRoomLink(body, room, "Arjun Rao");
    expect(out).toBe("Hi Meera,\n\nWe're raising ₹3 Cr at seed.\n\nDeck and teaser: https://www.firstcheq.ai/p/kiln-labs\n\nArjun Rao\nFounder, Kiln Labs");
    expect(withRoomLink(out, room, "Arjun Rao")).toBe(out);
    expect(withRoomLink(body, null, "Arjun Rao")).toBe(body);
    expect(noteWithRoom("Hi Meera, may I share our deck? Arjun", room)).toBe("Hi Meera, may I share our deck? Arjun\nDeck: firstcheq.ai/p/kiln-labs");
    const long = "x".repeat(280);
    expect(noteWithRoom(long, room)).toBe(long); // would pass LinkedIn's 300 characters: left as it is
  });
});
