import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // People who asked for an invite from the landing page.
  waitlist: defineTable({
    email: v.string(),
    name: v.string(),
    company: v.string(),
    stage: v.string(),
    status: v.union(v.literal("waiting"), v.literal("invited")),
  }).index("by_email", ["email"]),

  // Invite codes. A code works until it has been used `maxUses` times.
  inviteCodes: defineTable({
    code: v.string(),
    label: v.string(), // who it's for, e.g. "GrowthX cohort"
    maxUses: v.number(),
    uses: v.number(),
  }).index("by_code", ["code"]),

  // Researched investors, imported from seed/ (never committed). Fields: docs/SEED_FORMAT.md.
  investors: defineTable({
    seedId: v.string(),
    kind: v.string(),
    displayName: v.string(),
    person: v.optional(v.string()),
    firm: v.optional(v.string()),
    title: v.optional(v.string()),
    email: v.string(),
    city: v.optional(v.string()),
    website: v.optional(v.string()),
    sectors: v.array(v.string()),
    stages: v.array(v.string()),
    chequeMinLakh: v.optional(v.number()),
    chequeMaxLakh: v.optional(v.number()),
    leadsRounds: v.optional(v.boolean()),
    thesis: v.optional(v.string()),
    portfolio: v.array(v.string()),
    recent: v.array(v.object({ company: v.string(), year: v.optional(v.number()), round: v.optional(v.string()) })),
    active: v.optional(v.boolean()),
    pitchRoute: v.optional(v.string()),
    sourceUrls: v.array(v.string()),
    sourceDate: v.optional(v.string()),
    lastChecked: v.optional(v.string()),
  }).index("by_seedId", ["seedId"]),

  // One founder per browser until sign-in. `token` is a long random string kept in her browser.
  founders: defineTable({
    token: v.string(),
    inviteCode: v.string(),
    company: v.string(),
    name: v.string(),
    sectors: v.array(v.string()),
    stage: v.string(),
    ask: v.string(),
    // Her links. LinkedIn is saved and shown in her signature, never read.
    website: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    // "So the email sounds like you" (asked once). oneLiner is drafted from her website, then edited by her.
    oneLiner: v.optional(v.string()),
    vision: v.optional(v.string()), // her words, e.g. "make every Indian city climate-ready"
    traction: v.optional(v.string()), // approved sentence built from revenue and customers
    forWho: v.optional(v.string()), // older one-liner parts, kept for existing rows
    outcome: v.optional(v.string()),
    how: v.optional(v.string()),
    reduce: v.optional(v.string()),
    founderLine: v.optional(v.string()),
    revenue: v.optional(v.string()),
    customers: v.optional(v.string()),
    emailsStatus: v.union(v.literal("none"), v.literal("writing"), v.literal("ready"), v.literal("failed")),
    matchCount: v.optional(v.number()), // every investor that fits, before we keep the top 20
    activeCount: v.optional(v.number()), // of those, how many backed a deal this year or last
    leadCount: v.optional(v.number()), // of those, how many lead rounds
    userId: v.optional(v.id("users")), // set when she signs in on the reveal screen
    domainMatch: v.optional(v.boolean()), // internal only: sign-in email domain matches her website
  }).index("by_token", ["token"]),

  // A founder's ranked investors: up to 20. Ranks 0–2 are her top picks.
  matches: defineTable({
    founderId: v.id("founders"),
    investorId: v.id("investors"),
    rank: v.number(),
    score: v.number(),
    sentAt: v.optional(v.number()), // she tapped "I sent it"
  }).index("by_founder_and_rank", ["founderId", "rank"]),

  // Every email we wrote, and what the founder later changed it to.
  drafts: defineTable({
    founderId: v.id("founders"),
    investorId: v.id("investors"),
    kind: v.literal("first"),
    reason: v.string(),
    whyFit: v.array(v.string()),
    watchOut: v.array(v.string()),
    hook: v.optional(v.string()), // the one specific thing about this investor the email opens on
    subject: v.string(),
    body: v.string(),
    warnings: v.array(v.string()),
    editedSubject: v.optional(v.string()),
    editedBody: v.optional(v.string()),
  }).index("by_founder_and_investor", ["founderId", "investorId"]),

  // Log of every AI call (AGENTS.md section 4).
  aiCalls: defineTable({
    founderId: v.optional(v.id("founders")),
    purpose: v.string(),
    model: v.string(),
    input: v.string(),
    output: v.string(),
    ms: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    error: v.optional(v.string()),
  }),

  // Funnel: step name and time only. No names, emails or company details.
  steps: defineTable({ step: v.string() }),
});
