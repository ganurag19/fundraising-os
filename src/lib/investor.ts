import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";

type Row = NonNullable<FunctionReturnType<typeof api.founders.me>>["rows"][number];

const lakh = (l: number) => (l >= 100 ? `₹${+(l / 100).toFixed(1)} Cr` : `₹${l}L`);
/** "₹50L–2 Cr", "up to ₹35L", or null when we don't know. */
export const cheque = (r: Row) => (r.chequeMinLakh != null && r.chequeMaxLakh != null ? `${lakh(r.chequeMinLakh)}–${lakh(r.chequeMaxLakh).slice(1)}` : r.chequeMaxLakh != null ? `up to ${lakh(r.chequeMaxLakh)}` : null);

/** What's coming, to make signing in worth it. Shown as "SOON": tapping does nothing but say so. */
/** What's coming, written for her startup, so each card reads like something already being prepared for her. */
export function soonFor(company = "your startup", sector = "your sector", stage = "your round") {
  const whose = /s$/i.test(company) ? `${company}'` : `${company}'s`; // "Kiln Labs'", "Verdera's"
  const space = sector.replace(" & Energy", "").replace("Consumer brands", "consumer").replace("Media & adtech", "media");
  return [
    { icon: "⚔", title: `Track ${whose} top competitors`, line: "Who else is raising in your space, and who backed them." },
    { icon: "▲", title: `Funding trends in ${space}`, line: "Who's writing cheques now, and at what size." },
    { icon: "▤", title: `Pitch deck review for ${company}`, line: "Slide-by-slide notes on what investors will question." },
    { icon: "?", title: `Questions investors will ask ${company}`, line: "Are you ready? Answers drafted from your profile." },
    { icon: "❝", title: `FAQ for your ${stage.toLowerCase()} raise`, line: "Round, terms, use of funds: written once, reused everywhere." },
    { icon: "★", title: "Mentors, advisors and warm intros", line: "From founders who've already raised their first cheque.", vip: true },
  ];
}

