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

describe("team order", () => {
  test("the contact on our record first, then founders and partners, then the rest", async () => {
    const { orderTeam } = await import("./match");
    const t = [{ name: "Made Up Analyst", role: "Analyst" }, { name: "Made Up Partner", role: "Partner" }, { name: "Made Up Founder", role: "Founder & General Partner" }];
    expect(orderTeam(t).map((x) => x.role)).toEqual(["Founder & General Partner", "Partner", "Analyst"]);
    expect(orderTeam(t, "Made Up Analyst")[0].name).toBe("Made Up Analyst");
  });
});
