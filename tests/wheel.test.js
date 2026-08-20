/* @vitest-environment jsdom
 *
 * The only test file that does not boot index.html. The picker is a whole
 * screen of its own — it builds its own element, owns its own listeners and
 * asks the bench for nothing — so it can be imported and opened directly, and
 * a document from the environment is cheaper than a document from a page.
 * Everything else here still needs the real app booted; see harness.js. */
import { afterEach, describe, expect, it } from "vitest";
import * as Wheel from "../src/wheel.js";

afterEach(() => { document.querySelectorAll(".cwfull").forEach(el => el.remove()); });

/* The picker paints with hex and the DOM reports rgb(), so the expectations are
   written the way a stylesheet reads them back. */
const screen = () => document.querySelector(".cwfull");

describe("the color picker", () => {
  it("puts the picked color on the field and leaves the controls alone", () => {
    /* A dark slate. The point of the screen is that this fills it: a printed
       swatch held against the glass is compared on a field of the color, not
       against a chip in a white card, where a small patch reads as whatever
       surrounds it is not. */
    Wheel.open("#26303A", () => {});

    expect(screen().style.background).toBe("rgb(38, 48, 58)");

    /* Brightness to the top. Same hue, same saturation, and the field follows
       straight away — this is the control you are watching the color through. */
    const slider = document.getElementById("cw-val");
    slider.value = "100";
    slider.dispatchEvent(new Event("input"));

    expect(screen().style.background).toBe("rgb(167, 211, 255)");

    /* And that is the only thing it painted. The bands keep the app's own panel
       and ink whatever the field is doing: chrome that re-inks itself to stay
       legible turns the screen inside out under your thumb every time you cross
       from a dark color to a light one, which is worse than the contrast it
       was buying. */
    expect(screen().style.color).toBe("");
    expect(document.getElementById("cw-use").getAttribute("style")).toBe(null);
    expect(document.getElementById("cw-cancel").getAttribute("style")).toBe(null);
    expect(slider.getAttribute("style")).toBe(null);
  });
});
