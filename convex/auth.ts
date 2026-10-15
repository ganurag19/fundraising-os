import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

// Google sign-in on the reveal screen (AGENTS.md section 4). LinkedIn and email sign-in are parked.
// Always show Google's account chooser, so a founder with two accounts picks the right one (one account holds one startup).
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({ providers: [Google({ authorization: { params: { prompt: "select_account" } } })] });
