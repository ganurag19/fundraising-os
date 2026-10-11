import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";

type Row = NonNullable<FunctionReturnType<typeof api.founders.me>>["rows"][number];

const lakh = (l: number) => (l >= 100 ? `₹${+(l / 100).toFixed(1)} Cr` : `₹${l}L`);
/** "₹50L–2 Cr", "up to ₹35L", or null when we don't know. */
export const cheque = (r: Row) => (r.chequeMinLakh != null && r.chequeMaxLakh != null ? `${lakh(r.chequeMinLakh)}–${lakh(r.chequeMaxLakh).slice(1)}` : r.chequeMaxLakh != null ? `up to ${lakh(r.chequeMaxLakh)}` : null);

/** What's coming, to make signing in worth it. Shown as "SOON": tapping does nothing but say so. */
export const SOON = [
  { icon: "◎", title: "Competitor analysis", line: "Who else is raising in your space, and how you stand apart." },
  { icon: "▤", title: "Pitch deck review", line: "Slide-by-slide notes on what investors will question." },
  { icon: "?", title: "Investor Q&A prep", line: "The questions they'll ask, with answers drafted from your profile." },
  { icon: "↻", title: "Follow-ups", line: "A nudge written for you 3 days after you send, then 7 days after that." },
  { icon: "▣", title: "Data room", line: "One link with everything an investor asks for." },
];

