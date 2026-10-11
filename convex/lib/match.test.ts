import { describe, expect, test } from "vitest";
import { chequeFits, scoreInvestor, topMatches } from "./match";
import { checkDraft, unsourcedFacts } from "./checks";

// Made-up investors only.
const base = { sectors: ["ai"], stages: ["seed"], recent: [] as { year?: number }[] };
const seedAi = { sectors: ["AI"], stage: "Seed", ask: "₹1–3 Cr" };

describe("cheque fit", () => {
  test("fits when the largest cheque is at least 2% of the round and the smallest is within it", () => {
    expect(chequeFits({ ...base, chequeMinLakh: 50, chequeMaxLakh: 200 }, "₹1–3 Cr")).toBe(true);
    expect(chequeFits({ ...base, chequeMaxLakh: 1 }, "₹1–3 Cr")).toBe(false); // too small
    expect(chequeFits({ ...base, chequeMinLakh: 500 }, "₹1–3 Cr")).toBe(false); // too big
    expect(chequeFits(base, "₹1–3 Cr")).toBeNull(); // unknown
  });
});

describe("match score", () => {
  test("drops investors outside her sector or stage", () => {
    expect(scoreInvestor({ ...base, sectors: ["fintech"] }, seedAi, 2026)).toBeNull();
    expect(scoreInvestor({ ...base, stages: ["series_a"] }, seedAi, 2026)).toBeNull();
  });
  test("ranks a researched, active, exact-sector investor above an any-sector one", () => {
    const strong = { ...base, thesis: "AI for finance", chequeMinLakh: 50, chequeMaxLakh: 200, recent: [{ year: 2026 }], lastChecked: "2026-10-09" };
    const agnostic = { ...base, sectors: ["sector_agnostic"] };
    expect(scoreInvestor(strong, seedAi, 2026)).toBe(100);
    expect(scoreInvestor(agnostic, seedAi, 2026)!).toBeLessThan(60);
    const top = topMatches([agnostic, strong], seedAi, 2026, 1);
    expect(top[0].inv).toBe(strong);
  });
  test("never picks two people from the same firm", () => {
    const a = { ...base, firm: "Verdant Arc Capital", thesis: "AI" };
    const b = { ...base, firm: "Verdant Arc Capital", thesis: "AI" };
    const c = { ...base, firm: "Northlight Seed" };
    const top = topMatches([a, b, c], seedAi, 2026, 3);
    expect(top.map((x) => x.inv.firm)).toEqual(["Verdant Arc Capital", "Northlight Seed"]);
  });
  test("a bigger share of her round ranks higher", () => {
    const small = { ...base, thesis: "AI", chequeMinLakh: 9, chequeMaxLakh: 35, recent: [{ year: 2026 }] };
    const big = { ...small, chequeMaxLakh: 150 };
    expect(scoreInvestor(big, seedAi, 2026)!).toBeGreaterThan(scoreInvestor(small, seedAi, 2026)!);
  });
});

describe("email checks", () => {
  const oneLiner = "Ledgerly helps CA firms file GST returns 3x faster through AI that reads bank statements.";
  const founderLine = "I'm Nisha, a chartered accountant who ran a 40-client practice for five years.";
  const good = { subject: "Ledgerly × Verdant Arc: seed round", body: `Hi Meera,\n\n${oneLiner}\n\n${founderLine}\n\nCould I send the deck?\n\nNisha`, oneLiner, founderLine };
  test("a good email passes", () => expect(checkDraft(good)).toEqual([]));
  test("catches long subjects, banned phrases and a missing one-liner", () => {
    const bad = checkDraft({ ...good, subject: "An exciting opportunity to invest in our seed round today", body: "I hope this finds you well. We disrupt everything." });
    expect(bad.join(" ")).toMatch(/Subject/);
    expect(bad.join(" ")).toMatch(/hope this finds you well/);
    expect(bad.join(" ")).toMatch(/one-liner/);
  });
  test("flags facts that point at empty fields", () => {
    expect(unsourcedFacts([{ text: "you backed GridLeaf", field: "portfolio" }, { text: "AI for finance", field: "thesis" }], { portfolio: [], thesis: "AI for finance" })).toEqual(["you backed GridLeaf"]);
  });
});
