// Matching and the 0–100 match score, in code (AGENTS.md section 1). The AI never picks investors.
// Weights follow the Fit Score in the strategy page: what they invest in 30, stage 20, cheque 20,
// recent activity 15, researched thesis 10, checked recently 5.

export const SECTOR_KEYS: Record<string, string> = { AI: "ai", "Climate & Energy": "climate", Deeptech: "deeptech" };
export const STAGE_KEYS: Record<string, string> = { Idea: "idea", "Pre-seed": "pre_seed", Seed: "seed", "Pre-Series A": "pre_series_a", "Series A": "series_a" };
// Ask bands in ₹ lakh: [smallest round, largest round]
export const ASK_LAKH: Record<string, [number, number]> = { "₹25–50L": [25, 50], "₹50L–1Cr": [50, 100], "₹1–3 Cr": [100, 300], "₹3–5 Cr": [300, 500], "₹5–10 Cr": [500, 1000] };

export type MatchInvestor = {
  firm?: string; displayName?: string;
  sectors: string[]; stages: string[]; chequeMinLakh?: number; chequeMaxLakh?: number;
  thesis?: string; recent: { year?: number }[]; active?: boolean; lastChecked?: string;
};
export type FounderAsk = { sectors: string[]; stage: string; ask: string };

/** Cheque fit: largest cheque at least 2% of her round, smallest no more than her whole round. Unknown → null. */
export function chequeFits(inv: MatchInvestor, ask: string): boolean | null {
  const band = ASK_LAKH[ask];
  if (!band || (inv.chequeMinLakh === undefined && inv.chequeMaxLakh === undefined)) return null;
  const [roundMin, roundMax] = band;
  if (inv.chequeMaxLakh !== undefined && inv.chequeMaxLakh < 0.02 * roundMin) return false;
  if (inv.chequeMinLakh !== undefined && inv.chequeMinLakh > roundMax) return false;
  return true;
}

/** Returns a score 0–100, or null if the investor shouldn't be shown at all. */
export function scoreInvestor(inv: MatchInvestor, f: FounderAsk, currentYear: number): number | null {
  const wanted = f.sectors.map((s) => SECTOR_KEYS[s]).filter(Boolean);
  const exactSector = wanted.some((s) => inv.sectors.includes(s));
  const anySector = inv.sectors.includes("sector_agnostic");
  if (!exactSector && !anySector) return null;

  const stage = STAGE_KEYS[f.stage];
  const stageKnown = inv.stages.length > 0;
  if (stageKnown && stage && !inv.stages.includes(stage)) return null;

  const cheque = chequeFits(inv, f.ask);
  if (cheque === false) return null;

  let score = 0;
  score += exactSector ? 30 : 15;
  score += stageKnown ? 20 : 8;
  // cheque: more of her round covered ranks higher (a ₹35L cheque on a ₹1 Cr round is 35%)
  const share = inv.chequeMaxLakh !== undefined && ASK_LAKH[f.ask] ? inv.chequeMaxLakh / ASK_LAKH[f.ask][0] : null;
  score += cheque === null ? 8 : share !== null && share >= 0.5 ? 20 : share !== null && share >= 0.2 ? 14 : 10;
  const recentDeal = inv.recent.some((r) => r.year !== undefined && r.year >= currentYear - 1);
  score += recentDeal ? 15 : inv.active ? 10 : 3;
  score += inv.thesis ? 10 : 0;
  score += inv.lastChecked ? 5 : 0;
  return Math.min(100, score);
}

const firmKey = (i: MatchInvestor): string | null => { const n = i.firm ?? i.displayName; return n ? n.toLowerCase().replace(/[^a-z0-9]/g, "") : null; };

/** Ranks investors and returns the best `n`, highest score first. Ties go to the one with a researched thesis. One per firm. */
export function topMatches<T extends MatchInvestor>(investors: T[], f: FounderAsk, currentYear: number, n: number): { inv: T; score: number }[] {
  return investors
    .map((inv) => ({ inv, score: scoreInvestor(inv, f, currentYear) }))
    .filter((x): x is { inv: T; score: number } => x.score !== null)
    .sort((a, b) => b.score - a.score || Number(!!b.inv.thesis) - Number(!!a.inv.thesis) || (b.inv.chequeMaxLakh ?? 0) - (a.inv.chequeMaxLakh ?? 0))
    // one person per firm: three picks from three different funds
    .filter((x, i, all) => { const k = firmKey(x.inv); return k === null || all.findIndex((y) => firmKey(y.inv) === k) === i; })
    .slice(0, n);
}
