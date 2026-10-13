// Made-up investors and companies for the public landing page only.
// Real investors from seed/ never appear on a public page (AGENTS.md section 2).
import type { BadgeKey } from "../lib/badges";

export type DemoInvestor = {
  name: string; person: string; angel?: boolean; cheque: string; score: number; rating: number; reviews: number;
  days: string; badges: BadgeKey[]; why: string; rat: string[]; risk: string[]; talk: string[];
};

export const DEMO: DemoInvestor[] = [
  { name: "Verdant Arc Capital", person: "Meera Iyer", cheque: "₹50L–2Cr", score: 94, rating: 4.8, reviews: 23, days: "2 days", badges: ["fast", "fav", "lead"],
    why: "Backs AI tools for finance teams at seed, and led a round just like yours in March.",
    rat: ["Their website says: 'AI for finance and compliance teams'", "Led a ₹1.8 Cr seed round like yours in March 2026", "Their cheque (₹50L–2Cr) fits inside your ₹1–3 Cr round"],
    risk: ["Usually wants a co-investor above ₹1.5 Cr", "Asks for monthly numbers, not just yearly"],
    talk: ["Open with your monthly growth; she leads with numbers", "Say why your first customers are your way in"] },
  { name: "Kabir Sethi", person: "Kabir Sethi", angel: true, cheque: "₹10–35L", score: 89, rating: 4.6, reviews: 14, days: "3 days", badges: ["first", "lead", "clear"],
    why: "Leads small rounds in B2B software, and built and sold a payments company.", rat: [], risk: [], talk: [] },
  { name: "Northlight Seed Fund", person: "Arjun Rao", cheque: "₹1–3Cr", score: 86, rating: 4.1, reviews: 9, days: "6 days", badges: ["active"],
    why: "Their 2026 focus is compliance software, and their cheque is your exact range.", rat: [], risk: [], talk: [] },
  { name: "Saffron Peak Angels", person: "Divya Nair", cheque: "₹25L–1.5Cr", score: 84, rating: 4.7, reviews: 21, days: "1 day", badges: ["fav", "fast", "first"],
    why: "An angel network whose members back AI for small businesses.", rat: [], risk: [], talk: [] },
  { name: "Monsoon Ventures", person: "Ishaan Kapoor", cheque: "₹25L–1Cr", score: 82, rating: 4.2, reviews: 5, days: "4 days", badges: ["first"],
    why: "A pre-seed fund that names climate and AI as focus areas.", rat: [], risk: [], talk: [] },
  { name: "Orbit Ridge Partners", person: "Kavya Menon", cheque: "₹1–5Cr", score: 80, rating: 4.4, reviews: 11, days: "2 days", badges: ["fast", "active"],
    why: "Backs deeptech hardware at seed, including two space companies.", rat: [], risk: [], talk: [] },
];

export const TRY: Record<string, number[]> = { AI: [0, 1], Climate: [4, 3], Deeptech: [5, 2] };

export const COMP = [
  { name: "Your startup", you: true, what: "What you're building", who: "Your customer", start: "2025", stage: "Seed", raised: "₹40L", backers: "Angels" },
  { name: "Kharcha AI", what: "AI bookkeeping app for small business owners", who: "Business owners", start: "2023", stage: "Seed", raised: "₹6 Cr", backers: "Harbor Line Fund" },
  { name: "ReconBook", what: "Bank reconciliation for mid-size finance teams", who: "CFO teams", start: "2021", stage: "Series A", raised: "₹42 Cr", backers: "Two global funds" },
  { name: "TaxTara", what: "GST filing app for freelancers", who: "Freelancers", start: "2024", stage: "Pre-seed", raised: "₹1.2 Cr", backers: "An angel network" },
];

export const QUESTIONS: [string, string][] = [
  ["Why now", "Why is now the right time for this?"],
  ["Market", "How big can this get, in India alone?"],
  ["Revenue", "How do you make money, and how much today?"],
  ["Go-to-market", "How do you get your next 100 customers?"],
  ["Profitability", "When do you break even?"],
  ["Competition", "Who else is doing this, and why will you win?"],
  ["Team", "Why are you the right people to build it?"],
  ["Use of funds", "What will you do with this money, by when?"],
];

export const PAINS: [string, string, string][] = [
  ["I don't know a single investor.", "Start with the ones who fit.", "Indian funds, angels and networks matched to your sector, stage and round size, each with the reason why."],
  ["I don't know what to write.", "Your first email is already written.", "It opens on a deal that investor actually did. Yours to edit."],
  ["I keep forgetting to follow up.", "We write the follow-ups.", "On day 3 and a week later, stopped the moment they reply."],
];
