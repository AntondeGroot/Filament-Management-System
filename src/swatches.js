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

/* The filter bar over the library. Counts are contextual, so PETG cannot
   promise three when CF is on and there is one. */
export function chipsHTML({ fams, fills, fam, fill, count, esc }) {
  const chip = (key, label, n, attr, on) =>
    `<button class="btn tiny${on ? " on" : ""}" ${attr}="${esc(key)}"${n ? "" : " disabled"}>${esc(label)}<span class="n">${n}</span></button>`;
  const famChips = fams.length > 1
    ? [chip("all", "All", count("all", fill), "data-swfilter", fam === "all"),
       ...fams.map(f => chip(f, f, count(f, fill), "data-swfilter", fam === f))].join("")
    : "";
  const fillChips = fills.length
    ? `<span class="sep"></span>` +
      [chip("all", "Any fill", count(fam, "all"), "data-swfill", fill === "all"),
       ...fills.map(x => chip(x, x, count(fam, x), "data-swfill", fill === x))].join("")
    : "";
  return famChips + fillChips;
}

/* Which roll to reach for.
 *
 * A count tells you that you own three. What you want to know, standing at the
 * printer about to start something, is which of the three to pick up — so the
 * rolls are listed in the order you would want them:
 *
 *   loaded first, because it is already on a machine and costs nothing to
 *   start; then the one running low, because finishing a nearly empty roll is
 *   how you stop accumulating them; and the sealed bag last, since opening one
 *   is a decision that can wait until there is nothing else.
 *
 * Each roll arrives already reduced to those four facts — the page is the only
 * thing that can say where a spool sits, and this is the only thing that has an
 * opinion about what that is worth. */
const rank = r => (r.machine ? 0 : 10) + (r.sealed ? 2 : r.low ? 0 : 1);

/* Rolls that would print the same line are one line with a count. Four sealed
   reds on a shelf is one fact about that shelf, and listing it four times pads
   the answer out with nothing — the bench stacks identical rolls onto a single
   card for the same reason. Two shelves stay two lines, because which shelf is
   the whole of what you came to find out. */
const same = r => [r.place, r.machine, r.low, r.sealed].join("|");

export function inReachOrder(rolls) {
  const stacks = new Map();
  for (const r of rolls) {
    const key = same(r);
    if (stacks.has(key)) stacks.get(key).n += 1;
    else stacks.set(key, { ...r, n: 1 });
  }
  /* Insertion order in, stable sort out: equal ranks stay in bench order. */
  return [...stacks.values()].sort((a, b) => rank(a) - rank(b));
}

/* A place on the left, a word about the roll on the right. The state that
   earned a roll its position is the state worth naming, so a full roll sitting
   in a box says nothing at all. */
export const whereHTML = (rolls, esc) => inReachOrder(rolls).map(r =>
  `<div class="wrow"><span class="wp">${esc(r.place)}${r.n > 1 ? ` ×${r.n}` : ""}</span>
    <span class="wt">${r.sealed ? "sealed" : r.low ? "running low" : r.machine ? "loaded" : ""}</span></div>`).join("");

/* The way in to "where are they?". A circle set apart from the row's own
   readings, on the same color the row is painted in — it belongs to the swatch
   rather than to the list, and it is the one thing on the row you can press
   that does not open the swatch itself. Only where there is something to find:
   a color you have run out of has no whereabouts. */
const MAGNIFIER = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>`;

const findButton = (sw, stock) => (stock
  ? `<span class="sw-find" data-swfind="${sw.id}" role="button"
      title="Where are these rolls?" aria-label="Where are these rolls?">${MAGNIFIER}</span>`
  /* Nothing at all where there is nothing to find: a color you have run out of
     has no whereabouts. The row reserves the column either way, so the counts
     still land on one edge down the whole list. */
  : "");

/* Its own sheet, not a section of the swatch's. Looking for a roll and editing
   what a color is are two different errands, and the second one is a form. */
export const whereSheetHTML = (sw, rolls, esc) => `<h2>${esc(sw.colorName)}</h2>
  <p class="ask" style="margin-bottom:6px">${rolls.length} ${rolls.length === 1 ? "roll" : "rolls"} of
    ${esc(sw.brand)} ${esc(sw.material)}, nearest to hand first.</p>
  ${whereHTML(rolls, esc)}
  <div class="sheet-foot"><span class="spacer"></span><button class="btn primary" data-close>Close</button></div>`;

export const rowHTML = (sw, stock, esc) =>
  `<button class="swatch${sw.transparent ? " clear" : ""}" data-swatch="${sw.id}" style="${paint(sw, esc)}">
    <span class="sw-name">${esc(sw.colorName)}</span>
    <span class="sw-meta">${esc(sw.brand)} · ${esc(sw.material)}</span>
    <span class="sw-hex">${esc(sw.hex.toUpperCase())}</span>
    <span class="sw-own${stock ? "" : " none"}">${stock ? stock + (stock === 1 ? " roll" : " rolls") : "none left"}</span>
    ${printedMark(sw)}${findButton(sw, stock)}
  </button>`;
