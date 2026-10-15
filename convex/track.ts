import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { limits } from "./limits";
import { founderByToken } from "./founders";

const TOKEN = /^[a-f0-9]{48}$/;

/** Every name we count. Anything else is ignored. */
export const EVENT_NAMES = [
  "visit_landing", "visit_landing_classic", "visit_start", "visit_emails", "visit_dashboard", "visit_compare",
  "click_go", "click_code", "click_request", "click_unlock", "click_signin",
  "click_gmail", "click_copy", "click_write", "click_upgrade", "click_soon",
  "click_linkedin", "click_copy_note", "click_write_note",
  // which coming-soon idea she tapped: cards, and the sidebar's SOON pages
  "soon_competitors", "soon_trends", "soon_deck", "soon_qa", "soon_faq", "soon_vip", "soon_dataroom", "soon_inbox", "soon_connect",
  "visit_draft_a", "visit_draft_b", "click_go_draft_a", "click_go_draft_b", "soon_teaser", "soon_readiness", "soon_terms",
  "soon_tab_competition", "soon_tab_qa", "soon_tab_dataroom", "soon_tab_inbox", "soon_tab_connect", "click_feedback",
  // Raise Kit (15 Oct)
  "visit_kit", "visit_build", "visit_app", "click_build", "click_swipe_send", "click_swipe_skip", "click_upgrade_kit", "soon_tab_kit_qa", "soon_tab_kit_market", "soon_tab_kit_dataroom", "soon_tab_kit_profile",
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

/** The coming-soon ideas a founder can say she wants. */
export const WANT_KEYS = ["competitors", "trends", "deck", "qa", "faq", "vip", "dataroom", "inbox", "connect", "teaser", "readiness", "terms",
  // "What's hardest about raising your first round?" (landing drafts)
  "pain_deck", "pain_find", "pain_write", "pain_follow", "pain_intros", "pain_qa",
  // Raise Kit dashboard: coming-soon tabs
  "kit_qa", "kit_market", "kit_dataroom", "kit_pitchroom", "kit_intros"] as const;
const WANTS = new Set<string>(WANT_KEYS);

/** "I'm interested": remembered once per visitor and idea, with her company if she has a list. */
export const want = mutation({
  args: { token: v.string(), key: v.string() },
  returns: v.null(),
  handler: async (ctx, { token, key }) => {
    if (!TOKEN.test(token) || !WANTS.has(key)) return null;
    if (!(await limits.limit(ctx, "eventsPerVisitor", { key: token })).ok) return null;
    const visitor = await visitorHash(token);
    if (await ctx.db.query("wants").withIndex("by_visitor_and_key", (q) => q.eq("visitor", visitor).eq("key", key)).first()) return null;
    const f = await founderByToken(ctx, token);
    await ctx.db.insert("wants", { key, visitor, founderId: f?._id });
    return null;
  },
});
