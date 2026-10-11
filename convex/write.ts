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
import { checkDraft, unsourcedFacts } from "./lib/checks";
import { DRAFT_SYSTEM, FACT_FIELDS } from "./lib/prompt";
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
});

export const oneLinerOf = (f: Doc<"founders">) =>
  f.oneLiner ?? `${f.company} helps ${f.forWho} ${f.outcome} through ${f.how}${f.reduce ? `, reducing ${f.reduce}` : ""}.`;

const briefOf = (f: Doc<"founders">): FounderBrief => ({
  name: f.name, company: f.company, oneLiner: oneLinerOf(f), founderLine: f.founderLine ?? "", sectors: f.sectors,
  stage: f.stage, raising: f.ask, revenue: f.revenue, customers: f.customers,
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
    const data: { founder: Doc<"founders">; investors: Doc<"investors">[] } | null = await ctx.runQuery(internal.founders.forDrafting, { token });
    if (!data) return { ok: false as const, error: "Please start again from the first step." };
    const f = data.founder;
    if (!(f.oneLiner || f.forWho) || !f.founderLine) return { ok: false as const, error: "Please fill in the short profile first." };
    if (f.emailsStatus === "writing") return { ok: true as const };

    const run = await limits.limit(ctx, "runsPerVisitor", { key: f._id });
    if (!run.ok) return { ok: false as const, error: "You've used today's 3 runs. Come back tomorrow." };
    const calls = await limits.limit(ctx, "aiCallsGlobal", { count: 3 });
    if (!calls.ok) return { ok: false as const, error: BUSY };

    await ctx.runMutation(internal.founders.setStatus, { founderId: f._id, status: "writing" });
    const year = new Date().getFullYear();
    const matchCount = rankMatches(data.investors, f, year).length;
    const list: { inv: Doc<"investors">; score: number }[] = topMatches(data.investors, f, year, 20);
    const top = list.slice(0, 3);
    if (!top.length) {
      await ctx.runMutation(internal.founders.setStatus, { founderId: f._id, status: "failed" });
      return { ok: false as const, error: "We don't have investors for this sector and stage yet." };
    }
    await ctx.runMutation(internal.founders.saveMatches, { founderId: f._id, matchCount, picks: list.map((t) => ({ investorId: t.inv._id, score: t.score })) });

    const founder = briefOf(f);
    const client = new Anthropic();
    const results: boolean[] = await Promise.all(top.map((t) => writeOne(ctx, client, f._id, founder, t.inv)));
    const ok: number = results.filter(Boolean).length;
    await ctx.runMutation(internal.founders.setStatus, { founderId: f._id, status: ok ? "ready" : "failed" });
    if (ok) await ctx.runMutation(internal.founders.logStep, { step: "emails_ready" });
    return ok ? { ok: true as const } : { ok: false as const, error: BUSY };
  },
});

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
    const mine = await limits.limit(ctx, "extraEmailsPerFounder", { key: row.founder._id });
    if (!mine.ok) return { ok: false as const, error: "That's today's emails. Come back tomorrow for more." };
    const calls = await limits.limit(ctx, "aiCallsGlobal", { count: 1 });
    if (!calls.ok) return { ok: false as const, error: BUSY };
    const ok = await writeOne(ctx, new Anthropic(), row.founder._id, briefOf(row.founder), row.investor, "more_email", MORE_MODEL);
    return ok ? { ok: true as const } : { ok: false as const, error: BUSY };
  },
});

type FounderBrief = { name: string; company: string; oneLiner: string; founderLine: string; sectors: string[]; stage: string; raising: string; revenue?: string; customers?: string; website?: string; linkedin?: string };

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
      const problems = checkDraft({ subject: out.subject, body: out.body, oneLiner: founder.oneLiner, founderLine: founder.founderLine });
      const unsourced = unsourcedFacts(out.factsUsed, facts as Record<string, unknown>);
      if ((problems.length || unsourced.length) && attempt === 0) {
        fixNote = `\n\nYour last draft had these problems. Fix them and keep everything else true:\n- ${[...problems, ...unsourced.map((u) => `Not in INVESTOR: ${u}`)].join("\n- ")}`;
        continue;
      }
      await ctx.runMutation(internal.founders.saveDraft, {
        founderId, investorId: inv._id, hook: out.hook, reason: out.reason, whyFit: out.whyFit.slice(0, 2), watchOut: out.watchOut.slice(0, 1),
        subject: out.subject, body: out.body, warnings: [...problems, ...unsourced.map((u) => `Check this: "${u}"`)],
      });
      return true;
    } catch (e) {
      const msg = e instanceof Anthropic.APIError ? `API ${e.status}: ${e.message}` : e instanceof Error ? e.message : String(e);
      await ctx.runMutation(internal.founders.logAiCall, { founderId, purpose, model, input: userText, output: "", ms: Date.now() - started, error: msg.slice(0, 500) });
    }
  }
  return false;
}
