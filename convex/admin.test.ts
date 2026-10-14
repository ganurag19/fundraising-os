/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import rateLimiter from "@convex-dev/rate-limiter/test";

const modules = import.meta.glob("./**/*.ts");
const token = "c".repeat(48);
// Made-up owner and visitor.
const OWNER = "owner@example.test", PIN = "482913";

async function setup() {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  const ownerId = await t.run((ctx) => ctx.db.insert("users", { email: OWNER }));
  const otherId = await t.run((ctx) => ctx.db.insert("users", { email: "someone@example.test" }));
  return { t, owner: t.withIdentity({ subject: `${ownerId}|s1` }), other: t.withIdentity({ subject: `${otherId}|s2` }) };
}

describe("owner dashboard", () => {
  beforeEach(() => { vi.stubEnv("ADMIN_EMAIL", OWNER); vi.stubEnv("ADMIN_PIN", PIN); });
  afterEach(() => vi.unstubAllEnvs());

  test("only the owner, with the right PIN, gets a key, and the key only works for her", async () => {
    const { t, owner, other } = await setup();
    expect(await t.mutation(api.admin.unlock, { pin: PIN })).toEqual({ ok: false, error: "Sign in first." });
    expect(await other.mutation(api.admin.unlock, { pin: PIN })).toEqual({ ok: false, error: "Not allowed." });
    expect(await owner.mutation(api.admin.unlock, { pin: "000000" })).toEqual({ ok: false, error: "Wrong PIN." });
    const r = await owner.mutation(api.admin.unlock, { pin: PIN });
    if (!r.ok) throw new Error(r.error);
    expect(await owner.query(api.admin.funnel, { key: r.key, since: 0 })).not.toBeNull();
    expect(await other.query(api.admin.funnel, { key: r.key, since: 0 })).toBeNull();
    expect(await t.query(api.admin.people, { key: r.key, since: 0 })).toBeNull();
    expect(await owner.query(api.admin.forms, { key: "f".repeat(64), since: 0 })).toBeNull();
  });

  test("locks after 5 wrong PINs, even if the 6th is right", async () => {
    const { owner } = await setup();
    for (let i = 0; i < 5; i++) await owner.mutation(api.admin.unlock, { pin: "111111" });
    expect(await owner.mutation(api.admin.unlock, { pin: PIN })).toEqual({ ok: false, error: "Too many tries. Try again in an hour." });
  });

  test("no PIN set means no way in", async () => {
    vi.stubEnv("ADMIN_PIN", "");
    const { owner } = await setup();
    expect((await owner.mutation(api.admin.unlock, { pin: "" })).ok).toBe(false);
  });

  test("counts visits and clicks, ignores unknown names, and never stores the visitor's code", async () => {
    const { t, owner } = await setup();
    await t.mutation(api.track.hit, { token, name: "visit_landing" });
    await t.mutation(api.track.hit, { token, name: "click_go" });
    await t.mutation(api.track.hit, { token, name: "click_go" });
    await t.mutation(api.track.hit, { token, name: "drop_table" });
    await t.mutation(api.track.hit, { token: "not-a-token", name: "click_go" });
    const rows = await t.run((ctx) => ctx.db.query("events").collect());
    expect(rows.map((e) => e.name)).toEqual(["visit_landing", "click_go", "click_go"]);
    expect(rows.every((e) => e.visitor !== token && !token.includes(e.visitor))).toBe(true);
    const r = await owner.mutation(api.admin.unlock, { pin: PIN });
    if (!r.ok) throw new Error(r.error);
    const f = await owner.query(api.admin.funnel, { key: r.key, since: 0 });
    expect(f?.visitors).toBe(1);
    expect(f?.events.click_go).toEqual({ n: 2, people: 1 });
  });
});

describe("feedback", () => {
  beforeEach(() => { vi.stubEnv("ADMIN_EMAIL", OWNER); vi.stubEnv("ADMIN_PIN", PIN); });
  afterEach(() => vi.unstubAllEnvs());

  test("is saved with the page, capped at 5 an hour per visitor, and listed for the owner", async () => {
    const { t, owner } = await setup();
    expect((await t.mutation(api.feedback.send, { token, page: "emails", text: "  " })).ok).toBe(false);
    expect(await t.mutation(api.feedback.send, { token, page: "emails", text: "The second email had no signature.", email: "tester@example.test" })).toEqual({ ok: true });
    for (let i = 0; i < 4; i++) await t.mutation(api.feedback.send, { token, page: "nowhere", text: `note ${i}` });
    expect((await t.mutation(api.feedback.send, { token, page: "emails", text: "one too many" })).ok).toBe(false);
    const r = await owner.mutation(api.admin.unlock, { pin: PIN });
    if (!r.ok) throw new Error(r.error);
    const f = await owner.query(api.admin.forms, { key: r.key, since: 0 });
    expect(f?.feedback.length).toBe(5);
    expect(f?.feedback.some((n) => n.email === "tester@example.test" && n.page === "emails")).toBe(true);
    expect(f?.feedback.some((n) => n.page === "other")).toBe(true); // unknown pages are stored as "other"
  });
});

describe("I'm interested", () => {
  beforeEach(() => { vi.stubEnv("ADMIN_EMAIL", OWNER); vi.stubEnv("ADMIN_PIN", PIN); });
  afterEach(() => vi.unstubAllEnvs());

  test("is recorded once per visitor and idea, ignores unknown ideas, and is counted for the owner", async () => {
    const { t, owner } = await setup();
    await t.mutation(api.track.want, { token, key: "qa" });
    await t.mutation(api.track.want, { token, key: "qa" }); // a second tap changes nothing
    await t.mutation(api.track.want, { token, key: "deck" });
    await t.mutation(api.track.want, { token: "d".repeat(48), key: "qa" });
    await t.mutation(api.track.want, { token, key: "crypto-tips" });
    const r = await owner.mutation(api.admin.unlock, { pin: PIN });
    if (!r.ok) throw new Error(r.error);
    const f = await owner.query(api.admin.forms, { key: r.key, since: 0 });
    expect(f?.wants.map((w) => [w.key, w.n])).toEqual([["qa", 2], ["deck", 1]]);
  });
});
