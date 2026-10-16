import type { KitView, Slide } from "./kitTypes";

// When a slide has no facts from her yet, it shows sample content in the same design, marked "Sample" on the slide,
// so the deck never looks like an empty shell. Every sample number is generic and labelled; she replaces it with hers.

const has = (s: Slide | undefined) => !!s && (!!s.headline || s.points.length > 0 || s.metrics.length > 0);

export function sampleSlide(key: string, k: Pick<KitView, "company" | "facts">): Slide {
  const who = k.facts.forWho || k.facts.customers || "our customers";
  switch (key) {
    case "market": return { key, sample: true, headline: "A ₹40,000 Cr market, growing 18% a year", points: ["Source: an industry report, with its year"], metrics: [{ value: "₹40,000 Cr", label: `Everyone who could buy: ${who}` }, { value: "₹6,000 Cr", label: "Who we can reach in 3 years" }, { value: "₹300 Cr", label: "What we can win by year 5" }] };
    case "model": return { key, sample: true, headline: "Customers pay monthly and pay us back in 6 months", points: ["Monthly subscription per customer", "Setup fee covers onboarding", "Upsell: add-ons after month 3"], metrics: [{ value: "₹4,999", label: "per customer a month" }, { value: "70%", label: "gross margin" }, { value: "6 mo", label: "payback on acquisition" }] };
    case "competition": return { key, sample: true, headline: `Who else is building, and why ${k.company} wins`, points: ["Built for India's smaller teams", "Live in a day, not a quarter", "A fifth of the price"], metrics: [] };
    case "team": return { key, sample: true, headline: `The team building ${k.company}`, points: [], metrics: [] };
    case "ask": return { key, sample: true, headline: "What this round gets us to", points: ["Product and tech: 45%", "Sales and growth: 35%", "Team: 20%", "18 months of runway, to 3x revenue"], metrics: [] };
    case "traction": return { key, sample: true, headline: "Growing every month since launch", points: [], metrics: [{ value: "120", label: "paying customers" }, { value: "₹8L", label: "monthly revenue" }, { value: "22%", label: "month-on-month growth" }] };
    default: return { key, sample: true, headline: `Your ${key} in one line`, points: ["A short, concrete point", "A second one, with a number", "A third, if you need it"], metrics: [] };
  }
}

/** Her slides with samples laid into the empty ones. */
export function withSamples(slides: Slide[], k: Pick<KitView, "company" | "facts">): Slide[] {
  return slides.map((s) => (s.key === "cover" || has(s) ? s : sampleSlide(s.key, k)));
}

/** What she can tell us to turn the sample slides into hers. */
export function missingFacts(k: KitView): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const s = (key: string) => k.slides.find((x) => x.key === key);
  if (!k.facts.market) out.push({ key: "market", label: "Your market size, with a source" });
  if (!k.facts.businessModel) out.push({ key: "model", label: "How you make money: price, margin, payback" });
  if (!k.facts.competitors && !k.rivals?.length) out.push({ key: "competition", label: "Who you compete with, and your edge" });
  if (!k.facts.useOfFunds) out.push({ key: "ask", label: "What the round pays for, and the milestone it reaches" });
  if (!k.facts.team.length) out.push({ key: "team", label: "Your co-founders or key hires, one line each" });
  if (s("traction")?.sample || !s("traction")?.metrics.length) out.push({ key: "traction", label: "Your numbers: customers, revenue, growth" });
  return out;
}
