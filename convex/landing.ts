import { query } from "./_generated/server";
import { v } from "convex/values";
import { orderTeam } from "./lib/match";

// The landing page's "who you'll pitch" strip (17 Oct): real partners at funds on our list, with the photo and role
// from each fund's own team page. Public business information only; never from LinkedIn.

export const faces = query({
  args: {},
  returns: v.array(v.object({ name: v.string(), role: v.string(), photo: v.string(), fund: v.string(), logo: v.union(v.string(), v.null()), kind: v.string() })),
  handler: async (ctx) => {
    const out: { name: string; role: string; photo: string; fund: string; logo: string | null; kind: string; score: number }[] = [];
    for await (const inv of ctx.db.query("investors")) {
      if (inv.retired || !inv.team?.length || inv.kind === "angel") continue;
      const t = orderTeam(inv.team.filter((x) => x.photo), inv.person)[0];
      if (!t?.photo) continue;
      const senior = /partner|founder|principal|director|ceo/i.test(t.role) ? 2 : 0;
      out.push({ name: t.name, role: t.role, photo: t.photo, fund: inv.displayName, logo: inv.logo ?? null, kind: inv.kind, score: senior + (inv.recent.length > 2 ? 1 : 0) + (inv.kind === "vc" ? 1 : 0) });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 18).map(({ score: _s, ...x }) => x);
  },
});
