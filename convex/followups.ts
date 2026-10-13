"use node";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { checkFollowup } from "./lib/checks";
import { FOLLOWUP_SYSTEM } from "./lib/prompt";
import { limits } from "./limits";

const MODEL = "claude-haiku-4-5"; // follow-ups (AGENTS.md section 4)
const MAX_TOKENS = 400;
const FollowUp = z.object({ subject: z.string(), body: z.string() });

type Ctx = {
  followup: Doc<"followups">; match: Doc<"matches"> | null; founder: Doc<"founders"> | null;
  investor: Doc<"investors"> | null; first: Doc<"drafts"> | null; earlier: Doc<"followups"> | null;
};

/** Runs when a follow-up comes due. Writes it only if she's still waiting on that investor. */
export const write = internalAction({
  args: { followupId: v.id("followups") },
  returns: v.null(),
  handler: async (ctx, { followupId }) => {
    const d: Ctx | null = await ctx.runQuery(internal.pipeline.forFollowup, { followupId });
    if (!d || d.followup.state !== "scheduled" || d.followup.dueAt > Date.now() + 60_000) return null;
    if (!d.match || d.match.status !== "sent" || !d.founder || !d.investor || !d.first) {
      await ctx.runMutation(internal.pipeline.saveFollowup, { followupId, failed: true });
      return null;
    }
    if (!(await limits.limit(ctx, "aiCallsGlobal", { count: 1 })).ok) {
      await ctx.runMutation(internal.pipeline.retryLater, { followupId });
      return null;
    }
    const f = d.founder;
    const hasTraction = !!(f.traction || f.revenue || f.customers);
    const input = JSON.stringify({
      ...(hasTraction ? {} : { NOTE: "FOUNDER gave no traction. Do not mention traction, progress, growth, customers, revenue, pilots or adoption in any form." }),
      N: d.followup.n,
      FOUNDER: { name: f.name, company: f.company, oneLiner: f.oneLiner, traction: f.traction, revenue: f.traction ? undefined : f.revenue, customers: f.traction ? undefined : f.customers, raising: f.ask, stage: f.stage },
      INVESTOR: { person: d.investor.person, firm: d.investor.firm ?? d.investor.displayName },
      FIRST: { subject: d.first.editedSubject ?? d.first.subject, body: d.first.editedBody ?? d.first.body },
      EARLIER: d.earlier?.body ? { body: d.earlier.body } : undefined,
    });
    const client = new Anthropic();
    for (let attempt = 0; attempt < 2; attempt++) {
      const started = Date.now();
      try {
        const res = await client.messages.parse({
          model: MODEL, max_tokens: MAX_TOKENS, system: FOLLOWUP_SYSTEM,
          messages: [{ role: "user", content: input }],
          output_config: { format: zodOutputFormat(FollowUp) },
        });
        const out = res.parsed_output;
        await ctx.runMutation(internal.founders.logAiCall, { founderId: f._id, purpose: `followup_${d.followup.n}`, model: MODEL, input, output: out ? JSON.stringify(out) : `stop_reason: ${res.stop_reason}`, ms: Date.now() - started, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens });
        if (!out) continue;
        const subject = `Re: ${d.first.editedSubject ?? d.first.subject}`; // keep the thread's subject exactly
        const problems = checkFollowup(out.body, hasTraction);
        if (problems.length) {
          if (attempt === 0) continue;
          // never save a follow-up that breaks the rules; mark it failed rather than retry forever
          await ctx.runMutation(internal.pipeline.saveFollowup, { followupId, failed: true });
          return null;
        }
        await ctx.runMutation(internal.pipeline.saveFollowup, { followupId, subject, body: out.body.trim() });
        return null;
      } catch (e) {
        const msg = e instanceof Anthropic.APIError ? `API ${e.status}: ${e.message}` : e instanceof Error ? e.message : String(e);
        await ctx.runMutation(internal.founders.logAiCall, { founderId: f._id, purpose: `followup_${d.followup.n}`, model: MODEL, input, output: "", ms: Date.now() - started, error: msg.slice(0, 500) });
      }
    }
    await ctx.runMutation(internal.pipeline.retryLater, { followupId });
    return null;
  },
});
