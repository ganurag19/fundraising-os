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
    email: v.optional(v.string()), // every row has an email or an applyUrl (checked in scripts/build_import.py)
    applyUrl: v.optional(v.string()), // accelerators, grants, and funds that only take decks through a form
    applyDeadline: v.optional(v.string()), // YYYY-MM-DD
    applyType: v.optional(v.union(v.literal("rolling"), v.literal("cohort"), v.literal("call"), v.literal("form"))),
    city: v.optional(v.string()),
    website: v.optional(v.string()),
    sectors: v.array(v.string()),
    stages: v.array(v.string()),
    chequeMinLakh: v.optional(v.number()),
    chequeMaxLakh: v.optional(v.number()),
    leadsRounds: v.optional(v.boolean()),
    thesis: v.optional(v.string()),
    portfolio: v.array(v.string()),
    recent: v.array(v.object({ company: v.string(), year: v.optional(v.number()), round: v.optional(v.string()), sector: v.optional(v.string()) })),
    active: v.optional(v.boolean()),
    pitchRoute: v.optional(v.string()),
    sourceUrls: v.array(v.string()),
    sourceDate: v.optional(v.string()),
    lastChecked: v.optional(v.string()),
    linkedin: v.optional(v.string()), // public LinkedIn profile of the person (or the firm), from the research; never guessed
    logo: v.optional(v.string()), // the fund's logo from its own site (touch icon, icon or social image), found once for a founder's top picks
    logoChecked: v.optional(v.number()), // when we last looked, so a site without one isn't fetched again
    retired: v.optional(v.boolean()), // dropped from the research (stopped investing, failed checks): kept for existing lists, never matched again
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
    emailReminders: v.optional(v.boolean()), // unset = on; she can turn them off in Settings
    remindedOn: v.optional(v.string()), // YYYY-MM-DD (IST) of the last follow-up reminder, so at most one a day
    plan: v.optional(v.literal("round_pass")), // granted by hand for founding-list pre-sales until payments exist
    planUntil: v.optional(v.number()),
    domainMatch: v.optional(v.boolean()), // internal only: sign-in email domain matches her website
  }).index("by_token", ["token"]).index("by_userId", ["userId"]),

  // A founder's ranked investors: up to 20. Ranks 0–2 are her top picks.
  matches: defineTable({
    founderId: v.id("founders"),
    investorId: v.id("investors"),
    rank: v.number(),
    score: v.number(),
    sentAt: v.optional(v.number()), // she tapped "I sent it"
    reason: v.optional(v.string()), // one line on why they fit (ranks 3+; top picks have theirs in drafts)
    // Pipeline status (plain updates, AGENTS.md section 1). Unset means not sent yet.
    status: v.optional(v.union(v.literal("sent"), v.literal("replied"), v.literal("meeting"), v.literal("passed"))),
    statusAt: v.optional(v.number()),
  }).index("by_founder_and_rank", ["founderId", "rank"]),

  // Follow-ups: #1 is written 3 days after she sends, #2 seven days after she sends #1.
  // A reply, meeting or pass cancels whatever is still scheduled or ready.
  followups: defineTable({
    founderId: v.id("founders"),
    matchId: v.id("matches"),
    n: v.number(), // 1 or 2
    dueAt: v.number(),
    state: v.union(v.literal("scheduled"), v.literal("ready"), v.literal("sent"), v.literal("cancelled"), v.literal("failed")),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    sentAt: v.optional(v.number()),
  })
    .index("by_match_and_n", ["matchId", "n"])
    .index("by_founder_and_state", ["founderId", "state"])
    .index("by_state", ["state"]),

  // Emails we sent to the founder herself (never to investors): welcome and follow-up reminders.
  notifications: defineTable({
    founderId: v.id("founders"),
    kind: v.union(v.literal("welcome"), v.literal("followups_due"), v.literal("room_request"), v.literal("upgrade_nudge")),
    ok: v.boolean(),
    error: v.optional(v.string()),
  }).index("by_founder", ["founderId"]),

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
    linkedin: v.optional(v.string()), // the LinkedIn connection note (300 characters at most), same facts as the email
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

  // "Join the founding list" for Round Pass, and "Book a call" for Custom, from the landing page. No payment.
  passInterest: defineTable({
    email: v.string(),
    name: v.string(),
    plan: v.union(v.literal("round_pass"), v.literal("custom")),
    note: v.optional(v.string()),
  }).index("by_email_and_plan", ["email", "plan"]),

  // Funnel: step name and time only. No names, emails or company details.
  steps: defineTable({ step: v.string() }),

  // Page visits and button clicks, for the owner's dashboard. visitor is a hash of the browser's random code, never the code itself.
  events: defineTable({ name: v.string(), visitor: v.string() }),

  // The product-market fit question, asked once she has sent 3+ emails: "How would you feel if you could no longer use FirstCheq?"
  pmf: defineTable({ founderId: v.id("founders"), answer: v.union(v.literal("very"), v.literal("somewhat"), v.literal("not")), benefit: v.optional(v.string()) }).index("by_founderId", ["founderId"]),

  // "I'm interested" on a coming-soon idea: which founder (or visitor) wants which, once each.
  wants: defineTable({ key: v.string(), visitor: v.string(), founderId: v.optional(v.id("founders")) }).index("by_visitor_and_key", ["visitor", "key"]),

  // "Send feedback" from the app: what she wrote, where, and an email only if she gave one (or is signed in).
  feedback: defineTable({ page: v.string(), text: v.string(), email: v.optional(v.string()), company: v.optional(v.string()), visitor: v.string() }),

  // The owner's /admin unlocks: Google sign-in as ADMIN_EMAIL plus ADMIN_PIN. Each one is deleted when it expires.
  adminSessions: defineTable({ key: v.string(), userId: v.id("users") }).index("by_key", ["key"]),

  // The Raise Kit (15 Oct): her brand, the extra facts she confirmed, and the deck and teaser written from them.
  kits: defineTable({
    founderId: v.id("founders"),
    status: v.union(v.literal("building"), v.literal("ready"), v.literal("failed")),
    brand: v.object({ primary: v.string(), accent: v.optional(v.string()), logo: v.optional(v.string()), font: v.optional(v.string()), fontCss: v.optional(v.string()) }),
    slug: v.optional(v.string()), // her pitch room: firstcheq.ai/p/<slug>
    facts: v.object({
      problem: v.optional(v.string()), product: v.optional(v.string()), forWho: v.optional(v.string()),
      customers: v.optional(v.string()), // named customers or partners, her words
      market: v.optional(v.string()), businessModel: v.optional(v.string()), competitors: v.optional(v.string()),
      useOfFunds: v.optional(v.string()), whyNow: v.optional(v.string()),
      team: v.array(v.object({ name: v.string(), role: v.string(), line: v.string() })),
    }),
    // 9 slides in a fixed order (cover … ask). Every number in them is one she gave us (checked in code).
    deck: v.optional(v.array(v.object({ key: v.string(), headline: v.string(), points: v.array(v.string()), metrics: v.array(v.object({ value: v.string(), label: v.string() })) }))),
    teaser: v.optional(v.object({ summary: v.string(), highlights: v.array(v.string()) })),
    uploads: v.number(), // how many files she gave us (read once, then deleted)
  }).index("by_founderId", ["founderId"]).index("by_slug", ["slug"]),

  // Her pitch room (16 Oct): an investor asks for access with name and email; she approves or declines.
  // viewer is a long random code kept in the investor's browser, so only that browser sees the room once approved.
  roomRequests: defineTable({
    kitId: v.id("kits"),
    viewer: v.string(),
    name: v.string(),
    email: v.string(),
    firm: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("declined")),
    decidedAt: v.optional(v.number()),
  }).index("by_kitId", ["kitId"]).index("by_viewer_and_kitId", ["viewer", "kitId"]),

  // What an approved investor did in her room: opened it, read a slide, opened the teaser, asked to meet.
  roomEvents: defineTable({
    kitId: v.id("kits"),
    requestId: v.id("roomRequests"),
    kind: v.union(v.literal("view"), v.literal("slide"), v.literal("teaser"), v.literal("meet")),
    slide: v.optional(v.number()),
  }).index("by_kitId", ["kitId"]).index("by_requestId", ["requestId"]),

  // Deck and pitch review (16 Oct): her own deck, read once (then deleted), reviewed like a seed investor would.
  deckReviews: defineTable({
    founderId: v.optional(v.id("founders")), // set once she has a record (deck-first visitors review before that)
    token: v.optional(v.string()), // her browser's code, so a review before sign-up follows her into her kit
    fileName: v.string(),
    score: v.number(), // 0–100, investor-readiness of this deck
    verdict: v.union(v.literal("raise_now"), v.literal("raise_with_fixes"), v.literal("build_traction_first")),
    verdictWhy: v.string(),
    strengths: v.array(v.string()),
    fixes: v.array(v.object({ slide: v.string(), issue: v.string(), fix: v.string(), impact: v.union(v.literal("high"), v.literal("medium"), v.literal("low")) })),
    missing: v.array(v.string()),
    thesis: v.object({ claim: v.string(), tests: v.array(v.object({ question: v.string(), risk: v.union(v.literal("high"), v.literal("medium"), v.literal("low")), howToAnswer: v.string() })) }),
    questions: v.array(v.string()),
  }).index("by_founderId", ["founderId"]).index("by_token", ["token"]),

  // Quick feedback from the kit dashboard (16 Oct): separate from "Request full access", so feedback isn't mistaken for intent to pay.
  kitRatings: defineTable({
    founderId: v.id("founders"),
    useful: v.optional(v.number()), // 1–5, the one-tap prompt
    solves: v.optional(v.number()), // 1–5
    valuable: v.optional(v.number()), // 1–5
    liked: v.optional(v.string()),
    missing: v.optional(v.string()),
  }).index("by_founderId", ["founderId"]),

  // "Request full access" from the kit dashboard: the plan she wants and her answers. No payment.
  upgradeRequests: defineTable({
    founderId: v.id("founders"),
    email: v.optional(v.string()),
    plan: v.string(),
    wouldPay: v.string(), // yes · maybe · no
    price: v.optional(v.string()),
    liked: v.optional(v.string()),
    missing: v.optional(v.string()),
    solves: v.number(), // 1–5: does this solve your problem?
    valuable: v.number(), // 1–5: how valuable is this?
    raisingWhen: v.optional(v.string()),
    phone: v.optional(v.string()),
  }).index("by_founderId", ["founderId"]),
});
