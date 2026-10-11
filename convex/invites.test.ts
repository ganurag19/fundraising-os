/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

// Made-up founders only.
const neha = { email: "Neha@Ledgerly.example ", name: "Neha Kulkarni", company: "Ledgerly", stage: "Seed" };

describe("requestInvite", () => {
  test("saves a request once per email", async () => {
    const t = convexTest(schema, modules);
    expect(await t.mutation(api.invites.requestInvite, neha)).toEqual({ ok: true, alreadyOnList: false });
    expect(await t.mutation(api.invites.requestInvite, { ...neha, email: "neha@ledgerly.example" })).toEqual({ ok: true, alreadyOnList: true });
    const rows = await t.run((ctx) => ctx.db.query("waitlist").take(10));
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe("neha@ledgerly.example");
  });

  test("rejects a bad email, empty name and unknown stage", async () => {
    const t = convexTest(schema, modules);
    expect((await t.mutation(api.invites.requestInvite, { ...neha, email: "not-an-email" })).ok).toBe(false);
    expect((await t.mutation(api.invites.requestInvite, { ...neha, name: "  " })).ok).toBe(false);
    expect((await t.mutation(api.invites.requestInvite, { ...neha, stage: "Series Z" })).ok).toBe(false);
  });
});

describe("checkCode", () => {
  test("accepts a code with uses left, case and spaces ignored", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.invites.createCode, { code: "growthx-s4", label: "GrowthX", maxUses: 2 });
    expect(await t.query(api.invites.checkCode, { code: " GrowthX-S4 " })).toEqual({ valid: true });
  });

  test("rejects unknown and used-up codes", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.invites.createCode, { code: "ONE-USE", label: "test", maxUses: 1 });
    await t.run(async (ctx) => {
      const row = await ctx.db.query("inviteCodes").withIndex("by_code", (q) => q.eq("code", "ONE-USE")).unique();
      await ctx.db.patch("inviteCodes", row!._id, { uses: 1 });
    });
    expect(await t.query(api.invites.checkCode, { code: "ONE-USE" })).toEqual({ valid: false });
    expect(await t.query(api.invites.checkCode, { code: "NOPE" })).toEqual({ valid: false });
  });
});
