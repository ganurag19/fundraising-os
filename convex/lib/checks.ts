// Checks every drafted email against the voice rules in AGENTS.md section 4, before she sees it.

const BANNED = ["i hope this finds you well", "game-changing", "game changing", "disrupt", "revolutionis", "revolutioniz", "as an ai", "written by ai", "guarantee", "10x your"];

// Openers that could go to any investor. The hook has to be specific.
const GENERIC = ["on your list of sectors", "among your sectors", "familiar to you", "familiar ground", "from idea to ipo", "idea stage through ipo", "reach out"];

export const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9₹ ]+/g, " ").replace(/\s+/g, " ").trim();

export type DraftCheckInput = { subject: string; body: string; oneLiner: string; founderLine: string; traction?: string; company?: string; investorFacts?: string };

// Numbers as they appear in text: "18%", "₹9L", "3x", "1,200", "six" is not caught (words are fine to rephrase).
const numbers = (s: string) => (s.match(/\d[\d,.]*/g) ?? []).map((n) => n.replace(/[,]/g, "").replace(/\.$/, ""));

/** Returns a list of problems in plain words. Empty means the email passes. */
export function checkDraft(d: DraftCheckInput): string[] {
  const problems: string[] = [];
  if (words(d.subject) >= 8) problems.push("Subject is 8 words or more");
  if (words(d.body) > 120) problems.push(`Body is ${words(d.body)} words (limit 120)`);
  const all = (d.subject + " " + d.body).toLowerCase();
  for (const b of BANNED) if (all.includes(b)) problems.push(`Uses a phrase we never use: "${b}"`);
  for (const g of GENERIC) if (all.includes(g)) problems.push(`Generic line, could go to any investor: "${g}"`);
  // Her story is phrased fresh for each investor, so we check its facts, not its words.
  if (d.company && !norm(d.body).includes(norm(d.company))) problems.push("Doesn't name her company");
  const hers = new Set(numbers(`${d.oneLiner} ${d.founderLine} ${d.traction ?? ""}`));
  const body = new Set(numbers(d.body));
  for (const n of numbers(d.traction ?? "")) if (!body.has(n)) problems.push(`Leaves out or changes her number "${n}"`);
  const allowed = new Set([...hers, ...numbers(d.investorFacts ?? ""), "20"]); // "20 minutes" is our ask
  for (const n of body) if (!allowed.has(n) && !/^\d$/.test(n)) problems.push(`Has a number she didn't give us: "${n}"`);
  return problems;
}

/** The LinkedIn connection note: LinkedIn's 300-character limit, her company named, no number she or the investor didn't give. */
export function checkNote(note: string, d: Omit<DraftCheckInput, "subject" | "body">): string[] {
  const problems: string[] = [];
  if (note.length > 300) problems.push(`LinkedIn note is ${note.length} characters (limit 300)`);
  const low = note.toLowerCase();
  for (const b of BANNED) if (low.includes(b)) problems.push(`LinkedIn note uses a phrase we never use: "${b}"`);
  for (const g of GENERIC) if (low.includes(g)) problems.push(`LinkedIn note has a generic line: "${g}"`);
  if (d.company && !norm(note).includes(norm(d.company))) problems.push("LinkedIn note doesn't name her company");
  const allowed = new Set([...numbers(`${d.oneLiner} ${d.founderLine} ${d.traction ?? ""}`), ...numbers(d.investorFacts ?? ""), "20"]);
  for (const n of numbers(note)) if (!allowed.has(n) && !/^\d$/.test(n)) problems.push(`LinkedIn note has a number she didn't give us: "${n}"`);
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

/** Every email ends with her signature. If a draft came back without one, add it (same lines the prompt asks for). */
export function withSignature(body: string, f: { name: string; company: string; website?: string; linkedin?: string }): string {
  if (body.toLowerCase().includes(`founder, ${f.company.toLowerCase()}`)) return body;
  return [body.trimEnd(), "", f.name, `Founder, ${f.company}`, f.website, f.linkedin].filter((x) => x !== undefined && x !== null).join("\n");
}

// ---------- Raise Kit deck (15 Oct): every number on a slide must be one she gave us ----------

export type Slide = { key: string; headline: string; points: string[]; metrics: { value: string; label: string }[] };
const HYPE = ["revolutionary", "revolutionis", "revolutioniz", "disrupt", "game-changing", "game changing", "world-class", "cutting-edge", "as an ai", "guarantee"];

// A number on a slide, and whether it must be one she gave: anything with two digits or more, and any single digit
// with money or a unit on it ("₹2 Cr", "3x", "5%"). A bare single digit ("3 steps") is fine to write.
const deckNumbers = (s: string) => [...s.matchAll(/(₹|\$|rs\.?\s?)?(\d[\d,.]*)\s?(%|x\b|cr\b|crore|l\b|lakh|k\b|mn?\b|bn?\b)?/gi)]
  .map((m) => ({ n: m[2].replace(/,/g, "").replace(/\.$/, ""), strict: !!(m[1] || m[3]) || m[2].replace(/[,.]/g, "").length > 1 }));
const badNumber = (s: string, ok: Set<string>) => deckNumbers(s).find((x) => x.strict && !ok.has(x.n))?.n;

/** Numbers in the deck that aren't in her facts, and hype words. Empty means the deck passes. */
export function deckProblems(slides: Slide[], teaser: { summary: string; highlights: string[] }, factsText: string, allowed: string[] = []): string[] {
  const ok = new Set([...numbers(factsText), ...allowed]);
  const problems: string[] = [];
  const check = (where: string, s: string) => {
    const bad = badNumber(s, ok);
    if (bad) problems.push(`${where} has a number she didn't give: "${bad}"`);
    const low = s.toLowerCase();
    for (const h of HYPE) if (low.includes(h)) problems.push(`${where} uses a word we never use: "${h}"`);
  };
  for (const sl of slides) {
    check(`Slide ${sl.key} headline`, sl.headline);
    sl.points.forEach((p) => check(`Slide ${sl.key}`, p));
    sl.metrics.forEach((m) => check(`Slide ${sl.key} metric`, `${m.value} ${m.label}`));
  }
  check("Teaser summary", teaser.summary);
  teaser.highlights.forEach((h) => check("Teaser highlight", h));
  return problems;
}

/** Last line of defence: drop any line or metric with a number she didn't give (a headline falls back to its first clean point). */
export function cleanDeck(slides: Slide[], teaser: { summary: string; highlights: string[] }, factsText: string, allowed: string[] = []) {
  const ok = new Set([...numbers(factsText), ...allowed]);
  const clean = (s: string) => !badNumber(s, ok) && !HYPE.some((h) => s.toLowerCase().includes(h));
  const out = slides.map((sl) => {
    const points = sl.points.filter(clean).slice(0, 3);
    return { key: sl.key, headline: clean(sl.headline) ? sl.headline : points[0] ?? "", points, metrics: sl.metrics.filter((m) => clean(`${m.value} ${m.label}`)).slice(0, 3) };
  });
  const sentences = teaser.summary.split(/(?<=[.!?])\s+/).filter(clean);
  return { slides: out, teaser: { summary: sentences.join(" "), highlights: teaser.highlights.filter(clean).slice(0, 5) } };
}
