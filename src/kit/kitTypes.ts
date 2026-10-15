import type { Brand } from "./brand";

// Shapes and names shared by the kit screens.

export type Slide = { key: string; headline: string; points: string[]; metrics: { value: string; label: string }[] };
export type Teaser = { summary: string; highlights: string[] };
export type KitView = {
  company: string; founder: string; stage: string; ask: string; website: string | null;
  brand: Brand; slides: Slide[]; teaser: Teaser | null;
  facts: { problem?: string; product?: string; forWho?: string; customers?: string; market?: string; businessModel?: string; competitors?: string; useOfFunds?: string; team: { name: string; role: string; line: string }[] };
};

export const SLIDE_TITLES: Record<string, string> = { cover: "Cover", problem: "Problem", solution: "Solution", traction: "Traction", market: "Market", model: "Business model", competition: "Competition", team: "Team", ask: "The ask" };
