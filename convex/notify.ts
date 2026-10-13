import { internalAction, internalMutation, internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { founderByToken, isUnlocked } from "./founders";

// Emails to the founder herself, never to investors (AGENTS.md: nothing is ever sent for her).
// Sent through Resend. Env: RESEND_API_KEY, EMAIL_FROM (e.g. "FirstCheq <reminders@firstcheq.ai>"), SITE_URL.
const site = () => process.env.SITE_URL ?? "https://www.firstcheq.ai";
const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

async function send(to: string, subject: string, lines: string[], cta: { label: string; url: string }): Promise<string | null> {
  const key = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM;
  if (!key || !from) return "Email not set up (RESEND_API_KEY or EMAIL_FROM missing)";
  const text = [...lines, "", `${cta.label}: ${cta.url}`, "", "Turn these emails off in Settings: " + site() + "/dashboard", "FirstCheq · nothing is ever sent to investors for you."].join("\n");
  const logo = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px"><tr><td style="vertical-align:middle"><img src="${site()}/logo-512.png" width="32" height="32" alt="" style="display:block;border-radius:8px"></td><td style="vertical-align:middle;padding-left:10px;font-family:Inter,Arial,sans-serif;font-size:19px;letter-spacing:-0.3px;color:#14151a"><span style="font-weight:500;color:#3d4250">First</span><span style="font-weight:800">Cheq</span></td></tr></table>`;
  const html = `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.55;color:#14151a;max-width:520px">${logo}${lines.map((l) => `<p style="margin:0 0 12px">${escape(l)}</p>`).join("")}<p style="margin:20px 0"><a href="${cta.url}" style="background:#3D7BFF;color:#fff;text-decoration:none;padding:11px 18px;border-radius:999px;font-weight:600">${escape(cta.label)}</a></p><p style="color:#6b7080;font-size:12px;margin-top:28px">You get this because you use FirstCheq. <a href="${site()}/dashboard" style="color:#6b7080">Turn these emails off in Settings</a>. Nothing is ever sent to investors for you.</p></div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html, text }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok ? null : `Resend ${res.status}: ${(await res.text()).slice(0, 200)}`;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

/** India date, so "today" matches her day. */
const istDate = (t = Date.now()) => new Date(t + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

export const log = internalMutation({
  args: { founderId: v.id("founders"), kind: v.union(v.literal("welcome"), v.literal("followups_due")), error: v.union(v.string(), v.null()), remindedOn: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { founderId, kind, error, remindedOn }) => {
    await ctx.db.insert("notifications", { founderId, kind, ok: !error, error: error ?? undefined });
    if (remindedOn && !error) await ctx.db.patch("founders", founderId, { remindedOn });
    return null;
  },
});

export const forWelcome = internalQuery({
  args: { founderId: v.id("founders"), force: v.optional(v.boolean()) },
  returns: v.any(),
  handler: async (ctx, { founderId, force }) => {
    const f = await ctx.db.get("founders", founderId);
    const user = f?.userId ? await ctx.db.get("users", f.userId) : null;
    if (!f || !user?.email || f.emailReminders === false) return null;
    const already = await ctx.db.query("notifications").withIndex("by_founder", (q) => q.eq("founderId", founderId)).take(20);
    if (!force && already.some((n) => n.kind === "welcome" && n.ok)) return null;
    return { email: user.email, name: f.name, company: f.company, matchCount: f.matchCount ?? 0 };
  },
});

/** Right after she signs in: one welcome email with where to pick up. */
export const welcome = internalAction({
  args: { founderId: v.id("founders"), force: v.optional(v.boolean()) }, // force: resend for a test, from the terminal
  returns: v.null(),
  handler: async (ctx, { founderId, force }) => {
    const d: { email: string; name: string; company: string; matchCount: number } | null = await ctx.runQuery(internal.notify.forWelcome, { founderId, force });
    if (!d) return null;
    const first = d.name.split(" ")[0];
    const error = await send(d.email, `Your investor list for ${d.company} is ready`, [
      `Hi ${first},`,
      `${d.matchCount} investors fit ${d.company}. Your 3 top picks have emails ready to send, and you can write to any of the others in one tap.`,
      "When you send one, tap \"I sent it\". We'll write your follow-ups and remind you here when one is due.",
    ], { label: "Open my dashboard", url: `${site()}/dashboard` });
    await ctx.runMutation(internal.notify.log, { founderId, kind: "welcome", error });
    return null;
  },
});

export const dueToday = internalQuery({
  args: { today: v.string() },
  returns: v.any(),
  handler: async (ctx, { today }) => {
    const ready = await ctx.db.query("followups").withIndex("by_state", (q) => q.eq("state", "ready")).take(2000);
    const byFounder = new Map<Id<"founders">, string[]>();
    for (const fu of ready) {
      const m = await ctx.db.get("matches", fu.matchId);
      const inv = m ? await ctx.db.get("investors", m.investorId) : null;
      if (!inv || m?.status !== "sent") continue;
      byFounder.set(fu.founderId, [...(byFounder.get(fu.founderId) ?? []), inv.displayName]);
    }
    const out = [];
    for (const [founderId, names] of byFounder) {
      const f = await ctx.db.get("founders", founderId);
      const user = f?.userId ? await ctx.db.get("users", f.userId) : null;
      if (!f || !user?.email || f.emailReminders === false || f.remindedOn === today) continue;
      out.push({ founderId, email: user.email, name: f.name, names });
    }
    return out;
  },
});

/** Every morning (9 AM India): one email per founder with follow-ups ready to send. At most one a day. */
export const sendDigests = internalAction({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const today = istDate();
    const due: { founderId: Id<"founders">; email: string; name: string; names: string[] }[] = await ctx.runQuery(internal.notify.dueToday, { today });
    for (const d of due) {
      const n = d.names.length, first = d.name.split(" ")[0];
      const who = n === 1 ? d.names[0] : n === 2 ? `${d.names[0]} and ${d.names[1]}` : `${d.names[0]}, ${d.names[1]} and ${n - 2} more`;
      const error = await send(d.email, n === 1 ? `Your follow-up to ${d.names[0]} is ready` : `${n} follow-ups are ready to send`, [
        `Hi ${first},`,
        `No reply yet from ${who}. We've written ${n === 1 ? "a short follow-up" : "short follow-ups"} for you; ${n === 1 ? "it takes" : "each takes"} about 30 seconds to send from your Gmail.`,
        "Most replies come after a follow-up, not the first email.",
      ], { label: n === 1 ? "Send the follow-up" : "Send the follow-ups", url: `${site()}/dashboard` });
      await ctx.runMutation(internal.notify.log, { founderId: d.founderId, kind: "followups_due", error, remindedOn: today });
    }
    return due.length;
  },
});

/** Settings: "Email me when a follow-up is due". */
export const setReminders = mutation({
  args: { token: v.string(), on: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { token, on }) => {
    const f = await founderByToken(ctx, token);
    if (!f || !(await isUnlocked(ctx, f))) return null;
    await ctx.db.patch("founders", f._id, { emailReminders: on });
    return null;
  },
});
