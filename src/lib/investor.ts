import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";

type Row = NonNullable<FunctionReturnType<typeof api.founders.me>>["rows"][number];

// Cheques often come converted from dollars (₹8.8–35.2L). Show clean, slightly rounded ranges instead.
export function niceLakh(l: number): number {
  if (l < 10) return Math.max(1, Math.round(l));
  if (l < 100) return Math.round(l / 5) * 5;
  if (l < 1000) return Math.round(l / 50) * 50; // half-crore steps
  return Math.round(l / 100) * 100;
}
const amount = (l: number) => (l >= 100 ? `${+(l / 100).toFixed(1)} Cr` : `${l}L`);
/** A cheque range in rupees from lakh: "₹9–35L", "₹90L–2.5 Cr", "₹1–3 Cr", "up to ₹35L". */
export function chequeRange(min: number | null, max: number | null): string | null {
  if (max == null) return null;
  const hi = niceLakh(max);
  if (min == null) return `up to ₹${amount(hi)}`;
  const lo = Math.min(niceLakh(min), hi);
  if (lo === hi) return `₹${amount(hi)}`;
  if (lo >= 100 && hi >= 100) return `₹${+(lo / 100).toFixed(1)}–${amount(hi)}`;
  if (lo < 100 && hi < 100) return `₹${lo}–${hi}L`;
  return `₹${amount(lo)}–${amount(hi)}`;
}
/** Her investor's cheque, or null when we don't know. */
export const cheque = (r: Row) => chequeRange(r.chequeMinLakh, r.chequeMaxLakh);

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

