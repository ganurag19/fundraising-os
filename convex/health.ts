import { query } from "./_generated/server";
import { v } from "convex/values";

// Setup check: proves the app can reach the backend. Removed once real features exist.
export const ping = query({
  args: {},
  returns: v.string(),
  handler: async () => "ok",
});
