import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { KitView } from "./kitTypes";

const ORDER = ["cover", "problem", "solution", "traction", "market", "model", "competition", "team", "ask"];

/** Her kit as the deck and teaser need it: null until the deck is written. */
export function useKitView(token: string): KitView | null | undefined {
  const me = useQuery(api.founders.me, { token });
  const kit = useQuery(api.kit.mine, { token });
  return useMemo(() => {
    if (me === undefined || kit === undefined) return undefined;
    if (!me || !kit || !kit.deck) return null;
    // The first build writes 4 slides; the rest show as locked until full access writes them.
    const slides = ORDER.map((key) => kit.deck?.find((x) => x.key === key) ?? { key, headline: "", points: [], metrics: [] });
    return { company: me.company, founder: me.name, stage: me.stage, ask: me.ask, website: me.website, brand: kit.brand, slides, teaser: kit.teaser, facts: kit.facts };
  }, [me, kit]);
}
