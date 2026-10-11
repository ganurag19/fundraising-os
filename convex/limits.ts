import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

// AGENTS.md section 4: 3 runs per visitor a day, at most 40 AI calls an hour across the app.
export const limits = new RateLimiter(components.rateLimiter, {
  runsPerVisitor: { kind: "fixed window", rate: 3, period: 24 * HOUR },
  aiCallsGlobal: { kind: "token bucket", rate: 40, period: HOUR },
});
