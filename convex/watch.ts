import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Hourly abuse watch. Counts what happened in the last hour and writes an ALERT line to the
// Convex logs when something looks unusual (dashboard → Logs, search "ALERT").
// Thresholds are deliberately low for the beta; raise them as real traffic grows.
export const LIMITS = { signups: 40, signIns: 40, extraEmails: 150, waitlist: 60 };
const HOUR = 60 * 60 * 1000;

export const hourly = internalMutation({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const since = Date.now() - HOUR;
    const recent = (table: "founders" | "waitlist") =>
      ctx.db.query(table).withIndex("by_creation_time", (q) => q.gt("_creationTime", since)).take(1000);
    const steps = await ctx.db.query("steps").withIndex("by_creation_time", (q) => q.gt("_creationTime", since)).take(5000);
    const extra = await ctx.db.query("aiCalls").withIndex("by_creation_time", (q) => q.gt("_creationTime", since)).take(5000);
    const counts = {
      signups: (await recent("founders")).length,
      signIns: steps.filter((s) => s.step === "signed_in").length,
      extraEmails: extra.filter((c) => c.purpose === "more_email").length,
      waitlist: (await recent("waitlist")).length,
    };
    const alerts = (Object.keys(LIMITS) as (keyof typeof LIMITS)[])
      .filter((k) => counts[k] > LIMITS[k])
      .map((k) => `ALERT ${k}: ${counts[k]} in the last hour (limit ${LIMITS[k]})`);

    // One founder asking for unusually many emails is the clearest scraping signal.
    const perFounder = new Map<string, number>();
    for (const c of extra) if (c.purpose === "more_email" && c.founderId) perFounder.set(c.founderId, (perFounder.get(c.founderId) ?? 0) + 1);
    for (const [id, n] of perFounder) if (n >= 15) alerts.push(`ALERT founder ${id}: ${n} extra emails in the last hour`);

    for (const a of alerts) console.error(a);
    return alerts;
  },
});
