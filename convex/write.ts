"use node";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { v } from "convex/values";
import { action } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { rankMatches, topMatches } from "./lib/match";
import { shortUrl } from "./lib/links";
import { checkDraft, checkNote, hookNamesADeal, unsourcedFacts, withSignature } from "./lib/checks";
import { sharesHerDomain } from "./lib/links";
import { DRAFT_SYSTEM, FACT_FIELDS, NOTE_SYSTEM, REASONS_SYSTEM } from "./lib/prompt";
import { limits } from "./limits";

const MODEL = "claude-sonnet-5-5"; // each founder's first three drafts (AGENTS.md section 4)
const MORE_MODEL = "claude-haiku-4-5"; // "Write email" further down her list
const MAX_TOKENS = 1000;
const BUSY = "Busy right now. Try again in a few minutes.";

const Draft = z.object({
  subject: z.string(),
  body: z.string(),
  hook: z.string(),
  reason: z.string(),
  whyFit: z.array(z.string()),
  watchOut: z.array(z.string()),
  factsUsed: z.array(z.object({ text: z.string(), field: z.enum(FACT_FIELDS) })),
  linkedin: z.string(),
});
const Note = z.object({ linkedin: z.string() });

export const oneLinerOf = (f: Doc<"founders">) =>
  f.oneLiner ?? `${f.company} helps ${f.forWho} ${f.outcome} through ${f.how}${f.reduce ? `, reducing ${f.reduce}` : ""}.`;

const briefOf = (f: Doc<"founders">): FounderBrief => ({
  name: f.name, company: f.company, oneLiner: oneLinerOf(f), founderLine: f.founderLine ?? "", sectors: f.sectors,
  stage: f.stage, raising: f.ask, traction: f.traction, revenue: f.traction ? undefined : f.revenue, customers: f.traction ? undefined : f.customers,
  website: f.website ? shortUrl(f.website) : undefined, linkedin: f.linkedin ? shortUrl(f.linkedin) : undefined,
});

/** Only the facts the AI may use about an investor. */
function investorFacts(i: Doc<"investors">) {
  const { person, firm, displayName, title, city, sectors, stages, chequeMinLakh, chequeMaxLakh, leadsRounds, thesis, portfolio, recent } = i;
  return Object.fromEntries(Object.entries({ person, firm, displayName, title, city, sectors, stages, chequeMinLakh, chequeMaxLakh, leadsRounds, thesis, portfolio, recent }).filter(([, val]) => val !== undefined && !(Array.isArray(val) && val.length === 0)));
}

/** After the four sign-up steps and her profile: pick the top 3 and write their first emails. */
export const writeFirstEmails = action({
  args: { token: v.string() },
  returns: v.union(v.object({ ok: v.literal(true) }), v.object({ ok: v.literal(false), error: v.string() })),
  handler: async (ctx, { token }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const data: { founder: Doc<"founders">; investors: Doc<"investors">[]; hasSent: boolean } | null = await ctx.runQuery(internal.founders.forDrafting, { token });
    if (!data) return { ok: false as const, error: "Please start again from the first step." };
    const f = data.founder;
    if (!(f.oneLiner || f.forWho) || !f.founderLine) return { ok: false as const, error: "Please fill in the short profile first." };
    if (f.emailsStatus === "writing") return { ok: true as const };
    if (data.hasSent) return { ok: false as const, error: "You've started sending, so your list is kept as it is." };

    // Match first (no AI, no cost): if nothing fits, say so plainly, before using one of her runs.
    const year = new Date().getFullYear();
    const ranked = rankMatches(data.investors, f, year);
    const matchCount = ranked.length;
    const activeCount = ranked.filter((x) => x.inv.recent.some((r) => (r.year ?? 0) >= year - 1)).length;
    const leadCount = ranked.filter((x) => x.inv.leadsRounds).length;
    const list: { inv: Doc<"investors">; score: number }[] = topMatches(data.investors, f, year, 100); // free sees 20, Round Pass 100
    const top = list.slice(0, 3);
    if (!top.length) {
      const space = f.sectors.join(" and ");
      return { ok: false as const, error: `No investors in our research back ${space} at ${f.stage.toLowerCase()} for ${f.ask} yet. Try another stage or raise size, or add a second sector. We add investors as we research them.` };
    }

    const run = await limits.limit(ctx, "runsPerVisitor", { key: f._id });
    if (!run.ok) return { ok: false as const, error: "You've used today's 3 runs. Come back tomorrow." };
    const calls = await limits.limit(ctx, "aiCallsGlobal", { count: 4 }); // 3 emails + 1 call for the other reasons
    if (!calls.ok) return { ok: false as const, error: BUSY };

    await ctx.runMutation(internal.founders.setStatus, { founderId: f._id, status: "writing" });
    await ctx.runMutation(internal.founders.saveMatches, { founderId: f._id, matchCount, activeCount, leadCount, picks: list.map((t) => ({ investorId: t.inv._id, score: t.score })) });

    const founder = briefOf(f);
    const client = new Anthropic();
    const [results] = await Promise.all([
      Promise.all(top.map((t) => writeOne(ctx, client, f._id, founder, t.inv))) as Promise<boolean[]>,
      writeReasons(ctx, client, f._id, founder),
    ]);
    const ok: number = results.filter(Boolean).length;
    await ctx.runMutation(internal.founders.setStatus, { founderId: f._id, status: ok ? "ready" : "failed" });
    if (ok) await ctx.runMutation(internal.founders.logStep, { step: "emails_ready" });
    return ok ? { ok: true as const } : { ok: false as const, error: BUSY };
  },
});

/** One line on why each of the other investors fits. Fills in reasons for older lists too (the dashboard asks once). */
export const explainRest = action({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, { token }): Promise<null> => {
    const f: Doc<"founders"> | null = await ctx.runQuery(internal.founders.founderForAction, { token });
    if (!f || f.emailsStatus !== "ready") return null;
    if (!(await limits.limit(ctx, "reasonsPerFounder", { key: f._id })).ok) return null;
    if (!(await limits.limit(ctx, "aiCallsGlobal", { count: 1 })).ok) return null;
    await writeReasons(ctx, new Anthropic(), f._id, briefOf(f));
    return null;
  },
});

const ReasonsOut = z.object({ reasons: z.array(z.object({ i: z.number(), reason: z.string() })) });

async function writeReasons(ctx: ActionCtx, client: Anthropic, founderId: Id<"founders">, founder: FounderBrief): Promise<void> {
  const all: { rank: number; investor: Doc<"investors"> }[] = await ctx.runQuery(internal.founders.forReasons, { founderId });
  // at most 20 records per call (AGENTS.md section 4); Round Pass lists need several calls
  for (let i = 0; i < all.length; i += 20) await writeReasonBatch(ctx, client, founderId, founder, all.slice(i, i + 20));
}

async function writeReasonBatch(ctx: ActionCtx, client: Anthropic, founderId: Id<"founders">, founder: FounderBrief, rows: { rank: number; investor: Doc<"investors"> }[]): Promise<void> {
  if (!rows.length) return;
  const input = JSON.stringify({
    FOUNDER: { company: founder.company, oneLiner: founder.oneLiner, sectors: founder.sectors, stage: founder.stage, raising: founder.raising },
    INVESTORS: rows.map((r, i) => ({ i, ...investorFacts(r.investor) })),
  });
  const started = Date.now();
  try {
    const res = await client.messages.parse({
      model: MORE_MODEL, max_tokens: 1500, system: REASONS_SYSTEM,
      messages: [{ role: "user", content: input }],
      output_config: { format: zodOutputFormat(ReasonsOut) },
    });
    const out = res.parsed_output;
    await ctx.runMutation(internal.founders.logAiCall, { founderId, purpose: "reasons", model: MORE_MODEL, input, output: out ? JSON.stringify(out) : `stop_reason: ${res.stop_reason}`, ms: Date.now() - started, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens });
    if (!out) return;
    const reasons = out.reasons.filter((x) => rows[x.i] && x.reason.trim()).map((x) => ({ rank: rows[x.i].rank, reason: x.reason.trim() }));
    await ctx.runMutation(internal.founders.saveReasons, { founderId, reasons });
  } catch (e) {
    const msg = e instanceof Anthropic.APIError ? `API ${e.status}: ${e.message}` : e instanceof Error ? e.message : String(e);
    await ctx.runMutation(internal.founders.logAiCall, { founderId, purpose: "reasons", model: MORE_MODEL, input, output: "", ms: Date.now() - started, error: msg.slice(0, 500) });
  }
}

/** "Write email" for one investor further down her list. Signed in only. */
export const writeMore = action({
  args: { token: v.string(), rank: v.number() },
  returns: v.union(v.object({ ok: v.literal(true) }), v.object({ ok: v.literal(false), error: v.string() })),
  handler: async (ctx, { token, rank }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { ok: false as const, error: "Please sign in to write more emails." };
    const row: { founder: Doc<"founders">; investor: Doc<"investors">; hasDraft: boolean } | null = await ctx.runQuery(internal.founders.rowForDrafting, { token, rank, userId });
    if (!row) return { ok: false as const, error: "We couldn't find that investor on your list." };
    if (row.hasDraft) return { ok: true as const };
    if (row.investor.retired) return { ok: false as const, error: "This investor is no longer active, so we won't write to them." };
    if (sharesHerDomain(row.founder.website, row.investor)) return { ok: false as const, error: "This one shares your company's domain, so we left it out." };
    if (!row.investor.email) return { ok: false as const, error: "This one takes applications through a form. Tap Apply instead." };
    const mine = await limits.limit(ctx, row.founder.plan === "round_pass" ? "extraEmailsPass" : "extraEmailsPerFounder", { key: row.founder._id });
    if (!mine.ok) return { ok: false as const, error: "That's today's emails. Come back tomorrow for more." };
    const calls = await limits.limit(ctx, "aiCallsGlobal", { count: 1 });
    if (!calls.ok) return { ok: false as const, error: BUSY };
    const ok = await writeOne(ctx, new Anthropic(), row.founder._id, briefOf(row.founder), row.investor, "more_email", MORE_MODEL);
    return ok ? { ok: true as const } : { ok: false as const, error: BUSY };
  },
});

type FounderBrief = { name: string; company: string; oneLiner: string; founderLine: string; sectors: string[]; stage: string; raising: string; traction?: string; revenue?: string; customers?: string; website?: string; linkedin?: string };

async function writeOne(ctx: ActionCtx, client: Anthropic, founderId: Id<"founders">, founder: FounderBrief, inv: Doc<"investors">, purpose = "first_email", model = MODEL): Promise<boolean> {
  const facts = investorFacts(inv);
  const userText = `FOUNDER:\n${JSON.stringify(founder)}\n\nINVESTOR:\n${JSON.stringify(facts)}`;
  let fixNote = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const started = Date.now();
    try {
      const res = await client.messages.parse({
        model,
        max_tokens: MAX_TOKENS,
        ...(model === MODEL ? { thinking: { type: "between_tools" as const } } : {}), // thinking off for drafts (AGENTS.md section 4)
        system: [{ type: "text", text: DRAFT_SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userText + fixNote }],
        output_config: { format: zodOutputFormat(Draft) },
      });
      const out = res.parsed_output;
      await ctx.runMutation(internal.founders.logAiCall, {
        founderId, purpose, model, input: userText + fixNote, output: out ? JSON.stringify(out) : `stop_reason: ${res.stop_reason}`,
        ms: Date.now() - started, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens,
      });
      if (!out || res.stop_reason === "refusal") continue;
      const given = { oneLiner: founder.oneLiner, founderLine: founder.founderLine, traction: [founder.traction, founder.revenue, founder.customers].filter(Boolean).join(" "), company: founder.company, investorFacts: JSON.stringify(facts) + " " + founder.raising + " " + (founder.website ?? "") + " " + (founder.linkedin ?? "") };
      const problems = checkDraft({ subject: out.subject, body: out.body, ...given });
      const noteProblems = checkNote(out.linkedin, given);
      const deal = hookNamesADeal(out.body, facts as { recent?: { company: string }[]; portfolio?: string[] });
      if (deal) problems.push(deal);
      const unsourced = unsourcedFacts(out.factsUsed, facts as Record<string, unknown>);
      if ((problems.length || unsourced.length || noteProblems.length) && attempt === 0) {
        fixNote = `\n\nYour last draft had these problems. Fix them and keep everything else true:\n- ${[...problems, ...noteProblems, ...unsourced.map((u) => `Not in INVESTOR: ${u}`)].join("\n- ")}`;
        continue;
      }
      await ctx.runMutation(internal.founders.saveDraft, {
        founderId, investorId: inv._id, hook: out.hook, reason: out.reason, whyFit: out.whyFit.slice(0, 2), watchOut: out.watchOut.slice(0, 1),
        subject: out.subject, body: withSignature(out.body, founder), warnings: [...problems, ...unsourced.map((u) => `Check this: "${u}"`)],
        linkedin: noteProblems.length ? undefined : out.linkedin.trim(), // a note that fails its checks is left out; she can ask for a new one
      });
      return true;
    } catch (e) {
      const msg = e instanceof Anthropic.APIError ? `API ${e.status}: ${e.message}` : e instanceof Error ? e.message : String(e);
      await ctx.runMutation(internal.founders.logAiCall, { founderId, purpose, model, input: userText, output: "", ms: Date.now() - started, error: msg.slice(0, 500) });
    }
  }
  return false;
}

/** A LinkedIn note for an email written before notes existed (or whose note failed its checks). Haiku, capped per founder. */
export const writeNote = action({
  args: { token: v.string(), rank: v.number() },
  returns: v.union(v.object({ ok: v.literal(true) }), v.object({ ok: v.literal(false), error: v.string() })),
  handler: async (ctx, { token, rank }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { ok: false as const, error: "Please sign in to write LinkedIn notes." };
    const row: { founder: Doc<"founders">; investor: Doc<"investors">; draftId: Id<"drafts">; body: string; hasNote: boolean } | null = await ctx.runQuery(internal.founders.draftForNote, { token, rank, userId });
    if (!row) return { ok: false as const, error: "Write the email first." };
    if (row.hasNote) return { ok: true as const };
    if (row.investor.retired) return { ok: false as const, error: "This investor is no longer active." };
    if (!(await limits.limit(ctx, "notesPerFounder", { key: row.founder._id })).ok) return { ok: false as const, error: "That's today's LinkedIn notes. Come back tomorrow." };
    if (!(await limits.limit(ctx, "aiCallsGlobal", { count: 1 })).ok) return { ok: false as const, error: BUSY };
    const founder = briefOf(row.founder), facts = investorFacts(row.investor);
    const given = { oneLiner: founder.oneLiner, founderLine: founder.founderLine, traction: [founder.traction, founder.revenue, founder.customers].filter(Boolean).join(" "), company: founder.company, investorFacts: JSON.stringify(facts) + " " + founder.raising };
    const userText = `FOUNDER:\n${JSON.stringify(founder)}\n\nINVESTOR:\n${JSON.stringify(facts)}\n\nEMAIL:\n${row.body}`;
    const client = new Anthropic();
    let fix = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      const started = Date.now();
      try {
        const res = await client.messages.parse({
          model: MORE_MODEL, max_tokens: 400, system: NOTE_SYSTEM,
          messages: [{ role: "user", content: userText + fix }],
          output_config: { format: zodOutputFormat(Note) },
        });
        const out = res.parsed_output;
        await ctx.runMutation(internal.founders.logAiCall, { founderId: row.founder._id, purpose: "linkedin_note", model: MORE_MODEL, input: userText + fix, output: out ? JSON.stringify(out) : `stop_reason: ${res.stop_reason}`, ms: Date.now() - started, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens });
        if (!out) continue;
        const problems = checkNote(out.linkedin, given);
        if (problems.length) { fix = `\n\nYour last note had these problems. Fix them:\n- ${problems.join("\n- ")}`; continue; }
        await ctx.runMutation(internal.founders.saveNote, { draftId: row.draftId, linkedin: out.linkedin.trim() });
        return { ok: true as const };
      } catch (e) {
        const msg = e instanceof Anthropic.APIError ? `API ${e.status}: ${e.message}` : e instanceof Error ? e.message : String(e);
        await ctx.runMutation(internal.founders.logAiCall, { founderId: row.founder._id, purpose: "linkedin_note", model: MORE_MODEL, input: userText, output: "", ms: Date.now() - started, error: msg.slice(0, 500) });
      }
    }
    return { ok: false as const, error: BUSY };
  },
});
