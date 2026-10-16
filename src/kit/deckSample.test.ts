import { describe, expect, test } from "vitest";
import { missingFacts, withSamples } from "./deckSample";
import type { KitView } from "./kitTypes";

// Made-up founder. Slides with her facts stay hers; empty ones get marked sample content, never unmarked.
const facts = { team: [], forWho: "brick kiln owners" } as KitView["facts"];
const slides = ["cover", "problem", "market", "ask"].map((key) => ({ key, headline: key === "problem" ? "Kilns burn coal by guesswork" : "", points: [], metrics: [] }));

describe("deck samples", () => {
  test("only empty slides get sample content, and every sample is marked", () => {
    const out = withSamples(slides, { company: "Kiln Labs", facts });
    expect(out.map((s) => !!s.sample)).toEqual([false, false, true, true]);
    expect(out[1].headline).toBe("Kilns burn coal by guesswork");
    expect(out[2].metrics.length).toBe(3);
  });
  test("lists what she can add to replace the samples", () => {
    const k = { company: "Kiln Labs", founder: "Arjun", stage: "Seed", ask: "₹1–3 Cr", website: null, brand: { primary: "#7B5CFF" }, slides: withSamples(slides, { company: "Kiln Labs", facts }), teaser: null, facts } as KitView;
    expect(missingFacts(k).map((m) => m.key)).toEqual(["market", "model", "competition", "ask", "team", "traction"]);
    expect(missingFacts({ ...k, facts: { ...facts, market: "₹40,000 Cr (CEA 2024)" }, rivals: [{ name: "Made Up Kilns", logo: null, where: "india" }] }).map((m) => m.key)).not.toContain("market");
  });
});
