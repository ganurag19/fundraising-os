import { describe, expect, test } from "vitest";
import { chequeFits, scoreInvestor, scoreParts, topMatches } from "./match";
import { checkDraft, checkFollowup, hookNamesADeal, unsourcedFacts } from "./checks";

// Made-up investors only.
const base = { sectors: ["ai"], stages: ["seed"], recent: [] as { year?: number; sector?: string }[], email: "hi@fund.example" };
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

describe("spread and top picks", () => {
  const focused = { ...base, thesis: "Seed-stage AI for Indian SMBs", chequeMinLakh: 50, chequeMaxLakh: 200, recent: [{ year: 2026 }], lastChecked: "2026-10-09" };
  test("a generalist scores below a focused investor with the same facts", () => {
    const generalist = { ...focused, sectors: ["ai", "fintech", "consumer", "saas", "health"], stages: ["idea", "pre_seed", "seed", "series_a"], thesis: "Tech founders from idea to IPO" };
    expect(scoreInvestor(generalist, seedAi, 2026)!).toBeLessThan(scoreInvestor(focused, seedAi, 2026)! - 15);
  });
  test("a smallest cheque above her round's low end scores less", () => {
    const big = { ...focused, chequeMinLakh: 150, chequeMaxLakh: 500 };
    expect(scoreInvestor(big, seedAi, 2026)!).toBeLessThan(scoreInvestor(focused, seedAi, 2026)!);
  });
  test("top picks have something specific to open on; the rest follow", () => {
    const noHook = { ...focused, thesis: undefined, recent: [{ year: 2026 }].slice(0, 0), firm: "Plain Fund" };
    const withHook = { ...base, firm: "Hook Fund", portfolio: ["Made-up Co"] };
    const top = topMatches([noHook, withHook], seedAi, 2026, 20);
    expect(top.map((x) => x.inv.firm)).toEqual(["Hook Fund", "Plain Fund"]);
  });
});

describe("deal evidence and apply links", () => {
  const climate = { sectors: ["Climate & Energy"], stage: "Seed", ask: "₹1–3 Cr" };
  const deals = (n: number, sector: string) => Array.from({ length: n }, () => ({ year: 2026, sector }));
  const sectorPart = (inv: Parameters<typeof scoreParts>[0]) => scoreParts(inv, climate, 2026)!.find((p) => p.key === "sector")!;
  test("an agnostic fund with 2 climate deals gets full marks, and beats one with none", () => {
    const withDeals = { ...base, sectors: ["sector_agnostic"], recent: deals(2, "climate") };
    const without = { ...base, sectors: ["sector_agnostic"] };
    expect(sectorPart(withDeals).got).toBe(30);
    expect(sectorPart(withDeals).label).toBe("Invests in your space · 2 of 2 recent deals are climate");
    expect(scoreInvestor(withDeals, climate, 2026)!).toBeGreaterThan(scoreInvestor(without, climate, 2026)!);
  });
  test("one deal lifts to at least 24; a deal with no sector changes nothing", () => {
    expect(sectorPart({ ...base, sectors: ["sector_agnostic"], recent: deals(1, "climate") }).got).toBe(24);
    expect(sectorPart({ ...base, sectors: ["sector_agnostic"], recent: [{ year: 2026 }] }).got).toBe(12);
  });
  test("a listed sector with none of 5+ tagged deals drops to 24", () => {
    expect(sectorPart({ ...base, sectors: ["climate"], recent: deals(5, "fintech") }).got).toBe(24);
    expect(sectorPart({ ...base, sectors: ["climate"], recent: deals(4, "fintech") }).got).toBe(30);
  });
  test("a fund outside her listed sectors still shows if its deals are in her space", () => {
    expect(scoreInvestor({ ...base, sectors: ["fintech"], recent: deals(2, "climate") }, climate, 2026)).not.toBeNull();
  });
  test("accelerators only at idea or pre-seed, grants up to seed; unreachable rows never show", () => {
    const acc = { ...base, kind: "accelerator", email: undefined, applyUrl: "https://apply.example", stages: [] as string[] };
    expect(scoreInvestor(acc, { ...seedAi, stage: "Pre-seed" }, 2026)).not.toBeNull();
    expect(scoreInvestor(acc, seedAi, 2026)).toBeNull();
    expect(scoreInvestor({ ...acc, kind: "grant" }, seedAi, 2026)).not.toBeNull();
    expect(scoreInvestor({ ...base, email: undefined }, seedAi, 2026)).toBeNull();
  });
  test("apply-only programmes take at most 5 places in her list of 20", () => {
    const programmes = Array.from({ length: 12 }, (_, i) => ({ ...base, firm: `Made-up Incubator ${i}`, kind: "accelerator", email: undefined, applyUrl: "https://apply.example", stages: [] as string[], thesis: "AI", recent: [{ year: 2026 }] }));
    const funds = Array.from({ length: 30 }, (_, i) => ({ ...base, stages: ["pre_seed"], firm: `Made-up Fund ${i}`, portfolio: ["Made-up Co"] }));
    const list = topMatches([...programmes, ...funds], { ...seedAi, stage: "Pre-seed", sectors: ["AI"] }, 2026, 20);
    expect(list).toHaveLength(20);
    expect(list.filter((x) => !x.inv.email)).toHaveLength(5);
  });
  test("apply-only investors are never top picks", () => {
    const applyOnly = { ...base, firm: "Form Fund", email: undefined, applyUrl: "https://form.example", thesis: "AI for SMBs", recent: [{ year: 2026 }] };
    const emailable = { ...base, firm: "Mail Fund", portfolio: ["Made-up Co"] };
    const top = topMatches([applyOnly, emailable], seedAi, 2026, 20);
    expect(top[0].inv.firm).toBe("Mail Fund");
    expect(top.map((x) => x.inv.firm)).toContain("Form Fund");
  });
});

describe("email checks", () => {
  const oneLiner = "Ledgerly helps CA firms file GST returns 3x faster through AI that reads bank statements.";
  const founderLine = "I'm Nisha, a chartered accountant who ran a 40-client practice for five years.";
  const good = { subject: "Ledgerly × Verdant Arc: seed round", body: `Hi Meera,\n\n${oneLiner}\n\n${founderLine}\n\nCould I send the deck?\n\nNisha`, oneLiner, founderLine, company: "Ledgerly" };
  test("a good email passes", () => expect(checkDraft(good)).toEqual([]));
  test("the hook must name a deal when the record has one", () => {
    const rec = { recent: [{ company: "GridLeaf" }], portfolio: ["Made-up Co"] };
    expect(hookNamesADeal("You backed GridLeaf at seed.", rec)).toBeNull();
    expect(hookNamesADeal("You back obsessed outliers from pre-idea.", rec)).toMatch(/named deal/);
    expect(hookNamesADeal("You back obsessed outliers.", { recent: [], portfolio: [] })).toBeNull();
  });
  test("follow-ups stay short and never nag", () => {
    expect(checkFollowup("Hi Meera, a quick note: Kiln Labs now has 70 kilns. Could I send the deck?")).toEqual([]);
    expect(checkFollowup("Hi, just bumping this up in your inbox.").join(" ")).toMatch(/just bumping/);
    // no traction in her profile: any progress claim is invented
    expect(checkFollowup("Kiln Labs retrofits kilns. We're seeing strong traction.", false).join(" ")).toMatch(/Claims progress/);
    expect(checkFollowup("Kiln Labs retrofits kilns. Could I send the deck?", false)).toEqual([]);
  });
  test("flags openers that could go to any investor", () => {
    expect(checkDraft({ ...good, body: good.body + " Climate is on your list of sectors." }).join(" ")).toMatch(/Generic/);
  });
  test("her story can be rephrased, but her numbers can't change and none can be invented", () => {
    const traction = "8 CA firms on pilot, 2 paying.";
    const rephrased = { ...good, traction, body: "Hi Meera,\n\nI ran a 40-client CA practice for five years, so I built Ledgerly: AI that reads bank statements and files GST returns 3x faster. 8 CA firms are on our pilot and 2 pay.\n\nCould I take 20 minutes?\n\nNisha" };
    expect(checkDraft(rephrased)).toEqual([]);
    expect(checkDraft({ ...rephrased, body: rephrased.body.replace("8 CA firms", "10 CA firms") }).join(" ")).toMatch(/changes her number "8"/);
    expect(checkDraft({ ...rephrased, body: rephrased.body + " We grew 300% last quarter." }).join(" ")).toMatch(/number she didn't give us: "300"/);
  });
  test("catches long subjects, banned phrases and a missing company name", () => {
    const bad = checkDraft({ ...good, subject: "An exciting opportunity to invest in our seed round today", body: "I hope this finds you well. We disrupt everything." });
    expect(bad.join(" ")).toMatch(/Subject/);
    expect(bad.join(" ")).toMatch(/hope this finds you well/);
    expect(bad.join(" ")).toMatch(/company/);
  });
  test("flags facts that point at empty fields", () => {
    expect(unsourcedFacts([{ text: "you backed GridLeaf", field: "portfolio" }, { text: "AI for finance", field: "thesis" }], { portfolio: [], thesis: "AI for finance" })).toEqual(["you backed GridLeaf"]);
  });
});
