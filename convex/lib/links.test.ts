import { describe, expect, test } from "vitest";
import { domainOf, normaliseLinkedin, normaliseUrl } from "./links";

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
