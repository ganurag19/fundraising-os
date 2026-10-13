// Matching and the 0–100 match score, in code (AGENTS.md section 1). The AI never picks investors.
// Weights follow the Fit Score in the strategy page: what they invest in 30, stage 20, cheque 20,
// recent activity 15, researched thesis 10, checked recently 5.

export const SECTOR_KEYS: Record<string, string> = { AI: "ai", "Climate & Energy": "climate", Deeptech: "deeptech" };
export const STAGE_KEYS: Record<string, string> = { Idea: "idea", "Pre-seed": "pre_seed", Seed: "seed", "Pre-Series A": "pre_series_a", "Series A": "series_a" };
// Ask bands in ₹ lakh: [smallest round, largest round]
export const ASK_LAKH: Record<string, [number, number]> = { "₹25–50L": [25, 50], "₹50L–1Cr": [50, 100], "₹1–3 Cr": [100, 300], "₹3–5 Cr": [300, 500], "₹5–10 Cr": [500, 1000] };

export type MatchInvestor = {
  firm?: string; displayName?: string; kind?: string; email?: string; applyUrl?: string;
  sectors: string[]; stages: string[]; chequeMinLakh?: number; chequeMaxLakh?: number;
  thesis?: string; portfolio?: string[]; recent: { year?: number; sector?: string }[]; active?: boolean; lastChecked?: string;
  retired?: boolean;
};

/** Deal evidence for her sectors: how many of the investor's tagged recent deals (last 3 years) are in her space. */
export function sectorEvidence(inv: MatchInvestor, f: FounderAsk, currentYear: number): { inHers: number; tagged: number; label: string | null } {
  const wanted = f.sectors.map((s) => SECTOR_KEYS[s]).filter(Boolean);
  const tagged = inv.recent.filter((r) => r.year !== undefined && r.year >= currentYear - 2 && r.sector);
  const inHers = tagged.filter((r) => wanted.includes(r.sector!)).length;
  const name = f.sectors.length === 1 ? f.sectors[0].replace(" & Energy", "").toLowerCase().replace(/^ai$/, "AI") : "your space";
  return { inHers, tagged: tagged.length, label: tagged.length ? `${inHers} of ${tagged.length} recent deals are ${name}` : null };
}

// Programmes only make sense early: accelerators at idea or pre-seed, grants up to seed.
const PROGRAMME_STAGES: Record<string, string[]> = { accelerator: ["idea", "pre_seed"], grant: ["idea", "pre_seed", "seed"] };
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

export type ScorePart = { key: string; label: string; got: number; max: number };

/** The score, part by part, so a founder can see where her number comes from. Null if the investor shouldn't be shown at all.
 *  Focused investors beat generalists: a fund with 3 sectors and 2 stages outranks one that does everything. */
export function scoreParts(inv: MatchInvestor, f: FounderAsk, currentYear: number): ScorePart[] | null {
  const wanted = f.sectors.map((s) => SECTOR_KEYS[s]).filter(Boolean);
  const exactSector = wanted.some((s) => inv.sectors.includes(s));
  const anySector = inv.sectors.includes("sector_agnostic");
  const ev = sectorEvidence(inv, f, currentYear);
  if (!exactSector && !anySector && ev.inHers === 0) return null;
  if (!inv.email && !inv.applyUrl) return null; // no way to reach them
  if (inv.retired) return null; // dropped from the research

  const stage = STAGE_KEYS[f.stage];
  const programme = inv.kind ? PROGRAMME_STAGES[inv.kind] : undefined;
  if (programme && !programme.includes(stage)) return null;
  const stageKnown = inv.stages.length > 0;
  if (stageKnown && stage && !inv.stages.includes(stage)) return null;

  const cheque = chequeFits(inv, f.ask);
  if (cheque === false) return null;
  const band = ASK_LAKH[f.ask];

  // cheque: more of her round covered ranks higher; a smallest cheque above her smallest round fits less well
  const share = inv.chequeMaxLakh !== undefined && band ? inv.chequeMaxLakh / band[0] : null;
  const chequePts = cheque === null ? 8
    : inv.chequeMinLakh !== undefined && band && inv.chequeMinLakh > band[0] ? 10
    : share !== null && share >= 0.5 ? 20 : share !== null && share >= 0.2 ? 15 : 10;
  const lastYear = Math.max(0, ...inv.recent.map((r) => r.year ?? 0));
  return [
    { key: "sector", label: ev.label ? `Invests in your space · ${ev.label}` : "Invests in your space", got: sectorPoints(exactSector, inv.sectors.length, ev), max: 30 },
    { key: "stage", label: "Invests at your stage", got: !stageKnown ? 8 : inv.stages.length <= 3 ? 20 : 14, max: 20 },
    { key: "cheque", label: "Cheque fits your round", got: chequePts, max: 20 },
    { key: "recent", label: "Invested recently", got: lastYear >= currentYear - 1 ? 15 : lastYear >= currentYear - 3 ? 10 : inv.active ? 8 : 3, max: 15 },
    { key: "thesis", label: "Their stated focus matches", got: !inv.thesis ? 0 : wanted.some((s) => THESIS_WORDS[s]?.test(inv.thesis!)) ? 10 : 5, max: 10 },
    { key: "checked", label: "Recently checked by us", got: inv.lastChecked ? 5 : 0, max: 5 },
  ];
}

/** "Invests in your space", out of 30. Deals beat labels: 2+ deals in her sector in 3 years is full marks, even for
 *  a sector-agnostic fund; a listed sector with none of 5+ tagged recent deals in it drops to 24. */
function sectorPoints(exact: boolean, listed: number, ev: { inHers: number; tagged: number }): number {
  if (ev.inHers >= 2) return 30;
  const fromLabels = exact ? (listed <= 4 ? 30 : 24) : 12;
  if (ev.inHers === 1) return Math.max(fromLabels, 24);
  if (exact && ev.tagged >= 5) return Math.min(fromLabels, 24);
  return fromLabels;
}

/** Returns a score 0–100, or null if the investor shouldn't be shown at all. */
export function scoreInvestor(inv: MatchInvestor, f: FounderAsk, currentYear: number): number | null {
  const parts = scoreParts(inv, f, currentYear);
  return parts ? Math.min(100, parts.reduce((n, p) => n + p.got, 0)) : null;
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

export const APPLY_ONLY_CAP = 5;

/** Her list: the 3 best investors with a hook first (the top picks), then the next best, up to `n`. */
export function topMatches<T extends MatchInvestor>(investors: T[], f: FounderAsk, currentYear: number, n: number): { inv: T; score: number }[] {
  const ranked = rankMatches(investors, f, currentYear);
  // Top picks get a written email, so they need an email address (apply-only investors never are).
  const picks = ranked.filter((x) => hasHook(x.inv) && !!x.inv.email).slice(0, 3);
  // Apply-only rows (mostly incubators and grants) fill at most APPLY_ONLY_CAP of her list, so funds aren't crowded out.
  let applyOnly = 0;
  const rest = ranked.filter((x) => !picks.includes(x)).filter((x) => x.inv.email || ++applyOnly <= APPLY_ONLY_CAP);
  return [...picks, ...rest].slice(0, n);
}
