import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { KitView } from "./kitTypes";
import { withSamples } from "./deckSample";

const ORDER = ["cover", "problem", "solution", "traction", "market", "model", "competition", "team", "ask"];

/** Her kit as the deck and teaser need it: null until the deck is written. */
export function useKitView(token: string): KitView | null | undefined {
  const me = useQuery(api.founders.me, { token });
  const kit = useQuery(api.kit.mine, { token });
  const market = useQuery(api.market.mine, { token });
  return useMemo(() => {
    if (me === undefined || kit === undefined) return undefined;
    if (!me || !kit || !kit.deck) return null;
    // The first build writes 5 slides; team comes from her facts; the rest are templates for her numbers.
    const slides = withSamples(ORDER.map((key) => kit.deck?.find((x) => x.key === key) ?? { key, headline: "", points: [], metrics: [] }), { company: me.company, facts: kit.facts });
    return { company: me.company, founder: me.name, founderLine: me.profile.founderLine || undefined, stage: me.stage, ask: me.ask, website: me.website, brand: kit.brand, theme: kit.theme, slides, teaser: kit.teaser, facts: kit.facts,
      rivals: market?.competitors.map((c) => ({ name: c.name, logo: c.logo ?? null, where: c.where })) };
  }, [me, kit, market]);
}
