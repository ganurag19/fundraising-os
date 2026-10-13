/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("abuse watch", () => {
  test("quiet hour, no alerts", async () => {
    const t = convexTest(schema, modules);
    expect(await t.mutation(internal.watch.hourly, {})).toEqual([]);
  });
  test("flags a founder asking for many emails in an hour", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const founderId = await ctx.db.insert("founders", { token: "d".repeat(48), inviteCode: "X", company: "Made-up Co", name: "Test", sectors: ["AI"], stage: "Seed", ask: "₹1–3 Cr", emailsStatus: "ready" });
      for (let i = 0; i < 16; i++) await ctx.db.insert("aiCalls", { founderId, purpose: "more_email", model: "m", input: "", output: "", ms: 1 });
    });
    const alerts = await t.mutation(internal.watch.hourly, {});
    expect(alerts.join(" ")).toMatch(/16 extra emails/);
  });
});
