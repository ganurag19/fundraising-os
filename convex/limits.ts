import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

// AGENTS.md section 4: 3 runs per visitor a day, at most 200 AI calls an hour across the app.
export const limits = new RateLimiter(components.rateLimiter, {
  runsPerVisitor: { kind: "fixed window", rate: 3, period: 24 * HOUR },
  websiteReadsPerVisitor: { kind: "fixed window", rate: 5, period: 24 * HOUR }, // one-liner from her website
  polishPerVisitor: { kind: "fixed window", rate: 10, period: 24 * HOUR }, // "How you'll come across"
  reasonsPerFounder: { kind: "fixed window", rate: 3, period: 24 * HOUR }, // one-line reasons for the rest of her list
  extraEmailsPass: { kind: "fixed window", rate: 40, period: 24 * HOUR }, // Round Pass: more emails a day
  interestGlobal: { kind: "token bucket", rate: 60, period: HOUR }, // founding-list sign-ups across the app
  extraEmailsPerFounder: { kind: "fixed window", rate: 17, period: 24 * HOUR }, // "Write email" beyond her top 3
  aiCallsGlobal: { kind: "token bucket", rate: 200, period: HOUR }, // raised from 40 on 14 Oct: ~6 calls per sign-up, so ~33 sign-ups an hour
  // Abuse guards (no IPs in Convex, so per-visitor where we can, app-wide caps everywhere)
  codeTriesPerVisitor: { kind: "fixed window", rate: 10, period: HOUR }, // invite-code guesses
  badCodesGlobal: { kind: "token bucket", rate: 300, period: HOUR }, // wrong codes across the app
  invitesGlobal: { kind: "token bucket", rate: 100, period: HOUR }, // waitlist requests across the app
  newFoundersGlobal: { kind: "token bucket", rate: 120, period: HOUR }, // new sign-ups across the app
  eventsPerVisitor: { kind: "fixed window", rate: 300, period: HOUR }, // page visits and clicks we count
  eventsGlobal: { kind: "token bucket", rate: 6000, period: HOUR },
  notesPerFounder: { kind: "fixed window", rate: 20, period: 24 * HOUR }, // LinkedIn notes for emails written before notes existed
  feedbackPerVisitor: { kind: "fixed window", rate: 5, period: HOUR },
  feedbackGlobal: { kind: "token bucket", rate: 200, period: HOUR },
  uploadsPerVisitor: { kind: "fixed window", rate: 10, period: 24 * HOUR }, // Raise Kit: her deck, CV or LinkedIn PDF
  teamLooksPerVisitor: { kind: "fixed window", rate: 3, period: 24 * HOUR }, // her top picks' teams, from their own sites
  logoLooksPerVisitor: { kind: "fixed window", rate: 5, period: 24 * HOUR }, // her top 5 investors' logos, from their own sites
  roomRequestsPerViewer: { kind: "fixed window", rate: 10, period: HOUR }, // pitch room: access requests from one browser
  roomRequestsGlobal: { kind: "token bucket", rate: 300, period: HOUR },
  roomEventsPerViewer: { kind: "fixed window", rate: 400, period: HOUR }, // views and slides counted for her
  deckReviewsPerVisitor: { kind: "fixed window", rate: 3, period: 24 * HOUR }, // deck review before sign-in (Start with your deck)
  marketRunsPerFounder: { kind: "fixed window", rate: 1, period: 24 * HOUR }, // market research on Sonnet with web search: about $0.60 a run
  marketRunsGlobal: { kind: "token bucket", rate: 80, period: 24 * HOUR },
  deckReviewsGlobal: { kind: "token bucket", rate: 120, period: 24 * HOUR }, // app-wide, so a spike can't drain the AI budget
  deckReviewsPerFounder: { kind: "fixed window", rate: 3, period: 24 * HOUR }, // Deck and pitch review (Sonnet, reads her PDF)
  docReadsPerVisitor: { kind: "fixed window", rate: 4, period: 24 * HOUR }, // reading those files once
  adminPinTries: { kind: "fixed window", rate: 5, period: HOUR }, // the owner's PIN, per account and app-wide
});
