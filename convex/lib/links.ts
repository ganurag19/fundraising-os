// Her website and LinkedIn: cleaned once, the same way everywhere.

/** "verdera.ai/" → "https://verdera.ai". Returns null for anything that isn't a public web address. */
export function normaliseUrl(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  let u: URL;
  try { u = new URL(s); } catch { return null; }
  const host = u.hostname.toLowerCase();
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(host)) return null; // no IPs, no localhost
  if (u.username || u.password || (u.port && u.port !== "443" && u.port !== "80")) return null;
  return `https://${host}${u.pathname.replace(/\/+$/, "")}`;
}

/** Only a person's or company's LinkedIn page. */
export function normaliseLinkedin(raw: string): string | null {
  const u = normaliseUrl(raw);
  if (!u) return null;
  return /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/(in|company)\/[^/]+$/i.test(u) ? u.replace(/^https:\/\/[a-z]{2,3}\.linkedin/i, "https://www.linkedin") : null;
}

/** For signatures and cards: "https://www.verdera.ai" → "verdera.ai". */
export const shortUrl = (u: string) => u.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");

/** Domain of a web address or an email, for the internal "is this really her company" check. */
export const domainOf = (s: string) => (s.includes("@") ? s.split("@")[1] : shortUrl(s).split("/")[0]).toLowerCase().replace(/^www\./, "");

// Shown-to-founder clean-ups (review 2026-10-14). The stored research is left as it is; these only shape what she sees.

/** A website field can hold junk like "fund.in; name@fund.in". Return the first real web address, never an email. */
export function cleanWebsite(raw: string | undefined): string | null {
  if (!raw) return null;
  for (const part of raw.split(/[;,\s|]+/)) {
    if (!part || part.includes("@")) continue;
    const u = normaliseUrl(part);
    if (u && /\.[a-z]{2,}(\/|$)/i.test(shortUrl(u))) return u;
  }
  return null;
}

const CITY_ALIASES: Record<string, string> = { bangalore: "Bengaluru", bengaluru: "Bengaluru", gurgaon: "Gurugram", bombay: "Mumbai", "new delhi": "New Delhi", delhi: "Delhi", "delhi ncr": "Delhi NCR", ncr: "Delhi NCR" };

/** "New delhi" → "New Delhi", "Mumbai and Washington DC" → "Mumbai", "bangalore" → "Bengaluru". */
export function cleanCity(raw: string | undefined): string | null {
  const first = (raw ?? "").split(/\s+(?:and|&)\s+|[,;/|]/i)[0]?.trim();
  if (!first) return null;
  const alias = CITY_ALIASES[first.toLowerCase()];
  if (alias) return alias;
  return first.split(/\s+/).map((w) => (w.length <= 3 && w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1).toLowerCase())).join(" ");
}

const ROUNDS: Record<string, string> = { idea: "idea", pre_seed: "pre-seed", seed: "seed", pre_series_a: "pre-Series A", series_a: "Series A", series_b: "Series B", series_b_plus: "Series B+", growth: "growth" };
/** "pre_series_a" → "pre-Series A"; anything else loses its underscores. */
export const roundLabel = (r: string) => ROUNDS[r.toLowerCase()] ?? r.replace(/_/g, " ");

const FREE_MAIL = new Set(["gmail.com", "googlemail.com", "yahoo.com", "yahoo.in", "outlook.com", "hotmail.com", "live.com", "icloud.com", "proton.me", "protonmail.com", "rediffmail.com", "zoho.com"]);
const sameOrSub = (a: string, b: string) => a === b || a.endsWith("." + b) || b.endsWith("." + a);

/** Her own company's domain on an investor's website or email (e.g. a corporate fund of her own company): a conflict, so leave them out. */
export function sharesHerDomain(founderWebsite: string | undefined, inv: { website?: string; email?: string }): boolean {
  if (!founderWebsite) return false;
  const mine = domainOf(founderWebsite);
  if (!mine || !mine.includes(".") || FREE_MAIL.has(mine)) return false;
  const theirs = [cleanWebsite(inv.website), inv.email].filter((x): x is string => !!x).map(domainOf);
  return theirs.some((d) => !FREE_MAIL.has(d) && sameOrSub(d, mine));
}
