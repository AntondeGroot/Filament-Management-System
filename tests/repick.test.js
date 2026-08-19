import { describe, expect, it } from "vitest";
import { replaceAll } from "../src/intake.js";

/* A file logged a while ago: renamed, filed, annotated, with one color the
   slicer matched and one pointed at a swatch by hand. */
const LOGGED = {
  id: "pj-1", name: "widget.3mf", title: "Widget mk1", note: "NAS/3dprint", folder: "fd-1",
  added: "2026-08-01", kind: "3mf", thumb: "the-old-picture", seconds: 5400,
  uses: [{ swatchId: "sw-red", grams: 14 },
         { swatchId: "sw-by-hand", grams: 2, type: "PLA", color: "#123456" }],
};

/* The same model re-sliced a little heavier, in a color the library knows —
   and the second filament is gone from the file entirely. */
const REPICKED = {
  id: "pj-2", name: "widget.3mf", title: "widget", note: "", folder: null,
  added: "2026-09-01", kind: "3mf", thumb: "the-new-picture", seconds: 9000,
  uses: [{ swatchId: "sw-blue", grams: 31 }],
};

describe("replacing a file that is already logged", () => {
  it("updates the picture and the numbers, and touches no color you picked", () => {
    const projects = [structuredClone(LOGGED)];

    replaceAll(projects, [REPICKED]);

    expect(projects).toHaveLength(1);
    expect(projects[0]).toEqual({
      ...LOGGED,
      thumb: "the-new-picture",
      seconds: 9000,
      /* The one date you can hold against the file on disk. */
      added: "2026-09-01",
      uses: [
        /* The slicer says blue. It is not the app's business to say so: the
           weight is a fact about the file, the color is a decision about it. */
        { swatchId: "sw-red", grams: 31 },
        /* And a slot the new slice no longer lists is left where it is rather
           than taking a hand-made choice down with it. */
        { swatchId: "sw-by-hand", grams: 2, type: "PLA", color: "#123456" },
      ],
    });
  });
});
