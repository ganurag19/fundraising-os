import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

// Google sign-in on the reveal screen (AGENTS.md section 4). LinkedIn and email sign-in are parked.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({ providers: [Google] });
