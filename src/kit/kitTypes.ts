import type { Brand } from "./brand";

// Shapes and names shared by the kit screens.

export type Slide = { key: string; headline: string; points: string[]; metrics: { value: string; label: string }[]; sample?: boolean }; // sample: content we laid in until she gives us hers
export type Teaser = { summary: string; highlights: string[] };
export type KitView = {
  company: string; founder: string; founderLine?: string; stage: string; ask: string; website: string | null;
  brand: Brand; slides: Slide[]; teaser: Teaser | null;
  theme?: Theme; // her deck's look
  rivals?: { name: string; logo: string | null; where: string }[]; // from her market research, for the competition slide
  facts: { problem?: string; product?: string; forWho?: string; customers?: string; market?: string; businessModel?: string; competitors?: string; useOfFunds?: string; team: { name: string; role: string; line: string }[] };
};

export const SLIDE_TITLES: Record<string, string> = { cover: "Cover", problem: "Problem", solution: "Solution", traction: "Traction", market: "Market", model: "Business model", competition: "Competition", team: "Team", ask: "The ask" };

export type Theme = "classic" | "minimal" | "bold" | "editorial";
export const THEMES: { key: Theme; name: string; line: string }[] = [
  { key: "classic", name: "Classic", line: "Your colour, clear cards" },
  { key: "minimal", name: "Minimal", line: "White, black type, quiet" },
  { key: "bold", name: "Bold", line: "Dark, big numbers" },
  { key: "editorial", name: "Editorial", line: "Side panel, magazine feel" },
];
