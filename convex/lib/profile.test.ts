import { describe, expect, test } from "vitest";
import { investorProfile } from "./match";

// Made-up investor. The profile only counts what the record holds.
describe("investor profile", () => {
  test("sector and round mix come from recorded deals, newest deals first, labels readable", () => {
    const p = investorProfile({
      sectors: ["climate", "tech_general"], stages: ["seed"], thesis: "Backs climate founders early.", portfolio: ["Made Up Kilns", "Made Up Grid"],
      recent: [{ company: "Made Up Kilns", year: 2024, round: "seed", sector: "climate" }, { company: "Made Up Grid", year: 2026, round: "seed", sector: "climate" }, { company: "Made Up Apps", year: 2025, round: "pre_seed", sector: "tech_general" }],
    }, (r) => r.replace("_", "-"));
    expect(p.sectorMix).toEqual([{ label: "Climate & Energy", n: 2 }, { label: "Tech", n: 1 }]);
    expect(p.deals.map((d) => d.company)).toEqual(["Made Up Grid", "Made Up Apps", "Made Up Kilns"]);
    expect([p.focus, p.stages, p.portfolioCount]).toEqual([["Climate & Energy", "Tech"], ["Seed"], 2]);
  });
});
