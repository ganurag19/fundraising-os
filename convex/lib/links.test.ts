import { describe, expect, test } from "vitest";
import { cleanCity, cleanWebsite, domainOf, normaliseLinkedin, normaliseUrl, roundLabel, sharesHerDomain } from "./links";
import { withSignature } from "./checks";

describe("links", () => {
  test("cleans a website and refuses non-public addresses", () => {
    expect(normaliseUrl("verdera.ai/")).toBe("https://verdera.ai");
    expect(normaliseUrl("http://www.Kilnlabs.in/about/")).toBe("https://www.kilnlabs.in/about");
    expect(normaliseUrl("localhost:3000")).toBeNull();
    expect(normaliseUrl("http://10.0.0.1")).toBeNull();
    expect(normaliseUrl("not a site")).toBeNull();
  });
  test("accepts only LinkedIn profile or company pages", () => {
    expect(normaliseLinkedin("in.linkedin.com/in/asha-made-up/")).toBe("https://www.linkedin.com/in/asha-made-up");
    expect(normaliseLinkedin("linkedin.com/feed")).toBeNull();
    expect(normaliseLinkedin("example.com/in/asha")).toBeNull();
  });
  test("compares an email domain with a website", () => {
    expect(domainOf("asha@verdera.ai")).toBe(domainOf("https://www.verdera.ai"));
  });
});

// Made-up funds and founders.
describe("what she sees, cleaned", () => {
  test("a website field never becomes a link with an email in it", () => {
    expect(cleanWebsite("madeupfund.in; rajiv@madeupfund.in")).toBe("https://madeupfund.in");
    expect(cleanWebsite("rajiv@madeupfund.in")).toBeNull();
    expect(cleanWebsite("https://www.madeupfund.vc/team")).toBe("https://www.madeupfund.vc/team");
    expect(cleanWebsite(undefined)).toBeNull();
  });
  test("city names are tidy and single", () => {
    expect(cleanCity("New delhi")).toBe("New Delhi");
    expect(cleanCity("New Delhi")).toBe("New Delhi");
    expect(cleanCity("Mumbai and Washington DC")).toBe("Mumbai");
    expect(cleanCity("bangalore")).toBe("Bengaluru");
    expect(cleanCity("Pune / Mumbai")).toBe("Pune");
    expect(cleanCity("")).toBeNull();
  });
  test("round names read as words", () => {
    expect([roundLabel("pre_seed"), roundLabel("pre_series_a"), roundLabel("series_b_plus"), roundLabel("bridge_round")]).toEqual(["pre-seed", "pre-Series A", "Series B+", "bridge round"]);
  });
  test("an investor sharing her company's domain is a conflict; free email domains never are", () => {
    expect(sharesHerDomain("https://kilnlabs.example", { website: "https://ventures.kilnlabs.example" })).toBe(true);
    expect(sharesHerDomain("kilnlabs.example", { email: "partner@kilnlabs.example" })).toBe(true);
    expect(sharesHerDomain("kilnlabs.example", { website: "https://otherfund.example", email: "a@otherfund.example" })).toBe(false);
    expect(sharesHerDomain("gmail.com", { email: "angel@gmail.com" })).toBe(false);
    expect(sharesHerDomain(undefined, { email: "a@kilnlabs.example" })).toBe(false);
  });
  test("an email without her signature gets it; one with it is left alone", () => {
    const f = { name: "Arjun Rao", company: "Kiln Labs", website: "kilnlabs.example" };
    expect(withSignature("Hi Meera,\n\nCould I send the deck?", f)).toBe("Hi Meera,\n\nCould I send the deck?\n\nArjun Rao\nFounder, Kiln Labs\nkilnlabs.example");
    const signed = "Hi,\n\nThanks.\n\nArjun Rao\nFounder, Kiln Labs";
    expect(withSignature(signed, f)).toBe(signed);
  });
});
