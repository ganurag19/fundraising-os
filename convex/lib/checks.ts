// Checks every drafted email against the voice rules in AGENTS.md section 4, before she sees it.

const BANNED = ["i hope this finds you well", "game-changing", "game changing", "disrupt", "revolutionis", "revolutioniz", "as an ai", "written by ai", "guarantee", "10x your"];

// Openers that could go to any investor. The hook has to be specific.
const GENERIC = ["on your list of sectors", "among your sectors", "familiar to you", "familiar ground", "from idea to ipo", "idea stage through ipo", "reach out"];

export const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9₹ ]+/g, " ").replace(/\s+/g, " ").trim();

export type DraftCheckInput = { subject: string; body: string; oneLiner: string; founderLine: string; traction?: string };

/** Returns a list of problems in plain words. Empty means the email passes. */
export function checkDraft(d: DraftCheckInput): string[] {
  const problems: string[] = [];
  if (words(d.subject) >= 8) problems.push("Subject is 8 words or more");
  if (words(d.body) > 120) problems.push(`Body is ${words(d.body)} words (limit 120)`);
  const all = (d.subject + " " + d.body).toLowerCase();
  for (const b of BANNED) if (all.includes(b)) problems.push(`Uses a phrase we never use: "${b}"`);
  for (const g of GENERIC) if (all.includes(g)) problems.push(`Generic line, could go to any investor: "${g}"`);
  if (d.oneLiner && !norm(d.body).includes(norm(d.oneLiner).slice(0, 40))) problems.push("Missing the company one-liner");
  if (d.founderLine && !norm(d.body).includes(norm(d.founderLine).slice(0, 30))) problems.push("Missing the founder line");
  if (d.traction && !norm(d.body).includes(norm(d.traction).slice(0, 30))) problems.push("Missing her traction line");
  return problems;
}

/** Facts the email used must point at fields that exist in the investor's record. */
export function unsourcedFacts(facts: { text: string; field: string }[], record: Record<string, unknown>): string[] {
  return facts
    .filter((f) => {
      const v = record[f.field];
      return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
    })
    .map((f) => f.text);
}

// Follow-ups: short, no guilt, no stock phrases (AGENTS.md section 4 voice rules).
const NAGS = ["just bumping", "bumping this", "did you see my", "i know you're busy", "circling back", "touching base", "i hope this finds you well", "as an ai"];

// Progress words that need a number she gave us. Without traction in her profile, none of these may appear.
const PROGRESS = /\b(traction|adopt\w*|grow\w*|growth|customers?|clients?|revenue|paying|pilots?|users|signed up|momentum|demand|interest from)\b/i;

export function checkFollowup(body: string, hasTraction = true): string[] {
  const problems: string[] = [];
  if (!hasTraction && PROGRESS.test(body)) problems.push(`Claims progress she didn't give us: "${body.match(PROGRESS)![0]}"`);
  const n = words(body);
  if (n > 80) problems.push(`Follow-up is ${n} words (limit about 60)`);
  const low = body.toLowerCase();
  for (const p of NAGS) if (low.includes(p)) problems.push(`Uses a phrase we never use: "${p}"`);
  return problems;
}

/** If the investor's record names deals or portfolio companies, the email must open on one of them. */
export function hookNamesADeal(body: string, record: { recent?: { company: string }[]; portfolio?: string[] }): string | null {
  const names = [...(record.recent ?? []).map((r) => r.company), ...(record.portfolio ?? [])].filter((n) => n && n.length > 2);
  if (!names.length) return null;
  const low = body.toLowerCase();
  return names.some((n) => low.includes(n.toLowerCase())) ? null : "Opens on their website copy, not a named deal or portfolio company";
}
