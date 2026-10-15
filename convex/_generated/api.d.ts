/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as feedback from "../feedback.js";
import type * as followups from "../followups.js";
import type * as founders from "../founders.js";
import type * as http from "../http.js";
import type * as investors from "../investors.js";
import type * as invites from "../invites.js";
import type * as kit from "../kit.js";
import type * as kitAi from "../kitAi.js";
import type * as lib_checks from "../lib/checks.js";
import type * as lib_links from "../lib/links.js";
import type * as lib_match from "../lib/match.js";
import type * as lib_prompt from "../lib/prompt.js";
import type * as limits from "../limits.js";
import type * as notify from "../notify.js";
import type * as pipeline from "../pipeline.js";
import type * as pmf from "../pmf.js";
import type * as room from "../room.js";
import type * as suggest from "../suggest.js";
import type * as track from "../track.js";
import type * as watch from "../watch.js";
import type * as write from "../write.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  crons: typeof crons;
  feedback: typeof feedback;
  followups: typeof followups;
  founders: typeof founders;
  http: typeof http;
  investors: typeof investors;
  invites: typeof invites;
  kit: typeof kit;
  kitAi: typeof kitAi;
  "lib/checks": typeof lib_checks;
  "lib/links": typeof lib_links;
  "lib/match": typeof lib_match;
  "lib/prompt": typeof lib_prompt;
  limits: typeof limits;
  notify: typeof notify;
  pipeline: typeof pipeline;
  pmf: typeof pmf;
  room: typeof room;
  suggest: typeof suggest;
  track: typeof track;
  watch: typeof watch;
  write: typeof write;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
};
