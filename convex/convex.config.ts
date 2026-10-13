import { defineApp } from "convex/server";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import staticHosting from "@convex-dev/static-hosting/convex.config";

const app = defineApp();
app.use(rateLimiter);
app.use(staticHosting); // serves the built site; our own routes in http.ts stay at the root
export default app;
