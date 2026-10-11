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
  thesis?: string; portfolio?: string[]; recent: { year?: number }[]; active?: boolean; lastChecked?: string;
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

// Words that show a written thesis is about her sector, not just tech in general.
const THESIS_WORDS: Record<string, RegExp> = {
  ai: /\b(ai|artificial intelligence|machine learning|ml|genai|llms?|agentic)\b/i,
  climate: /climate|energy|sustainab|clean ?tech|carbon|decarboni|\bev\b|electric|renewable/i,
  deeptech: /deep ?tech|hardware|robotic|semiconductor|space|biotech|frontier|ip-led/i,
};

/** Returns a score 0–100, or null if the investor shouldn't be shown at all.
 *  Focused investors beat generalists: a fund with 3 sectors and 2 stages outranks one that does everything. */
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
  const band = ASK_LAKH[f.ask];

  let score = 0;
  score += exactSector ? (inv.sectors.length <= 4 ? 30 : 24) : 12;
  score += !stageKnown ? 8 : inv.stages.length <= 3 ? 20 : 14;
  // cheque: more of her round covered ranks higher; a smallest cheque above her smallest round fits less well
  const share = inv.chequeMaxLakh !== undefined && band ? inv.chequeMaxLakh / band[0] : null;
  score += cheque === null ? 8
    : inv.chequeMinLakh !== undefined && band && inv.chequeMinLakh > band[0] ? 10
    : share !== null && share >= 0.5 ? 20 : share !== null && share >= 0.2 ? 15 : 10;
  const lastYear = Math.max(0, ...inv.recent.map((r) => r.year ?? 0));
  score += lastYear >= currentYear - 1 ? 15 : lastYear >= currentYear - 3 ? 10 : inv.active ? 8 : 3;
  score += !inv.thesis ? 0 : wanted.some((s) => THESIS_WORDS[s]?.test(inv.thesis!)) ? 10 : 5;
  score += inv.lastChecked ? 5 : 0;
  return Math.min(100, score);
}

/** A top pick needs something specific to open the email on: a deal, a portfolio company or a written thesis. */
export const hasHook = (i: MatchInvestor) => i.recent.length > 0 || (i.portfolio?.length ?? 0) > 0 || !!i.thesis;

const firmKey = (i: MatchInvestor): string | null => { const n = i.firm ?? i.displayName; return n ? n.toLowerCase().replace(/[^a-z0-9]/g, "") : null; };

/** Every investor that fits, highest score first, one per firm. Ties go to a researched thesis, then a bigger cheque. */
export function rankMatches<T extends MatchInvestor>(investors: T[], f: FounderAsk, currentYear: number): { inv: T; score: number }[] {
  return investors
    .map((inv) => ({ inv, score: scoreInvestor(inv, f, currentYear) }))
    .filter((x): x is { inv: T; score: number } => x.score !== null)
    .sort((a, b) => b.score - a.score || Number(!!b.inv.thesis) - Number(!!a.inv.thesis) || (b.inv.chequeMaxLakh ?? 0) - (a.inv.chequeMaxLakh ?? 0))
    .filter((x, i, all) => { const k = firmKey(x.inv); return k === null || all.findIndex((y) => firmKey(y.inv) === k) === i; });
}

/** Her list: the 3 best investors with a hook first (the top picks), then the next best, up to `n`. */
export function topMatches<T extends MatchInvestor>(investors: T[], f: FounderAsk, currentYear: number, n: number): { inv: T; score: number }[] {
  const ranked = rankMatches(investors, f, currentYear);
  const picks = ranked.filter((x) => hasHook(x.inv)).slice(0, 3);
  return [...picks, ...ranked.filter((x) => !picks.includes(x))].slice(0, n);
}
