import { describe, expect, it } from "vitest";
import { computeServiceFeeCents, toCents } from "./pricing.js";

describe("pricing", () => {
  it("converts euros to cents without floating point errors", () => {
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(0.1 + 0.2)).toBe(30);
  });

  it("charges 5 % of the price plus 0,70 € as service fee", () => {
    expect(computeServiceFeeCents(10000)).toBe(570);
    expect(computeServiceFeeCents(95000)).toBe(4820);
  });

  it("rounds the percentage to the nearest cent", () => {
    // 5 % de 6,49 € = 0,3245 € → 32 centimes, + 70 centimes.
    expect(computeServiceFeeCents(649)).toBe(102);
  });
});
