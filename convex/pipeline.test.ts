/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import rateLimiter from "@convex-dev/rate-limiter/test";
import { DAY } from "./pipeline";

const modules = import.meta.glob("./**/*.ts");
const token = "a".repeat(48);
const other = "b".repeat(48);

// Made-up founder and investors only.
async function setup() {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  await t.mutation(internal.invites.createCode, { code: "TEST-PIPE", label: "test", maxUses: 2 });
  await t.mutation(api.founders.start, { token, inviteCode: "TEST-PIPE", company: "Ledgerly", name: "Nisha Kulkarni", sectors: ["AI"], stage: "Seed", ask: "₹1–3 Cr" });
  const founderId = await t.run(async (ctx) => {
    const f = (await ctx.db.query("founders").first())!;
    const investorId = await ctx.db.insert("investors", { seedId: "x0", kind: "fund", displayName: "Made-up Fund", email: "hi@fund.example", sectors: ["ai"], stages: ["seed"], portfolio: [], recent: [], sourceUrls: [] });
    await ctx.db.insert("matches", { founderId: f._id, investorId, rank: 0, score: 90 });
    return f._id;
  });
  const followups = () => t.run((ctx) => ctx.db.query("followups").take(10));
  return { t, founderId, followups };
}

describe("pipeline", () => {
  test("'I sent it' moves her to Waiting on them and schedules follow-up 1 for day 3", async () => {
    const { t, followups } = await setup();
    const before = Date.now();
    await t.mutation(api.pipeline.setStatus, { token, rank: 0, status: "sent" });
    const me = (await t.query(api.founders.me, { token }))!;
    expect(me.rows[0].status).toBe("sent");
    const [fu] = await followups();
    expect(fu.n).toBe(1);
    expect(fu.state).toBe("scheduled");
    expect(fu.dueAt - before).toBeGreaterThanOrEqual(3 * DAY);
    expect(fu.dueAt - before).toBeLessThan(3 * DAY + 60_000);
  });

  test("a reply stops pending follow-ups", async () => {
    const { t, followups } = await setup();
    await t.mutation(api.pipeline.setStatus, { token, rank: 0, status: "sent" });
    await t.mutation(api.pipeline.setStatus, { token, rank: 0, status: "replied" });
    expect((await followups())[0].state).toBe("cancelled");
    expect((await t.query(api.founders.me, { token }))!.rows[0].followups).toEqual([]);
  });

  test("undoing a send cancels the follow-up too", async () => {
    const { t, followups } = await setup();
    await t.mutation(api.pipeline.setStatus, { token, rank: 0, status: "sent" });
    await t.mutation(api.pipeline.setStatus, { token, rank: 0, status: "new" });
    expect((await followups())[0].state).toBe("cancelled");
    expect((await t.query(api.founders.me, { token }))!.rows[0].status).toBe("new");
  });

  test("sending follow-up 1 schedules follow-up 2 seven days later", async () => {
    const { t, followups } = await setup();
    await t.mutation(api.pipeline.setStatus, { token, rank: 0, status: "sent" });
    const [fu1] = await followups();
    await t.mutation(internal.pipeline.saveFollowup, { followupId: fu1._id, subject: "Re: hello", body: "Hi, a short nudge." });
    const before = Date.now();
    await t.mutation(api.pipeline.followupSent, { token, followupId: fu1._id });
    const all = await followups();
    expect(all.find((f) => f.n === 1)!.state).toBe("sent");
    const fu2 = all.find((f) => f.n === 2)!;
    expect(fu2.state).toBe("scheduled");
    expect(fu2.dueAt - before).toBeGreaterThanOrEqual(7 * DAY);
  });

  test("a follow-up written after a reply is thrown away", async () => {
    const { t, followups } = await setup();
    await t.mutation(api.pipeline.setStatus, { token, rank: 0, status: "sent" });
    await t.mutation(api.pipeline.setStatus, { token, rank: 0, status: "passed" });
    const [fu] = await followups();
    await t.mutation(internal.pipeline.saveFollowup, { followupId: fu._id, subject: "Re: x", body: "late" });
    expect((await followups())[0].state).toBe("cancelled");
  });

  test("another visitor can't change her pipeline", async () => {
    const { t, followups } = await setup();
    await t.mutation(api.pipeline.setStatus, { token: other, rank: 0, status: "sent" });
    expect(await followups()).toEqual([]);
    expect((await t.query(api.founders.me, { token }))!.rows[0].status).toBe("new");
  });

  test("once she has sent, matching won't rewrite her list", async () => {
    const { t } = await setup();
    await t.mutation(api.pipeline.setStatus, { token, rank: 0, status: "sent" });
    expect((await t.query(internal.founders.forDrafting, { token })).hasSent).toBe(true);
  });
});
