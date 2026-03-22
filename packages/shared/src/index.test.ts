import { describe, expect, it } from "vitest";
import { getHealth } from "./index.js";

describe("getHealth", () => {
  it("returns a healthy envelope", () => {
    const result = getHealth("api");
    expect(result.ok).toBe(true);
    expect(result.service).toBe("api");
    expect(result.timestamp).toBeTruthy();
  });
});
