/* A swatch as it is drawn in the library.
 *
 * `esc` arrives as an argument for the same reason it does in setup.js:
 * index.html defines it and cannot import anything. */

import * as Color from "./color.js";

/* The inline half of a swatch's paint job. Opaque ones set a flat background;
   translucent ones hand the stylesheet the true color and a thinned copy, and
   let it do the layering.

   Both take their label color from the raw hex, because both ends of a
   translucent row are the raw hex — the name sits on one, the stock count on
   the other. */
export const paint = (sw, esc) => (sw.transparent
  ? `--solid:${esc(sw.hex)};--tint:${esc(sw.hex)}${Color.CLEAR_HEX};color:${Color.readable(sw.hex)}`
  : `background:${esc(sw.hex)};color:${Color.readable(sw.hex)}`);

/* Whether you have actually printed this color and can hold the result in your
 * hand. A hex is a claim about a filament; a printed chip is the evidence, and
 * which colors you have got round to printing is not something the app can work
 * out for itself.
 *
 * A fan of swatches rather than a tick, because it says what was ticked. It
 * inherits the row's own ink through currentColor, so it reads on a black
 * filament and a white one without being told which it is on. */
const MARK = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M11 17a4 4 0 0 1-8 0V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2Z"/>
  <path d="M16.7 13H19a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H7"/>
  <path d="M7 17h.01"/>
  <path d="m11 8 2.3-2.3a2.4 2.4 0 0 1 3.404.004L18.6 7.6a2.4 2.4 0 0 1 .026 3.434L9.9 19.8"/>
</svg>`;

/* An indicator, not a control: it is ticked in the swatch's own sheet, along
   with everything else that is true about a color. Shown only where there is a
   chip — a faint copy on every unprinted row is noise repeated the whole way
   down, and what you scan this list for is the ones you have. The box stays
   either way, so the columns to its left keep their edge. */
const printedMark = sw => (sw.printed
  ? `<span class="sw-print" title="Printed swatch" aria-label="Printed swatch">${MARK}</span>`
  : `<span class="sw-print"></span>`);

export const rowHTML = (sw, stock, esc) =>
  `<button class="swatch${sw.transparent ? " clear" : ""}" data-swatch="${sw.id}" style="${paint(sw, esc)}">
    <span class="sw-name">${esc(sw.colorName)}</span>
    <span class="sw-meta">${esc(sw.brand)} · ${esc(sw.material)}</span>
    <span class="sw-hex">${esc(sw.hex.toUpperCase())}</span>
    <span class="sw-own${stock ? "" : " none"}">${stock ? stock + (stock === 1 ? " roll" : " rolls") : "none left"}</span>
    ${printedMark(sw)}
  </button>`;
