import { describe, expect, it } from "vitest";
import { openApp, setBench } from "./harness.js";

/* A real library, read off the phone, in the order it is stored — which is the
 * order the swatches were added and deliberately not the order they should come
 * back in. Sorting this list has to do actual work.
 *
 * Brand and material are left off: neither takes any part in the ordering, and
 * putting them here would suggest otherwise. */
const AS_STORED = [
  "#FF0000", "#C9293C", "#F27900", "#DD7135", "#FF6200", "#FFFF62", "#FFEA88",
  "#625141", "#C09F83", "#D9C7B2", "#9DCC4C", "#44C27E", "#0013F5", "#1F8BB4",
  "#397792", "#899FAB", "#7B909B", "#000000", "#D8B5C5", "#F1DEDF", "#FFDEC6",
  "#A695F5", "#925EB6", "#6600A3", "#FFFFFF",
];

/* The order agreed by eye against the actual spools. Named, because a wall of
   hex is unreviewable and the names are what make a regression obvious. */
const EXPECTED = [
  /* — the rainbow: hue bands, vivid before muted inside each — */
  "#FF0000",   /* Red */
  "#C9293C",   /* Lava Red */
  "#FF6200",   /* Orange */
  "#DD7135",   /* Orange Transparent */
  "#F27900",   /* Basic Orange */
  "#FFFF62",   /* Sulfur Yellow */
  "#FFEA88",   /* Yellow */
  "#9DCC4C",   /* Yellow Green */
  "#44C27E",   /* Forest Green */
  "#1F8BB4",   /* Sapphire Blue */
  "#397792",   /* Stone Blue */
  "#0013F5",   /* Blue */
  "#6600A3",   /* Electric Indigo */
  "#925EB6",   /* Purple */
  "#A695F5",   /* Lavender Purple */

  /* — the earths: warm colours with the chroma drained, pinks then tans — */
  "#D8B5C5",   /* Sakura Pink */
  "#F1DEDF",   /* Candy — less chroma than Fossil Grey below, and still a pink */
  "#FFDEC6",   /* Nude */
  "#D9C7B2",   /* Peanut */
  "#C09F83",   /* Wood Brown */
  "#625141",   /* Army Brown */

  /* — the neutrals: white down to black — */
  "#FFFFFF",   /* White */
  "#899FAB",   /* Fossil Grey */
  "#7B909B",   /* Silver */
  "#000000",   /* Black */
];

describe("sortedSwatches()", () => {
  it("lays out a real library as rainbow, then earths, then neutrals", async () => {
    const { run, close } = await openApp();
    setBench(run, {
      swatches: AS_STORED.map((hex, i) => ({ id: "sw-" + i, brand: "B", material: "PLA", colorName: hex, hex })),
    });

    expect(run("sortedSwatches().map(w => w.hex)")).toEqual(EXPECTED);

    close();
  });
});