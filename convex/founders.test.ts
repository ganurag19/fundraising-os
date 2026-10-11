/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const tokenA = "a".repeat(48);
const tokenB = "b".repeat(48);
// Made-up founder.
const nisha = { inviteCode: "TEST-ONE", company: "Ledgerly", name: "Nisha Kulkarni", sectors: ["AI"], stage: "Seed", ask: "₹1–3 Cr" };

async function setup() {
  const t = convexTest(schema, modules);
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
    const p = await t.mutation(api.founders.saveProfile, { token: tokenB, forWho: "CA firms", outcome: "file faster", how: "AI", reduce: "", founderLine: "I'm someone else." });
    expect(p.ok).toBe(false);
  });

  test("saves the profile used in every email", async () => {
    const t = await setup();
    await t.mutation(api.founders.start, { ...nisha, token: tokenA });
    expect(await t.mutation(api.founders.saveProfile, { token: tokenA, forWho: "CA firms", outcome: "file GST returns 3x faster", how: "AI that reads bank statements", reduce: "manual entry", founderLine: "I'm Nisha, a chartered accountant." })).toEqual({ ok: true });
    expect((await t.query(api.founders.me, { token: tokenA }))?.hasProfile).toBe(true);
  });
});
