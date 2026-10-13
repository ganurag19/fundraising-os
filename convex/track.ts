import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { limits } from "./limits";

const TOKEN = /^[a-f0-9]{48}$/;

/** Every name we count. Anything else is ignored. */
export const EVENT_NAMES = [
  "visit_landing", "visit_start", "visit_emails", "visit_dashboard", "visit_compare",
  "click_go", "click_code", "click_request", "click_unlock", "click_signin",
  "click_gmail", "click_copy", "click_write", "click_upgrade", "click_soon",
] as const;
const NAMES = new Set<string>(EVENT_NAMES);

/** A short, one-way stand-in for the visitor's code, so counts can tell visitors apart without storing the code. */
export async function visitorHash(token: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("fc-visitor:" + token)));
  return Array.from(bytes.slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** One page visit or button click. No names, emails or typed text. */
export const hit = mutation({
  args: { token: v.string(), name: v.string() },
  returns: v.null(),
  handler: async (ctx, { token, name }) => {
    if (!TOKEN.test(token) || !NAMES.has(name)) return null;
    if (!(await limits.limit(ctx, "eventsPerVisitor", { key: token })).ok) return null;
    if (!(await limits.limit(ctx, "eventsGlobal")).ok) return null;
    await ctx.db.insert("events", { name, visitor: await visitorHash(token) });
    return null;
  },
});
