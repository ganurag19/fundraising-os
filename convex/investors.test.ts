/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
// Made-up investors only.
const row = (seedId: string, extra = {}) => ({ seedId, kind: "vc", displayName: `Made-up ${seedId}`, email: `${seedId}@fund.example`, sectors: ["ai"], stages: ["seed"], portfolio: [], recent: [], sourceUrls: [], ...extra });

test("re-importing updates investors in place, so a founder's matches still point at them", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(internal.investors.upsertMany, { rows: [row("a"), row("b")] });
  const idA = await t.run(async (ctx) => (await ctx.db.query("investors").withIndex("by_seedId", (q) => q.eq("seedId", "a")).unique())!._id);
  const res = await t.mutation(internal.investors.upsertMany, { rows: [row("a", { thesis: "AI for SMBs" }), row("c"), row("d", { email: undefined })] });
  expect(res).toEqual({ inserted: 1, updated: 1, skipped: 1 });
  const a = await t.run((ctx) => ctx.db.get("investors", idA));
  expect(a?.thesis).toBe("AI for SMBs"); // same id, new facts
  expect(await t.run((ctx) => ctx.db.query("investors").take(10))).toHaveLength(3); // b kept, never deleted
});

test("retiring hides an investor from matching, keeps it for existing lists, and a re-export brings it back", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(internal.investors.upsertMany, { rows: [row("a", { email: "old@fund.example", applyDeadline: "2026-01-01" })] });
  expect(await t.mutation(internal.investors.retireMany, { seedIds: ["a", "zz"] })).toEqual({ retired: 1, missing: 1 });
  const get = () => t.run(async (ctx) => (await ctx.db.query("investors").withIndex("by_seedId", (q) => q.eq("seedId", "a")).unique())!);
  expect((await get()).retired).toBe(true);
  // a cleared field really goes: the new row has no applyDeadline
  await t.mutation(internal.investors.upsertMany, { rows: [row("a")] });
  const a = await get();
  expect([a.retired, a.applyDeadline]).toEqual([undefined, undefined]);
});
