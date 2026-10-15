"use node";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { v } from "convex/values";
import { action } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { normaliseUrl } from "./lib/links";
import { DECK_SYSTEM, DOC_FACTS_SYSTEM, KIT_SECTORS, SITE_FACTS_SYSTEM } from "./lib/prompt";
import { cleanDeck, deckProblems } from "./lib/checks";
import { pageText } from "./suggest";
import { firstEmails } from "./write";
import { limits } from "./limits";

// The Raise Kit's AI work (15 Oct): read her website (facts + brand), read her files, build her deck and teaser.
const HAIKU = "claude-haiku-4-5"; // reading her site and files (AGENTS.md section 4: the website one-liner runs on Haiku)
const SONNET = "claude-sonnet-5-5"; // her deck and teaser, like her first drafts
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
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(7000), headers: { "user-agent": "FirstCheq/1.0 (reads the founder's own site once, on her request)", accept } });
    if (!res.ok) return null;
    const final = normaliseUrl(res.url); // redirects must still land on a public site
    if (!final) return null;
    return { text: (await res.text()).slice(0, max), url: res.url };
  } catch {
    return null;
  }
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
    const page = await fetchText(url, "text/html", MAX_HTML);
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
      const page = url ? await fetchText(url, "text/html", MAX_HTML) : null;
      const logo = page ? logoFrom(page.text, page.url) : null;
      if (logo) found++;
      await ctx.runMutation(internal.kit.saveLogo, { id: t.id, logo });
    }));
    return found;
  },
});

/* ---------- 2. Enrich: her deck, CV or LinkedIn PDF ---------- */

const DocFacts = z.object({
  founderName: z.string(), founderLine: z.string(), companyName: z.string(), oneLiner: z.string(), problem: z.string(), product: z.string(), forWho: z.string(),
  revenue: z.string(), customers: z.string(), customersNamed: z.string(), traction: z.string(),
  team: z.array(z.object({ name: z.string(), role: z.string(), line: z.string() })),
  market: z.string(), businessModel: z.string(), competitors: z.string(), useOfFunds: z.string(), whyNow: z.string(), stage: z.string(), raising: z.string(),
});
type DocFactsT = z.infer<typeof DocFacts>;
const docOut = v.object({
  ok: v.literal(true), founderName: v.string(), founderLine: v.string(), companyName: v.string(), oneLiner: v.string(), problem: v.string(), product: v.string(), forWho: v.string(),
  revenue: v.string(), customers: v.string(), customersNamed: v.string(), traction: v.string(),
  team: v.array(v.object({ name: v.string(), role: v.string(), line: v.string() })),
  market: v.string(), businessModel: v.string(), competitors: v.string(), useOfFunds: v.string(), whyNow: v.string(), stage: v.string(), raising: v.string(),
});

/** Reads up to 3 PDFs once, returns the facts for her to confirm, and deletes the files whatever happens. */
export const readDocs = action({
  args: { token: v.string(), files: v.array(v.id("_storage")) },
  returns: v.union(docOut, v.object({ ok: v.literal(false), error: v.string() })),
  handler: async (ctx, { token, files }): Promise<({ ok: true } & DocFactsT) | { ok: false; error: string }> => {
    const ids = files.slice(0, 3);
    try {
      if (!TOKEN.test(token) || !ids.length) return { ok: false as const, error: "Please reload the page and try again." };
      if (!(await limits.limit(ctx, "docReadsPerVisitor", { key: token })).ok) return { ok: false as const, error: "We've read enough files for today. Fill in your facts on the next screen." };
      const blocks: Anthropic.Messages.ContentBlockParam[] = [];
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
      if (!(await limits.limit(ctx, "aiCallsGlobal", { count: 1 })).ok) return { ok: false as const, error: BUSY };
      const started = Date.now();
      const note = `${blocks.length} PDF file(s) from the founder. Pull out the facts.`;
      try {
        const res = await new Anthropic().messages.parse({ model: HAIKU, max_tokens: 2000, system: DOC_FACTS_SYSTEM, messages: [{ role: "user", content: [...blocks, { type: "text", text: note }] }], output_config: { format: zodOutputFormat(DocFacts) } });
        const out = res.parsed_output;
        await logCall(ctx, { purpose: "kit_read_docs", model: HAIKU, input: note, output: out ? JSON.stringify(out) : `stop_reason: ${res.stop_reason}`, started, usage: res.usage });
        if (!out) return { ok: false as const, error: "We couldn't read those files. Fill in your facts on the next screen." };
        await ctx.runMutation(internal.kit.logStep, { step: "kit_enriched" });
        return { ok: true as const, ...out, team: out.team.slice(0, 4) };
      } catch (e) {
        await logCall(ctx, { purpose: "kit_read_docs", model: HAIKU, input: note, output: "", started, error: errText(e) });
        return { ok: false as const, error: BUSY };
      }
    } finally {
      // Read once, never kept (Privacy).
      await Promise.all(ids.map((id) => ctx.storage.delete(id).catch(() => undefined)));
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
    return res;
  },
});

// The free kit shows 3 slides and page 1 of the teaser, so the first build writes only those 4 slides (fast).
// The other slides are written when she gets full access.
const FIRST_KEYS = ["cover", "problem", "solution", "traction"];

async function writeDeck(ctx: ActionCtx, f: Doc<"founders">, kit: Doc<"kits">): Promise<void> {
  const facts = {
    company: f.company, oneLiner: f.oneLiner, founder: { name: f.name, line: f.founderLine }, traction: f.traction, sectors: f.sectors, stage: f.stage, raising: f.ask,
    ...kit.facts,
  };
  const factsText = JSON.stringify(facts);
  const allowed = [String(new Date().getFullYear())];
  const input = `Write ONLY these slides, in this order: ${FIRST_KEYS.join(", ")}. Then the teaser.\n\nFACTS:\n${factsText}`;
  let fix = "";
  let first: z.infer<typeof Deck> | null = null; // a draft with problems, kept in case the rewrite fails
  const save = async (out: z.infer<typeof Deck>) => {
    const slides = FIRST_KEYS.map((k) => out.slides.find((x) => x.key === k) ?? { key: k, headline: "", points: [], metrics: [] });
    const clean = cleanDeck(slides, out.teaser, factsText, allowed);
    await ctx.runMutation(internal.kit.saveContent, { founderId: f._id, status: "ready", deck: clean.slides, teaser: clean.teaser });
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    const started = Date.now();
    try {
      const res = await new Anthropic().messages.parse({ model: SONNET, max_tokens: 2500, system: DECK_SYSTEM, messages: [{ role: "user", content: input + fix }], output_config: { format: zodOutputFormat(Deck) } });
      const out = res.parsed_output;
      await logCall(ctx, { founderId: f._id, purpose: "kit_deck", model: SONNET, input: input + fix, output: out ? JSON.stringify(out) : `stop_reason: ${res.stop_reason}`, started, usage: res.usage });
      if (!out) continue;
      const slides = FIRST_KEYS.map((k) => out.slides.find((x) => x.key === k) ?? { key: k, headline: "", points: [], metrics: [] });
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
