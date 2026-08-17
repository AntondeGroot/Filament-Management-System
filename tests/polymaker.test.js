import { describe, expect, it } from "vitest";
import { POLYMAKER_HEX, polymakerMatch } from "../src/polymaker.js";

describe("polymakerMatch()", () => {
  it("prefers an exact name over the many that merely contain it", () => {
    /* The rule only earns its place if the ambiguity is real, so prove that
       first: Polymaker sells a colour called plainly "Yellow" and several more
       whose names end in it. Without the exact pass, the plain one is
       unreachable — containment finds all of them and the match is discarded
       as too vague. */
    const containing = Object.keys(POLYMAKER_HEX)
      .filter(name => name.toLowerCase().replace(/[^a-z0-9]/g, "").includes("yellow"));

    expect(containing.length).toBeGreaterThan(1);
    expect(containing).toContain("Yellow");

    expect(polymakerMatch("Yellow")).toEqual({ name: "Yellow", hex: "#FFE800" });
  });
});
