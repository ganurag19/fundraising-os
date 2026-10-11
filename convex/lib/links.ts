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
