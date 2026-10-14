import { describe, expect, test } from "vitest";
import { chequeRange } from "./investor";

describe("cheque ranges", () => {
  test("dollar-converted numbers become clean ranges", () => {
    expect(chequeRange(8.8, 35.2)).toBe("₹9–35L");
    expect(chequeRange(88, 264)).toBe("₹90L–2.5 Cr");
    expect(chequeRange(100, 300)).toBe("₹1–3 Cr");
    expect(chequeRange(null, 35)).toBe("up to ₹35L");
    expect(chequeRange(25, 25)).toBe("₹25L");
    expect(chequeRange(null, null)).toBeNull();
  });
});
