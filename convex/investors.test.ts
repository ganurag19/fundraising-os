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
