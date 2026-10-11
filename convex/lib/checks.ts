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
