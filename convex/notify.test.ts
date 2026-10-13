/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

// Made-up founder and investors only.
async function setup(extra: Record<string, unknown> = {}) {
  const t = convexTest(schema, modules);
  const founderId = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: "nisha@ledgerly.example" });
    const founderId = await ctx.db.insert("founders", { token: "a".repeat(48), inviteCode: "X", company: "Ledgerly", name: "Nisha Kulkarni", sectors: ["AI"], stage: "Seed", ask: "₹1–3 Cr", emailsStatus: "ready", userId, matchCount: 40, ...extra });
    for (const [i, state] of (["ready", "ready", "scheduled"] as const).entries()) {
      const investorId = await ctx.db.insert("investors", { seedId: `n${i}`, kind: "vc", displayName: `Made-up Fund ${i}`, email: `f${i}@fund.example`, sectors: ["ai"], stages: ["seed"], portfolio: [], recent: [], sourceUrls: [] });
      const matchId = await ctx.db.insert("matches", { founderId, investorId, rank: i, score: 90, status: "sent", sentAt: 1 });
      await ctx.db.insert("followups", { founderId, matchId, n: 1, dueAt: 1, state });
    }
    return founderId;
  });
  return { t, founderId };
}

describe("reminder emails", () => {
  test("one reminder per founder lists every ready follow-up", async () => {
    const { t } = await setup();
    const due = await t.query(internal.notify.dueToday, { today: "2026-10-14" });
    expect(due).toHaveLength(1);
    expect(due[0].email).toBe("nisha@ledgerly.example");
    expect(due[0].names.sort()).toEqual(["Made-up Fund 0", "Made-up Fund 1"]);
  });
  test("never twice in a day, and never when she turned them off", async () => {
    expect(await (await setup({ remindedOn: "2026-10-14" })).t.query(internal.notify.dueToday, { today: "2026-10-14" })).toEqual([]);
    expect(await (await setup({ emailReminders: false })).t.query(internal.notify.dueToday, { today: "2026-10-14" })).toEqual([]);
  });
  test("a founder who never signed in gets nothing (we have no email for her)", async () => {
    const { t } = await setup({ userId: undefined });
    expect(await t.query(internal.notify.dueToday, { today: "2026-10-14" })).toEqual([]);
  });
  test("the welcome email goes once", async () => {
    const { t, founderId } = await setup();
    expect((await t.query(internal.notify.forWelcome, { founderId }))?.email).toBe("nisha@ledgerly.example");
    await t.mutation(internal.notify.log, { founderId, kind: "welcome", error: null });
    expect(await t.query(internal.notify.forWelcome, { founderId })).toBeNull();
  });
});
