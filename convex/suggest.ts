"use node";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { normaliseUrl } from "./lib/links";
import { POLISH_SYSTEM, SUGGEST_SYSTEM } from "./lib/prompt";
import { limits } from "./limits";

const MODEL = "claude-haiku-4-5";
const MAX_PAGE_BYTES = 400_000;
const MAX_TEXT = 6000;

const Polished = z.object({ founderLine: z.string(), oneLiner: z.string(), traction: z.string() });
const BUSY = "Busy right now. Try again in a few minutes.";

const fit = (s: string, max: number) => s.trim().slice(0, max);

/** "How you'll come across": turns her raw notes into the three lines every email uses. She edits them next. */
export const polish = action({
  args: { token: v.string(), oneLiner: v.string(), founderLine: v.string(), vision: v.string(), revenue: v.string(), customers: v.string() },
  returns: v.union(
    v.object({ ok: v.literal(true), founderLine: v.string(), oneLiner: v.string(), traction: v.string() }),
    v.object({ ok: v.literal(false), error: v.string() }),
  ),
  handler: async (ctx, a): Promise<{ ok: true; founderLine: string; oneLiner: string; traction: string } | { ok: false; error: string }> => {
    const f: Doc<"founders"> | null = await ctx.runQuery(internal.founders.founderForAction, { token: a.token });
    if (!f) return { ok: false as const, error: "Please start again from the first step." };
    const mine = await limits.limit(ctx, "polishPerVisitor", { key: f._id });
    const calls = mine.ok ? await limits.limit(ctx, "aiCallsGlobal", { count: 1 }) : mine;
    if (!calls.ok) return { ok: false as const, error: BUSY };

    const notes = { name: f.name, company: f.company, sectors: f.sectors, stage: f.stage, oneLiner: fit(a.oneLiner, 200), aboutMe: fit(a.founderLine, 220), vision: fit(a.vision, 120), revenue: fit(a.revenue, 80), customers: fit(a.customers, 80) };
    const input = JSON.stringify(notes);
    const started = Date.now();
    try {
      const res = await new Anthropic().messages.parse({
        model: MODEL, max_tokens: 400, system: POLISH_SYSTEM,
        messages: [{ role: "user", content: input }],
        output_config: { format: zodOutputFormat(Polished) },
      });
      const out = res.parsed_output;
      await ctx.runMutation(internal.founders.logAiCall, { founderId: f._id, purpose: "polish_profile", model: MODEL, input, output: out ? JSON.stringify(out) : `stop_reason: ${res.stop_reason}`, ms: Date.now() - started, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens });
      if (!out) return { ok: false as const, error: BUSY };
      return { ok: true as const, founderLine: fit(out.founderLine, 220), oneLiner: fit(out.oneLiner, 200), traction: fit(out.traction, 200) };
    } catch (e) {
      const msg = e instanceof Anthropic.APIError ? `API ${e.status}: ${e.message}` : e instanceof Error ? e.message : String(e);
      await ctx.runMutation(internal.founders.logAiCall, { founderId: f._id, purpose: "polish_profile", model: MODEL, input, output: "", ms: Date.now() - started, error: msg.slice(0, 500) });
      return { ok: false as const, error: BUSY };
    }
  },
});

const Suggestion = z.object({ oneLiner: z.string(), founderLine: z.string(), found: z.boolean() });

/** The readable text of a page: title, description and body, without scripts or styles. */
export function pageText(html: string): string {
  const pick = (re: RegExp) => html.match(re)?.[1]?.trim() ?? "";
  const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const desc = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i);
  const body = html
    .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ").trim();
  return [title, desc, body].filter(Boolean).join("\n").slice(0, MAX_TEXT);
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(7000), headers: { "user-agent": "FundraisingOS/1.0 (reads the founder's own site once, on her request)", accept: "text/html" } });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return null;
    const final = normaliseUrl(res.url); // redirects must still land on a public site
    if (!final) return null;
    const html = (await res.text()).slice(0, MAX_PAGE_BYTES);
    return pageText(html);
  } catch {
    return null;
  }
}

/** Reads her website once and drafts her one-liner (and founder line, if the site has one) for her to edit. */
export const fromWebsite = action({
  args: { token: v.string(), website: v.string() },
  returns: v.union(
    v.object({ ok: v.literal(true), oneLiner: v.string(), founderLine: v.string() }),
    v.object({ ok: v.literal(false), error: v.string() }),
  ),
  handler: async (ctx, { token, website }): Promise<{ ok: true; oneLiner: string; founderLine: string } | { ok: false; error: string }> => {
    const f: Doc<"founders"> | null = await ctx.runQuery(internal.founders.founderForAction, { token });
    if (!f) return { ok: false as const, error: "Please start again from the first step." };
    const url = normaliseUrl(website);
    if (!url) return { ok: false as const, error: "That website doesn't look right. Try something like verdera.ai." };
    const mine = await limits.limit(ctx, "websiteReadsPerVisitor", { key: f._id });
    if (!mine.ok) return { ok: false as const, error: "We've read enough sites for today. Write your one-liner below." };

    let text = await fetchPage(url);
    if (text && text.length < 400) text += "\n" + ((await fetchPage(new URL(url).origin + "/about")) ?? "");
    if (!text || text.length < 80) return { ok: false as const, error: "We couldn't read your website. Write your one-liner below." };

    const calls = await limits.limit(ctx, "aiCallsGlobal", { count: 1 });
    if (!calls.ok) return { ok: false as const, error: "Busy right now. Write your one-liner below, or try again in a few minutes." };

    const input = `COMPANY: ${f.company}\nFOUNDER_NAME: ${f.name}\nSITE: ${url}\n\nSITE TEXT:\n${text}`;
    const started = Date.now();
    try {
      const res = await new Anthropic().messages.parse({
        model: MODEL, max_tokens: 400,
        system: SUGGEST_SYSTEM,
        messages: [{ role: "user", content: input }],
        output_config: { format: zodOutputFormat(Suggestion) },
      });
      const out = res.parsed_output;
      await ctx.runMutation(internal.founders.logAiCall, { founderId: f._id, purpose: "suggest_profile", model: MODEL, input, output: out ? JSON.stringify(out) : `stop_reason: ${res.stop_reason}`, ms: Date.now() - started, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens });
      if (!out || !out.found) return { ok: false as const, error: "Your website didn't say enough for a one-liner. Write it below." };
      return { ok: true as const, oneLiner: out.oneLiner.trim().slice(0, 200), founderLine: out.founderLine.trim().slice(0, 220) };
    } catch (e) {
      const msg = e instanceof Anthropic.APIError ? `API ${e.status}: ${e.message}` : e instanceof Error ? e.message : String(e);
      await ctx.runMutation(internal.founders.logAiCall, { founderId: f._id, purpose: "suggest_profile", model: MODEL, input, output: "", ms: Date.now() - started, error: msg.slice(0, 500) });
      return { ok: false as const, error: "Busy right now. Write your one-liner below, or try again in a few minutes." };
    }
  },
});
