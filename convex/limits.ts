import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

// AGENTS.md section 4: 3 runs per visitor a day, at most 40 AI calls an hour across the app.
export const limits = new RateLimiter(components.rateLimiter, {
  runsPerVisitor: { kind: "fixed window", rate: 3, period: 24 * HOUR },
  websiteReadsPerVisitor: { kind: "fixed window", rate: 5, period: 24 * HOUR }, // one-liner from her website
  polishPerVisitor: { kind: "fixed window", rate: 10, period: 24 * HOUR }, // "How you'll come across"
  reasonsPerFounder: { kind: "fixed window", rate: 3, period: 24 * HOUR }, // one-line reasons for the rest of her list
  extraEmailsPass: { kind: "fixed window", rate: 40, period: 24 * HOUR }, // Round Pass: more emails a day
  interestGlobal: { kind: "token bucket", rate: 60, period: HOUR }, // founding-list sign-ups across the app
  extraEmailsPerFounder: { kind: "fixed window", rate: 17, period: 24 * HOUR }, // "Write email" beyond her top 3
  aiCallsGlobal: { kind: "token bucket", rate: 40, period: HOUR },
  // Abuse guards (no IPs in Convex, so per-visitor where we can, app-wide caps everywhere)
  codeTriesPerVisitor: { kind: "fixed window", rate: 10, period: HOUR }, // invite-code guesses
  badCodesGlobal: { kind: "token bucket", rate: 300, period: HOUR }, // wrong codes across the app
  invitesGlobal: { kind: "token bucket", rate: 100, period: HOUR }, // waitlist requests across the app
  newFoundersGlobal: { kind: "token bucket", rate: 120, period: HOUR }, // new sign-ups across the app
});
