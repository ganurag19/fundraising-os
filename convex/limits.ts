import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

// AGENTS.md section 4: 3 runs per visitor a day, at most 40 AI calls an hour across the app.
export const limits = new RateLimiter(components.rateLimiter, {
  runsPerVisitor: { kind: "fixed window", rate: 3, period: 24 * HOUR },
  websiteReadsPerVisitor: { kind: "fixed window", rate: 5, period: 24 * HOUR }, // one-liner from her website
  extraEmailsPerFounder: { kind: "fixed window", rate: 17, period: 24 * HOUR }, // "Write email" beyond her top 3
  aiCallsGlobal: { kind: "token bucket", rate: 40, period: HOUR },
});
