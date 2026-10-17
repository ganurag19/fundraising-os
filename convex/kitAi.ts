"use node";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { normaliseUrl } from "./lib/links";
import { DECK_REVIEW_SYSTEM, DECK_SYSTEM, DOC_FACTS_SYSTEM, KIT_SECTORS, MARKET_SYSTEM, SITE_FACTS_SYSTEM } from "./lib/prompt";
import { getAuthUserId } from "@convex-dev/auth/server";
import { cleanDeck, deckProblems } from "./lib/checks";
import { pageText } from "./suggest";
import { firstEmails } from "./write";
import { limits } from "./limits";

// The Raise Kit's AI work (15 Oct): read her website (facts + brand), read her files, build her deck and teaser.
const HAIKU = "claude-haiku-4-5"; // reading her site and files (AGENTS.md section 4: the website one-liner runs on Haiku)
const SONNET = "claude-sonnet-5-5"; // her deck and teaser, like her first drafts
const MARKET_MODEL = SONNET; // market research with web search: accuracy and relevance first (16 Oct)
const BUSY = "Busy right now. Try again in a few minutes.";
const TOKEN = /^[a-f0-9]{48}$/;
const MAX_HTML = 500_000;
const MAX_CSS = 250_000;
const MAX_FILE = 15 * 1024 * 1024;
const KIT_TOP = 5; // her top picks with a pitch written (same as founders.KIT_TOP)

const errText = (e: unknown) => (e instanceof Anthropic.APIError ? `API ${e.status}: ${e.message}` : e instanceof Error ? e.message : String(e)).slice(0, 500);

async function logCall(ctx: ActionCtx, a: { founderId?: Id<"founders">; purpose: string; model: string; input: string; output: string; started: number; usage?: { input_tokens: number; output_tokens: number }; error?: string }) {
  await ctx.runMutation(internal.founders.logAiCall, {
    founderId: a.founderId, purpose: a.purpose, model: a.model, input: a.input.slice(0, 20000), output: a.output.slice(0, 20000), ms: Date.now() - a.started,
    inputTokens: a.usage?.input_tokens, outputTokens: a.usage?.output_tokens, error: a.error,
  });
}

/* ---------- 1. Reading your website ---------- */

const SiteFacts = z.object({
  found: z.boolean(), companyName: z.string(), oneLiner: z.string(), problem: z.string(), product: z.string(), forWho: z.string(),
  customers: z.string(), sectors: z.array(z.string()), numbers: z.array(z.string()),
  team: z.array(z.object({ name: z.string(), role: z.string(), line: z.string() })),
  problemOptions: z.array(z.string()), productOptions: z.array(z.string()),
});

async function fetchText(url: string, accept: string, max: number): Promise<{ text: string; url: string } | null> {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(9000), headers: { "user-agent": "Mozilla/5.0 (compatible; FirstCheq/1.0; reads the founder's own site once, on her request)", accept, "accept-language": "en-IN,en;q=0.9" } });
    if (!res.ok) return null;
    const final = normaliseUrl(res.url); // redirects must still land on a public site
    if (!final) return null;
    return { text: (await res.text()).slice(0, max), url: res.url };
  } catch {
    return null;
  }
}

/** Her site's home page, however the domain is set up. Many sites only answer on one of "example.in" and
 *  "www.example.in", or park the bare domain on a tiny forwarding page (a meta refresh or a script redirect).
 *  So: try the address, follow a page-level redirect, and fall back to the www (or bare) version. */
export async function fetchSite(url: string): Promise<{ text: string; url: string } | null> {
  const tryOne = async (u: string) => {
    const page = await fetchText(u, "text/html", MAX_HTML);
    if (!page) return null;
    if (page.text.length > 1500) return page;
    // a forwarding page: <meta http-equiv="refresh" content="0;url=..."> or location.href / location.replace(...)
    const to = page.text.match(/http-equiv=["']?refresh["']?[^>]*content=["'][^"']*url=([^"'>\s]+)/i)?.[1]
      ?? page.text.match(/location(?:\.href)?\s*(?:=|\.replace\(|\.assign\()\s*["']([^"']+)["']/i)?.[1];
    const next = to ? normaliseUrl(new URL(to, page.url).href) : null;
    if (next && next !== u) { const real = await fetchText(next, "text/html", MAX_HTML); if (real) return real; }
    return page;
  };
  const first = await tryOne(url);
  if (first && first.text.length > 1500) return first;
  const host = new URL(url).hostname;
  const alt = normaliseUrl(url.replace(host, host.startsWith("www.") ? host.slice(4) : `www.${host}`));
  const second = alt ? await tryOne(alt) : null;
  if (second && (!first || second.text.length > first.text.length)) return second;
  return first;
}

const abs = (href: string | undefined, base: string) => {
  if (!href) return null;
  try { const u = new URL(href.replace(/&amp;/g, "&"), base); return u.protocol === "https:" ? u.href : null; } catch { return null; }
};
const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];

/** Hex colours that read as a brand colour: not grey, not near-white or near-black. */
function brandish(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  return s > 0.3 && l > 0.18 && l < 0.78;
}
const longHex = (h: string) => (h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h).toLowerCase();
const GENERIC_FONTS = new Set(["inherit", "initial", "sans-serif", "serif", "monospace", "system-ui", "-apple-system", "blinkmacsystemfont", "segoe ui", "roboto", "helvetica", "helvetica neue", "arial", "ui-sans-serif", "ui-serif", "apple color emoji", "segoe ui emoji", "noto color emoji", "times new roman", "var", "cursive"]);

/** Her logo, colours and font, from the page and its first stylesheets. Everything is a guess she confirms. */
export async function brandFrom(html: string, base: string): Promise<{ palette: string[]; logo: string | null; font: string | null; fontCss: string | null }> {
  const tags = html.match(/<(meta|link|img)\b[^>]*>/gi) ?? [];
  const metaColor = tags.map((t) => (/name=["']theme-color["']/i.test(t) ? attr(t, "content") : null)).find(Boolean);
  // Logo: an <img> that says "logo", then the touch icon, then a large icon, then the social image.
  const logoImg = tags.find((t) => /^<img/i.test(t) && /logo/i.test(t) && attr(t, "src") && !/data:/i.test(attr(t, "src") ?? ""));
  const touch = tags.find((t) => /^<link/i.test(t) && /rel=["'][^"']*apple-touch-icon/i.test(t));
  const icon = tags.find((t) => /^<link/i.test(t) && /rel=["'][^"']*icon/i.test(t) && /(svg|png)/i.test(attr(t, "href") ?? ""));
  const og = tags.find((t) => /property=["']og:image["']/i.test(t));
  const logo = abs(logoImg ? attr(logoImg, "src") : undefined, base) ?? abs(touch ? attr(touch, "href") : undefined, base) ?? abs(icon ? attr(icon, "href") : undefined, base) ?? abs(og ? attr(og, "content") : undefined, base);

  let css = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) ?? []).join("\n") + "\n" + (html.match(/style=["'][^"']*["']/gi) ?? []).join("\n");
  const sheets = tags.filter((t) => /^<link/i.test(t) && /rel=["']stylesheet["']/i.test(t)).map((t) => abs(attr(t, "href"), base)).filter((u): u is string => !!u && !/fonts\.googleapis/.test(u)).slice(0, 2);
  for (const s of await Promise.all(sheets.map((u) => fetchText(u, "text/css", MAX_CSS)))) if (s) css += "\n" + s.text;

  const counts = new Map<string, number>();
  const add = (h: string, w: number) => { const x = longHex(h); if (brandish(x)) counts.set(x, (counts.get(x) ?? 0) + w); };
  for (const m of css.matchAll(/--[\w-]*(primary|brand|accent|main)[\w-]*\s*:\s*(#[0-9a-f]{6}|#[0-9a-f]{3})\b/gi)) add(m[2], 8);
  for (const m of css.matchAll(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi)) add(m[0], 1);
  for (const m of css.matchAll(/rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/gi)) add(`#${[m[1], m[2], m[3]].map((x) => Math.min(255, +x).toString(16).padStart(2, "0")).join("")}`, 1);
  if (metaColor && /^#[0-9a-f]{3,6}$/i.test(metaColor)) add(metaColor, 12);
  const palette = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([h]) => h).slice(0, 5);

  // Her site's own Google Fonts link (exact families and weights). The font that's used most in her CSS wins.
  const gfHref = html.match(/https:\/\/fonts\.googleapis\.com\/css2?\?[^"'\s>]+/i)?.[0]?.replace(/&amp;/g, "&") ?? null;
  const gfFamilies = gfHref ? [...gfHref.matchAll(/family=([^&:]+)/g)].map((m) => decodeURIComponent(m[1].replace(/\+/g, " ")).trim()) : [];
  const usage = (f: string) => (css.match(new RegExp(`font-family\\s*:\\s*["']?${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "gi")) ?? []).length;
  let font = gfFamilies.sort((a, b) => usage(b) - usage(a))[0] ?? null;
  if (!font) {
    const fams = new Map<string, number>();
    for (const m of css.matchAll(/font-family\s*:\s*([^;}{]+)/gi)) {
      const first = m[1].split(",")[0].trim().replace(/^["']|["']$/g, "");
      if (first && !GENERIC_FONTS.has(first.toLowerCase()) && /^[A-Za-z0-9 ]{2,40}$/.test(first)) fams.set(first, (fams.get(first) ?? 0) + 1);
    }
    font = [...fams.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }
  return { palette, logo, font, fontCss: gfHref && /^https:\/\/fonts\.googleapis\.com\/css2?\?[\w\-+:;,@.&=%]{3,400}$/.test(gfHref) ? gfHref : null };
}

const siteOut = v.object({
  ok: v.literal(true), companyName: v.string(), oneLiner: v.string(), problem: v.string(), product: v.string(), forWho: v.string(), customers: v.string(),
  sectors: v.array(v.string()), numbers: v.array(v.string()), team: v.array(v.object({ name: v.string(), role: v.string(), line: v.string() })),
  problemOptions: v.array(v.string()), productOptions: v.array(v.string()),
  brand: v.object({ palette: v.array(v.string()), logo: v.union(v.string(), v.null()), font: v.union(v.string(), v.null()), fontCss: v.union(v.string(), v.null()) }),
});
type SiteOut = { ok: true; companyName: string; oneLiner: string; problem: string; product: string; forWho: string; customers: string; sectors: string[]; numbers: string[]; team: { name: string; role: string; line: string }[]; problemOptions: string[]; productOptions: string[]; brand: { palette: string[]; logo: string | null; font: string | null; fontCss: string | null } };

/** Step 1 of /build, before she has a record: read her site once. Limited per visitor token. */
export const readSite = action({
  args: { token: v.string(), website: v.string() },
  returns: v.union(siteOut, v.object({ ok: v.literal(false), error: v.string() })),
  handler: async (ctx, { token, website }): Promise<SiteOut | { ok: false; error: string }> => {
    if (!TOKEN.test(token)) return { ok: false as const, error: "Please reload the page and try again." };
    const url = normaliseUrl(website);
    if (!url) return { ok: false as const, error: "That website doesn't look right. Try something like kilnlabs.in." };
    if (!(await limits.limit(ctx, "websiteReadsPerVisitor", { key: token })).ok) return { ok: false as const, error: "We've read enough sites for today. Fill in your facts by hand on the next screens." };
    const page = await fetchSite(url);
    if (!page) return { ok: false as const, error: "We couldn't open that website. Check the address, or fill in your facts by hand." };
    let text = pageText(page.text);
    if (text.length < 400) { const about = await fetchText(new URL(page.url).origin + "/about", "text/html", MAX_HTML); if (about) text += "\n" + pageText(about.text); }
    if (text.length < 80) return { ok: false as const, error: "Your website didn't have enough text for us to read. Fill in your facts by hand." };
    const [brand, calls] = await Promise.all([brandFrom(page.text, page.url), limits.limit(ctx, "aiCallsGlobal", { count: 1 })]);
    if (!calls.ok) return { ok: false as const, error: BUSY };
    const input = `SITE: ${page.url}\n\nSITE TEXT:\n${text}`;
    const started = Date.now();
    try {
      const res = await new Anthropic().messages.parse({ model: HAIKU, max_tokens: 1500, system: SITE_FACTS_SYSTEM, messages: [{ role: "user", content: input }], output_config: { format: zodOutputFormat(SiteFacts) } });
      const out = res.parsed_output;
      await logCall(ctx, { purpose: "kit_read_site", model: HAIKU, input, output: out ? JSON.stringify(out) : `stop_reason: ${res.stop_reason}`, started, usage: res.usage });
      if (!out || !out.found || !out.companyName.trim()) return { ok: false as const, error: "Your website didn't say enough about your startup. Fill in your facts by hand." };
      await ctx.runMutation(internal.kit.logStep, { step: "kit_site_read" });
      const t = (s: string, n: number) => s.trim().slice(0, n);
      return {
        ok: true as const, companyName: t(out.companyName, 80), oneLiner: t(out.oneLiner, 200), problem: t(out.problem, 300), product: t(out.product, 300), forWho: t(out.forWho, 120),
        customers: t(out.customers, 200), sectors: out.sectors.filter((x) => (KIT_SECTORS as readonly string[]).includes(x)).slice(0, 2),
        numbers: out.numbers.map((x) => t(x, 120)).slice(0, 5), team: out.team.slice(0, 4).map((m) => ({ name: t(m.name, 60), role: t(m.role, 60), line: t(m.line, 160) })),
        problemOptions: out.problemOptions.map((x) => t(x, 200)).slice(0, 3), productOptions: out.productOptions.map((x) => t(x, 200)).slice(0, 3), brand,
      };
    } catch (e) {
      await logCall(ctx, { purpose: "kit_read_site", model: HAIKU, input, output: "", started, error: errText(e) });
      return { ok: false as const, error: BUSY };
    }
  },
});

/* ---------- Investor logos: from each fund's own site, for her top 5 ---------- */

/** The best logo a page offers: an apple-touch-icon, a large PNG/SVG icon, then its social image. */
export function logoFrom(html: string, base: string): string | null {
  const tags = html.match(/<(meta|link)\b[^>]*>/gi) ?? [];
  const touch = tags.find((t) => /^<link/i.test(t) && /rel=["'][^"']*apple-touch-icon/i.test(t));
  const icon = tags.find((t) => /^<link/i.test(t) && /rel=["'][^"']*icon/i.test(t) && /(svg|png)/i.test(attr(t, "href") ?? ""));
  const og = tags.find((t) => /property=["']og:image["']/i.test(t));
  return abs(touch ? attr(touch, "href") : undefined, base) ?? abs(icon ? attr(icon, "href") : undefined, base) ?? abs(og ? attr(og, "content") : undefined, base);
}

export const logos = action({
  args: { token: v.string() },
  returns: v.number(),
  handler: async (ctx, { token }): Promise<number> => {
    if (!TOKEN.test(token)) return 0;
    const todo: { id: Id<"investors">; website: string }[] = await ctx.runQuery(internal.kit.topForLogos, { token });
    if (!todo.length || !(await limits.limit(ctx, "logoLooksPerVisitor", { key: token })).ok) return 0;
    let found = 0;
    await Promise.all(todo.map(async (t) => {
      const url = normaliseUrl(t.website);
      const page = url ? await fetchSite(url) : null;
      const logo = page ? logoFrom(page.text, page.url) : null;
      if (logo) found++;
      await ctx.runMutation(internal.kit.saveLogo, { id: t.id, logo });
    }));
    return found;
  },
});

/* ---------- 1b. Her top picks' people: partners and team from each fund's own website (never LinkedIn) ---------- */

const TeamOut = z.object({ people: z.array(z.object({ name: z.string(), role: z.string(), photo: z.string() })) });
const TEAM_SYSTEM = `You read one investment firm's own web page and list the people the page itself names as its partners or investment team. You get PAGE (the page text) and IMAGES (numbered images on the page with their alt text).
Return people: up to 8, partners and investment team first (and CONTACT ON OUR RECORD first if the page names them), then others named on the page as team. For each: name exactly as written on the page; role as written (e.g. "Managing Partner"), or "" if none; photo: the number of the image that is clearly that person's photo (its alt text, file name, or the text right after it names them), as a string, or "" if unsure.
Only people the page names as working at this firm. Never portfolio founders, advisors of other companies, testimonials or authors of blog posts. If the page names nobody, return an empty list.`;

const decode = (t: string) => t.replace(/&amp;/g, "&").replace(/&#x27;|&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ");
const TEAM_PATHS = ["/team", "/our-team", "/people", "/about-us", "/about", "/who-we-are", "/partners", "/team.html", "/about.html", "/aboutus.php", "/about-us/team"];

/** Links on a page that look like its team page (by the link's own address), same site only, best first. */
function teamLinks(html: string, base: string): string[] {
  const host = new URL(base).hostname.replace(/^www\./, "");
  const out: string[] = [];
  for (const m of html.matchAll(/<a\b[^>]*?href=["']([^"'#]+)["']/gi)) {
    const href = abs(m[1], base);
    if (!href) continue;
    const u = new URL(href);
    if (u.hostname.replace(/^www\./, "") !== host) continue;
    if (/(team|people|partners|who-we-are|about)/i.test(u.pathname)) out.push(href.replace(/\/$/, ""));
  }
  const rank = (u: string) => (/team|people|partners/i.test(u) ? 0 : 1);
  return [...new Set(out)].sort((a, b) => rank(a) - rank(b)).slice(0, 3);
}

/** Every picture on the page that could be a person: <img> (src, srcset, lazy attributes) and CSS background images,
 *  each with the text printed right after it, which is usually the person's name and role. */
function pictures(html: string, base: string): { src: string; alt: string; near: string }[] {
  const out: { src: string; alt: string; near: string }[] = [];
  const near = (i: number) => decode(html.slice(i, i + 900).replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim().slice(0, 110);
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const raw = attr(tag, "data-src") ?? attr(tag, "data-lazy-src") ?? attr(tag, "src") ?? attr(tag, "srcset")?.split(/\s+/)[0];
    const src = raw && !raw.startsWith("data:") ? abs(raw, base) : null;
    if (src && !/\.svg(\?|$)|logo|icon|sprite/i.test(src)) out.push({ src, alt: decode(attr(tag, "alt") ?? "").slice(0, 80), near: near((m.index ?? 0) + tag.length) });
  }
  for (const m of html.matchAll(/background-image:\s*url\((["']?)([^)"']+)\1\)/gi)) {
    const src = abs(m[2], base);
    if (src && !/\.svg(\?|$)|logo|icon/i.test(src)) out.push({ src, alt: "", near: near((m.index ?? 0) + m[0].length) });
  }
  return out.slice(0, 90);
}

/** The fund's team page: a linked one, else a common address that answers with real content. */
async function teamPage(home: { text: string; url: string }): Promise<{ text: string; url: string }> {
  for (const link of teamLinks(home.text, home.url)) {
    const p = await fetchText(link, "text/html", MAX_HTML);
    if (p && p.text.length > 1500) return p;
  }
  const origin = new URL(home.url).origin;
  for (const path of TEAM_PATHS) {
    const p = await fetchText(origin + path, "text/html", MAX_HTML);
    if (p && p.text.length > 1500 && /team|partner|founder|our people/i.test(p.text)) return p;
  }
  return home;
}

export const teams = action({
  args: { token: v.string() },
  returns: v.number(),
  handler: async (ctx, { token }): Promise<number> => {
    if (!TOKEN.test(token)) return 0;
    const todo: { id: Id<"investors">; website: string; name: string; person: string | null; kind: string }[] = await ctx.runQuery(internal.kit.topForTeams, { token });
    if (!todo.length || !(await limits.limit(ctx, "teamLooksPerVisitor", { key: token })).ok) return 0;
    if (!(await limits.limit(ctx, "aiCallsGlobal", { count: todo.length })).ok) return 0;
    let found = 0;
    await Promise.all(todo.map(async (t) => {
      const team = await readTeam(ctx, t).catch(() => []);
      if (team.length) found++;
      await ctx.runMutation(internal.kit.saveTeam, { id: t.id, team });
    }));
    return found;
  },
});

/** Owner only, from the terminal: look up every investor's team once (a batch at a time, then it schedules the next).
 *  npx convex run [--prod] kitAi:backfillTeams '{}'   Investors already looked at are skipped. */
export const backfillTeams = internalAction({
  args: { after: v.optional(v.union(v.string(), v.null())), done: v.optional(v.number()), found: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, { after = null, done = 0, found = 0 }) => {
    const page: { items: { id: Id<"investors">; website: string; name: string; person: string | null; kind: string }[]; after: string | null; finished: boolean } = await ctx.runQuery(internal.kit.teamsToCheck, { after, n: 8 });
    let hits = 0;
    await Promise.all(page.items.map(async (t) => {
      const team = await readTeam(ctx, t).catch(() => []);
      if (team.length) hits++;
      await ctx.runMutation(internal.kit.saveTeam, { id: t.id, team });
    }));
    console.log(`teams: ${done + page.items.length} looked at, ${found + hits} with a team`);
    if (!page.finished) await ctx.scheduler.runAfter(1500, internal.kitAi.backfillTeams, { after: page.after, done: done + page.items.length, found: found + hits });
    return null;
  },
});

async function readTeam(ctx: ActionCtx, t: { website: string; name: string; person: string | null; kind: string }) {
  const url = normaliseUrl(t.website);
  const home = url ? await fetchSite(url) : null;
  if (!home) return [];
  const page = await teamPage(home);
  const text = decode(pageText(page.text));
  const imgs = pictures(page.text, page.url);
  // An angel's website is usually their own company's: we only want them.
  const angel = t.kind === "angel";
  const input = `FIRM: ${angel ? `the company of angel investor ${t.person ?? t.name}` : t.name}${t.person && !angel ? `\nCONTACT ON OUR RECORD: ${t.person}` : ""}\n\nPAGE:\n${text.slice(0, 14000)}\n\nIMAGES:\n${imgs.map((x, i) => `${i + 1}. alt: ${x.alt || "-"} | file: ${x.src.split("/").pop()?.split("?")[0].slice(0, 60)} | text after: ${x.near}`).join("\n")}`;
  const started = Date.now();
  try {
    const res = await new Anthropic().messages.parse({ model: HAIKU, max_tokens: 1200, system: TEAM_SYSTEM, messages: [{ role: "user", content: input }], output_config: { format: zodOutputFormat(TeamOut) } });
    await logCall(ctx, { purpose: "investor_team", model: HAIKU, input, output: res.parsed_output ? JSON.stringify(res.parsed_output) : `stop_reason: ${res.stop_reason}`, started, usage: res.usage });
    const low = text.toLowerCase();
    const words = (n: string) => n.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
    const target = angel ? words(t.person ?? t.name) : null;
    // Keep only people the page really names (and for an angel, only them); a photo only if it is one of the page's own pictures.
    return (res.parsed_output?.people ?? [])
      .filter((p) => p.name.trim().length > 2 && low.includes(p.name.trim().toLowerCase()))
      .filter((p) => !target || target.every((w) => p.name.toLowerCase().includes(w)))
      .slice(0, 8)
      .map((p) => { const img = imgs[Number(p.photo) - 1]; return { name: p.name.trim().slice(0, 80), role: p.role.trim().slice(0, 80), photo: img?.src, source: page.url }; });
  } catch (e) {
    await logCall(ctx, { purpose: "investor_team", model: HAIKU, input, output: "", started, error: errText(e) });
    return [];
  }
}

/* ---------- 2. Enrich: her deck, CV or LinkedIn PDF ---------- */

const DocFacts = z.object({
  founderName: z.string(), founderLine: z.string(), companyName: z.string(), oneLiner: z.string(), problem: z.string(), product: z.string(), forWho: z.string(),
  revenue: z.string(), customers: z.string(), customersNamed: z.string(), traction: z.string(),
  team: z.array(z.object({ name: z.string(), role: z.string(), line: z.string() })),
  market: z.string(), businessModel: z.string(), competitors: z.string(), useOfFunds: z.string(), whyNow: z.string(), stage: z.string(), raising: z.string(),
});
type DocFactsT = z.infer<typeof DocFacts>;
const docOut = v.object({
  ok: v.literal(true), reviewed: v.boolean(), founderName: v.string(), founderLine: v.string(), companyName: v.string(), oneLiner: v.string(), problem: v.string(), product: v.string(), forWho: v.string(),
  revenue: v.string(), customers: v.string(), customersNamed: v.string(), traction: v.string(),
  team: v.array(v.object({ name: v.string(), role: v.string(), line: v.string() })),
  market: v.string(), businessModel: v.string(), competitors: v.string(), useOfFunds: v.string(), whyNow: v.string(), stage: v.string(), raising: v.string(),
});

/** Reads up to 3 PDFs once, returns the facts for her to confirm, and deletes the files whatever happens.
 *  review: the first file is her deck; also review it like an investor would (no sign-in needed; saved to her browser). */
export const readDocs = action({
  args: { token: v.string(), files: v.array(v.id("_storage")), review: v.optional(v.string()) },
  returns: v.union(docOut, v.object({ ok: v.literal(false), error: v.string() })),
  handler: async (ctx, { token, files, review }): Promise<({ ok: true; reviewed: boolean } & DocFactsT) | { ok: false; error: string }> => {
    const ids = files.slice(0, 3);
    try {
      if (!TOKEN.test(token) || !ids.length) return { ok: false as const, error: "Please reload the page and try again." };
      if (!(await limits.limit(ctx, "docReadsPerVisitor", { key: token })).ok) return { ok: false as const, error: "We've read enough files for today. Fill in your facts on the next screen." };
      const blocks: Anthropic.Messages.DocumentBlockParam[] = [];
      let total = 0;
      for (const id of ids) {
        const info: { size: number; contentType: string | null } | null = await ctx.runQuery(internal.kit.fileInfo, { id });
        if (!info) continue;
        if (info.contentType !== "application/pdf") return { ok: false as const, error: "Please upload PDFs only." };
        total += info.size;
        if (info.size > MAX_FILE || total > 2 * MAX_FILE) return { ok: false as const, error: "That file is over 15 MB. Try a smaller PDF." };
        const blob = await ctx.storage.get(id);
        if (blob) blocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: Buffer.from(await blob.arrayBuffer()).toString("base64") } });
      }
      if (!blocks.length) return { ok: false as const, error: "We couldn't open those files. Fill in your facts on the next screen." };
      // The review (Sonnet) is capped per browser and app-wide, since it runs before sign-in.
      const wantReview = !!review && (await limits.limit(ctx, "deckReviewsPerVisitor", { key: token })).ok && (await limits.limit(ctx, "deckReviewsGlobal")).ok;
      if (!(await limits.limit(ctx, "aiCallsGlobal", { count: wantReview ? 2 : 1 })).ok) return { ok: false as const, error: BUSY };
      const f: Doc<"founders"> | null = await ctx.runQuery(internal.founders.founderForAction, { token });
      const [facts, reviewed] = await Promise.all([
        docFacts(ctx, blocks),
        wantReview ? runReview(ctx, blocks[0], "{}", { token, founderId: f?._id, fileName: review ?? "deck.pdf" }) : Promise.resolve(false),
      ]);
      if (!facts) return reviewed ? { ok: true as const, reviewed: true, ...EMPTY_FACTS } : { ok: false as const, error: "We couldn't read those files. Fill in your facts on the next screen." };
      await ctx.runMutation(internal.kit.logStep, { step: "kit_enriched" });
      return { ok: true as const, reviewed, ...facts, team: facts.team.slice(0, 4) };
    } finally {
      // Read once, never kept (Privacy).
      await Promise.all(ids.map((id) => ctx.storage.delete(id).catch(() => undefined)));
    }
  },
});

const EMPTY_FACTS: DocFactsT = { founderName: "", founderLine: "", companyName: "", oneLiner: "", problem: "", product: "", forWho: "", revenue: "", customers: "", customersNamed: "", traction: "", team: [], market: "", businessModel: "", competitors: "", useOfFunds: "", whyNow: "", stage: "", raising: "" };

async function docFacts(ctx: ActionCtx, blocks: Anthropic.Messages.DocumentBlockParam[]): Promise<DocFactsT | null> {
  const started = Date.now();
  const note = `${blocks.length} PDF file(s) from the founder. Pull out the facts.`;
  try {
    const res = await new Anthropic().messages.parse({ model: HAIKU, max_tokens: 2000, system: DOC_FACTS_SYSTEM, messages: [{ role: "user", content: [...blocks, { type: "text", text: note }] }], output_config: { format: zodOutputFormat(DocFacts) } });
    const out = res.parsed_output;
    await logCall(ctx, { purpose: "kit_read_docs", model: HAIKU, input: note, output: out ? JSON.stringify(out) : `stop_reason: ${res.stop_reason}`, started, usage: res.usage });
    return out ?? null;
  } catch (e) {
    await logCall(ctx, { purpose: "kit_read_docs", model: HAIKU, input: note, output: "", started, error: errText(e) });
    return null;
  }
}

/* ---------- Deck and pitch review: her own deck, read once, reviewed like a seed investor would ---------- */

const Review = z.object({
  score: z.number(), verdict: z.enum(["raise_now", "raise_with_fixes", "build_traction_first"]), verdictWhy: z.string(),
  strengths: z.array(z.string()),
  fixes: z.array(z.object({ slide: z.string(), issue: z.string(), fix: z.string(), impact: z.enum(["high", "medium", "low"]) })),
  missing: z.array(z.string()),
  thesis: z.object({ claim: z.string(), tests: z.array(z.object({ question: z.string(), risk: z.enum(["high", "medium", "low"]), howToAnswer: z.string() })) }),
  questions: z.array(z.string()),
});

// max_tokens 7000: long real decks need room (3,500 cut a 30-page deck's review off, 16 Oct).
/** Reviews one deck and saves it (to her account if she has one, else to her browser's code). True when saved. */
async function runReview(ctx: ActionCtx, deck: Anthropic.Messages.DocumentBlockParam, facts: string, who: { token: string; founderId?: Id<"founders">; fileName: string }): Promise<boolean> {
  const note = `FACTS:\n${facts}\n\nReview the attached deck.${facts === "{}" ? " She hasn't confirmed any facts yet: judge the deck on what it says." : ""}`;
  const started = Date.now();
  try {
    const res = await new Anthropic().messages.parse({ model: SONNET, max_tokens: 7000, system: DECK_REVIEW_SYSTEM, messages: [{ role: "user", content: [deck, { type: "text", text: note }] }], output_config: { format: zodOutputFormat(Review) } });
    const out = res.parsed_output;
    await logCall(ctx, { founderId: who.founderId, purpose: "kit_deck_review", model: SONNET, input: note, output: out ? JSON.stringify(out) : `stop_reason: ${res.stop_reason}`, started, usage: res.usage });
    if (!out) return false;
    const t = (x: string, n: number) => x.trim().slice(0, n);
    await ctx.runMutation(internal.kit.saveReview, {
      founderId: who.founderId, token: who.token, fileName: t(who.fileName, 120) || "deck.pdf", score: Math.max(0, Math.min(100, Math.round(out.score))), verdict: out.verdict, verdictWhy: t(out.verdictWhy, 500),
      strengths: out.strengths.slice(0, 4).map((x) => t(x, 160)),
      fixes: out.fixes.slice(0, 8).map((x) => ({ slide: t(x.slide, 60), issue: t(x.issue, 220), fix: t(x.fix, 260), impact: x.impact })),
      missing: out.missing.slice(0, 6).map((x) => t(x, 80)),
      thesis: { claim: t(out.thesis.claim, 300), tests: out.thesis.tests.slice(0, 6).map((x) => ({ question: t(x.question, 220), risk: x.risk, howToAnswer: t(x.howToAnswer, 300) })) },
      questions: out.questions.slice(0, 5).map((x) => t(x, 220)),
    });
    return true;
  } catch (e) {
    await logCall(ctx, { founderId: who.founderId, purpose: "kit_deck_review", model: SONNET, input: note, output: "", started, error: errText(e) });
    return false;
  }
}

/** From the dashboard (signed in): review a new version of her deck, against her confirmed facts. */
export const reviewDeck = action({
  args: { token: v.string(), file: v.id("_storage"), fileName: v.string() },
  returns: v.union(v.object({ ok: v.literal(true) }), v.object({ ok: v.literal(false), error: v.string() })),
  handler: async (ctx, { token, file, fileName }): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      const userId = await getAuthUserId(ctx);
      const f: Doc<"founders"> | null = await ctx.runQuery(internal.founders.founderForAction, { token });
      if (!f || !userId || f.userId !== userId) return { ok: false as const, error: "Please sign in to review your deck." };
      const info: { size: number; contentType: string | null } | null = await ctx.runQuery(internal.kit.fileInfo, { id: file });
      if (!info || info.contentType !== "application/pdf") return { ok: false as const, error: "Please upload your deck as a PDF." };
      if (info.size > MAX_FILE) return { ok: false as const, error: "That file is over 15 MB. Try a smaller PDF." };
      if (!(await limits.limit(ctx, "deckReviewsPerFounder", { key: f._id })).ok) return { ok: false as const, error: "That's 3 reviews today. Come back tomorrow." };
      if (!(await limits.limit(ctx, "aiCallsGlobal", { count: 1 })).ok) return { ok: false as const, error: BUSY };
      const blob = await ctx.storage.get(file);
      if (!blob) return { ok: false as const, error: "We couldn't open that file. Try again." };
      const facts = JSON.stringify({ company: f.company, stage: f.stage, raising: f.ask, sectors: f.sectors, oneLiner: f.oneLiner, traction: f.traction });
      const ok = await runReview(ctx, { type: "document", source: { type: "base64", media_type: "application/pdf", data: Buffer.from(await blob.arrayBuffer()).toString("base64") } }, facts, { token, founderId: f._id, fileName });
      return ok ? { ok: true as const } : { ok: false as const, error: BUSY };
    } finally {
      await ctx.storage.delete(file).catch(() => undefined); // read once, never kept
    }
  },
});

/* ---------- 3. Building her kit: her top 5 pitches, her raise list, her deck and teaser ---------- */

const Deck = z.object({
  slides: z.array(z.object({ key: z.string(), headline: z.string(), points: z.array(z.string()), metrics: z.array(z.object({ value: z.string(), label: z.string() })) })),
  teaser: z.object({ summary: z.string(), highlights: z.array(z.string()) }),
});

export const build = action({
  args: { token: v.string() },
  returns: v.union(v.object({ ok: v.literal(true) }), v.object({ ok: v.literal(false), error: v.string() })),
  handler: async (ctx, { token }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const data: { founder: Doc<"founders">; kit: Doc<"kits"> } | null = await ctx.runQuery(internal.kit.forBuild, { token });
    if (!data) return { ok: false as const, error: "Please start again from the first step." };
    const { founder: f, kit } = data;
    // Her list is already written (she edited her facts): rebuild only the deck and teaser.
    if (f.emailsStatus === "ready") {
      if (!(await limits.limit(ctx, "runsPerVisitor", { key: f._id })).ok) return { ok: false as const, error: "You've used today's 3 builds. Come back tomorrow." };
      if (!(await limits.limit(ctx, "aiCallsGlobal", { count: 1 })).ok) return { ok: false as const, error: BUSY };
      await ctx.runMutation(internal.kit.saveContent, { founderId: f._id, status: "building" });
      await writeDeck(ctx, f, kit);
      return { ok: true as const };
    }
    await ctx.runMutation(internal.kit.saveContent, { founderId: f._id, status: "building" });
    const res = await firstEmails(ctx, token, KIT_TOP, 1, () => writeDeck(ctx, f, kit));
    if (!res.ok) await ctx.runMutation(internal.kit.saveContent, { founderId: f._id, status: kit.deck ? "ready" : "failed" });
    else await ctx.scheduler.runAfter(0, internal.kitAi.autoResearch, { founderId: f._id }); // her market, ready by the time she signs in
    return res;
  },
});

// The first build writes the 5 slides her facts can always carry (16 Oct), plus market, model, competition and team
// once she has given us those facts. Slides without facts show sample content, clearly marked, until she adds hers.
const FIRST_KEYS = ["cover", "problem", "solution", "traction", "ask"];
const ORDER = ["cover", "problem", "solution", "traction", "market", "model", "competition", "team", "ask"];
const keysFor = (k: Doc<"kits">) => ORDER.filter((key) => FIRST_KEYS.includes(key) || (key === "market" && !!k.facts.market) || (key === "model" && !!k.facts.businessModel) || (key === "competition" && !!k.facts.competitors) || (key === "team" && k.facts.team.length > 0));

async function writeDeck(ctx: ActionCtx, f: Doc<"founders">, kit: Doc<"kits">): Promise<void> {
  const facts = {
    company: f.company, oneLiner: f.oneLiner, founder: { name: f.name, line: f.founderLine }, traction: f.traction, sectors: f.sectors, stage: f.stage, raising: f.ask,
    ...kit.facts,
  };
  const factsText = JSON.stringify(facts);
  const allowed = [String(new Date().getFullYear())];
  const KEYS = keysFor(kit);
  const input = `Write ONLY these slides, in this order: ${KEYS.join(", ")}. Then the teaser.\n\nFACTS:\n${factsText}`;
  let fix = "";
  let first: z.infer<typeof Deck> | null = null; // a draft with problems, kept in case the rewrite fails
  const save = async (out: z.infer<typeof Deck>) => {
    const slides = KEYS.map((k) => out.slides.find((x) => x.key === k) ?? { key: k, headline: "", points: [], metrics: [] });
    const clean = cleanDeck(slides, out.teaser, factsText, allowed);
    await ctx.runMutation(internal.kit.saveContent, { founderId: f._id, status: "ready", deck: clean.slides, teaser: clean.teaser });
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    const started = Date.now();
    try {
      const res = await new Anthropic().messages.parse({ model: SONNET, max_tokens: 5000, system: DECK_SYSTEM, messages: [{ role: "user", content: input + fix }], output_config: { format: zodOutputFormat(Deck) } });
      const out = res.parsed_output;
      await logCall(ctx, { founderId: f._id, purpose: "kit_deck", model: SONNET, input: input + fix, output: out ? JSON.stringify(out) : `stop_reason: ${res.stop_reason}`, started, usage: res.usage });
      if (!out) continue;
      const slides = KEYS.map((k) => out.slides.find((x) => x.key === k) ?? { key: k, headline: "", points: [], metrics: [] });
      const problems = deckProblems(slides, out.teaser, factsText, allowed);
      if (problems.length && attempt === 0) { first = out; fix = `\n\nYour last version had these problems. Fix them and keep everything else true:\n- ${problems.join("\n- ")}`; continue; }
      await save(out);
      return;
    } catch (e) {
      await logCall(ctx, { founderId: f._id, purpose: "kit_deck", model: SONNET, input: input + fix, output: "", started, error: errText(e) });
    }
  }
  // The rewrite failed: use the first draft with every line that broke a rule taken out.
  if (first) { await save(first); return; }
  await ctx.runMutation(internal.kit.saveContent, { founderId: f._id, status: "failed" });
}

/* ---------- 4. Her market and competition: web search, every line with its source ---------- */

const Market = z.object({
  summary: z.string(),
  competitors: z.array(z.object({ name: z.string(), what: z.string(), where: z.enum(["india", "global"]), funding: z.string().optional(), website: z.string().optional(), source: z.string() })),
  deals: z.array(z.object({ company: z.string(), what: z.string().optional(), amount: z.string(), round: z.string(), date: z.string(), investors: z.array(z.string()), where: z.enum(["india", "global"]), atStage: z.boolean(), source: z.string() })),
  trends: z.array(z.object({ line: z.string(), source: z.string() })),
});
// The same shape with every field required, for structured output.
const MarketStrict = z.object({
  summary: z.string(),
  competitors: z.array(z.object({ name: z.string(), what: z.string(), where: z.enum(["india", "global"]), funding: z.string(), website: z.string(), source: z.string() })),
  deals: z.array(z.object({ company: z.string(), what: z.string(), amount: z.string(), round: z.string(), date: z.string(), investors: z.array(z.string()), where: z.enum(["india", "global"]), atStage: z.boolean(), source: z.string() })),
  trends: z.array(z.object({ line: z.string(), source: z.string() })),
});
const urlKey = (u: string) => u.trim().replace(/#.*$/, "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").toLowerCase();

/** She asks for it (Market tab), or it runs after her first build. The work itself is scheduled; the tab updates by itself. */
export const research = action({
  args: { token: v.string() },
  returns: v.union(v.object({ ok: v.literal(true) }), v.object({ ok: v.literal(false), error: v.string() })),
  handler: async (ctx, { token }): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (!TOKEN.test(token)) return { ok: false as const, error: "Please start again from the first step." };
    const userId = (await getAuthUserId(ctx)) ?? undefined;
    const data: { founder: Doc<"founders">; market: { status: string } | null } | null = await ctx.runQuery(internal.market.forResearch, { token, userId });
    if (!data) return { ok: false as const, error: "Please start again from the first step." };
    if (data.market?.status === "running") return { ok: true as const };
    const ok = await startResearch(ctx, data.founder._id);
    return ok ? { ok: true as const } : { ok: false as const, error: "You ran this today. Come back tomorrow." };
  },
});

export const autoResearch = internalAction({
  args: { founderId: v.id("founders") },
  returns: v.null(),
  handler: async (ctx, { founderId }) => {
    const data: { market: { status: string } | null } | null = await ctx.runQuery(internal.market.forResearch, { founderId });
    if (data && !data.market) await startResearch(ctx, founderId);
    return null;
  },
});

async function startResearch(ctx: ActionCtx, founderId: Id<"founders">): Promise<boolean> {
  if (!(await limits.limit(ctx, "marketRunsPerFounder", { key: founderId })).ok) return false;
  if (!(await limits.limit(ctx, "marketRunsGlobal", {})).ok || !(await limits.limit(ctx, "aiCallsGlobal", { count: 2 })).ok) return false;
  if (!(await ctx.runMutation(internal.market.start, { founderId }))) return true; // already running
  await ctx.scheduler.runAfter(0, internal.kitAi.runResearch, { founderId });
  return true;
}

export const runResearch = internalAction({
  args: { founderId: v.id("founders") },
  returns: v.null(),
  handler: async (ctx, { founderId }) => {
    const data: { founder: Doc<"founders">; kit: Doc<"kits"> } | null = await ctx.runQuery(internal.market.forResearch, { founderId });
    if (!data) return null;
    const { founder: f, kit } = data;
    const facts = { company: f.company, website: f.website, oneLiner: f.oneLiner, sectors: f.sectors, stage: f.stage, raising: f.ask, product: kit.facts.product, forWho: kit.facts.forWho, problem: kit.facts.problem, competitorsSheNamed: kit.facts.competitors };
    const input = `FACTS:\n${JSON.stringify(facts)}`;
    const client = new Anthropic();
    const started = Date.now();
    const seen = new Set<string>(); // every page the search returned: the only links we keep
    let searches = 0;
    let text = "";
    try {
      const messages: Anthropic.MessageParam[] = [{ role: "user", content: input }];
      let res: Anthropic.Message | null = null;
      for (let turn = 0; turn < 2; turn++) {
        res = await client.messages.create({
          model: MARKET_MODEL, max_tokens: 16000, system: MARKET_SYSTEM, messages,
          tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 7, user_location: { type: "approximate", country: "IN" } }],
        });
        for (const b of res.content) {
          if (b.type === "web_search_tool_result" && Array.isArray(b.content)) for (const r of b.content) seen.add(urlKey(r.url));
          if (b.type === "server_tool_use") searches++;
          if (b.type === "text") for (const c of b.citations ?? []) if (c.type === "web_search_result_location") seen.add(urlKey(c.url));
        }
        if (res.stop_reason !== "pause_turn") break;
        messages.push({ role: "assistant", content: res.content });
      }
      // The answer is the text after the last search.
      const blocks = res?.content ?? [];
      const lastTool = blocks.map((b) => b.type).lastIndexOf("web_search_tool_result");
      text = blocks.slice(lastTool + 1).map((b) => (b.type === "text" ? b.text : "")).join("");
      await logCall(ctx, { founderId, purpose: "kit_market", model: MARKET_MODEL, input, output: `searches: ${searches} · stop: ${res?.stop_reason}\n${text}`, started, usage: res?.usage });
    } catch (e) {
      await logCall(ctx, { founderId, purpose: "kit_market", model: MARKET_MODEL, input, output: "", started, error: errText(e) });
      await ctx.runMutation(internal.market.save, { founderId, ok: false });
      return null;
    }
    let out = parseMarket(text);
    if (!out && text.trim()) out = await tidyMarket(ctx, founderId, text); // the reply wasn't clean JSON: Haiku puts it in shape
    if (!out) { await ctx.runMutation(internal.market.save, { founderId, ok: false }); return null; }
    const own = f.website ? urlKey(normaliseUrl(f.website) ?? f.website).split("/")[0] : "";
    const sourced = (u: string) => !!u && seen.has(urlKey(u));
    const competitors = out.competitors
      .filter((c) => sourced(c.source) && c.name.toLowerCase() !== f.company.toLowerCase() && !(own && c.website && urlKey(c.website).startsWith(own)))
      .slice(0, 8)
      .map((c) => ({ name: c.name.slice(0, 60), what: c.what.slice(0, 140), where: c.where, funding: c.funding && !/^(none|n\/?a|unknown|not (found|disclosed))\b/i.test(c.funding.trim()) ? c.funding.slice(0, 80) : undefined, website: c.website ? normaliseUrl(c.website) ?? undefined : undefined, source: c.source }));
    const deals = out.deals.filter((d) => sourced(d.source) && d.company.toLowerCase() !== f.company.toLowerCase()).slice(0, 10)
      .map((d) => ({ company: d.company.slice(0, 60), what: d.what?.slice(0, 100) || undefined, amount: d.amount.slice(0, 40), round: d.round.slice(0, 30), date: d.date.slice(0, 20), investors: d.investors.slice(0, 3).map((x) => x.slice(0, 60)), where: d.where, atStage: d.atStage, source: d.source }));
    const trends = out.trends.filter((t) => sourced(t.source)).slice(0, 4).map((t) => ({ line: t.line.slice(0, 200), source: t.source }));
    // Their logos, from their own sites (a missing one shows their initials).
    const withLogos = await Promise.all(competitors.map(async (c) => {
      const page = c.website ? await fetchSite(c.website).catch(() => null) : null;
      const logo = page ? logoFrom(page.text, page.url) : null;
      return { ...c, logo: logo ?? undefined };
    }));
    await ctx.runMutation(internal.market.save, { founderId, ok: competitors.length + deals.length > 0, summary: out.summary.slice(0, 500), competitors: withLogos, deals, trends, searches });
    return null;
  },
});

function parseMarket(text: string): z.infer<typeof Market> | null {
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { const r = Market.safeParse(JSON.parse(text.slice(a, b + 1))); return r.success ? r.data : null; } catch { return null; }
}

async function tidyMarket(ctx: ActionCtx, founderId: Id<"founders">, text: string): Promise<z.infer<typeof Market> | null> {
  const started = Date.now();
  const input = `Put this research into the JSON shape. Copy every URL exactly; drop any item without one. Change nothing else.\n\n${text.slice(0, 30000)}`;
  try {
    const res = await new Anthropic().messages.parse({ model: HAIKU, max_tokens: 4000, messages: [{ role: "user", content: input }], output_config: { format: zodOutputFormat(MarketStrict) } });
    await logCall(ctx, { founderId, purpose: "kit_market_tidy", model: HAIKU, input, output: res.parsed_output ? JSON.stringify(res.parsed_output) : `stop_reason: ${res.stop_reason}`, started, usage: res.usage });
    return res.parsed_output ?? null;
  } catch (e) {
    await logCall(ctx, { founderId, purpose: "kit_market_tidy", model: HAIKU, input, output: "", started, error: errText(e) });
    return null;
  }
}
