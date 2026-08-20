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

export const listHTML = (list, stock, esc, filter) => (list.length
  ? list.map(sw => rowHTML(sw, stock(sw), esc)).join("")
  : `<p class="empty-note" style="padding:14px">${filter
      ? "Nothing here in " + esc(filter) + " yet."
      : "No colors yet. They appear as you add spools, or add one by hand."}</p>`);

export const metaText = (list, stock) =>
  (list.length ? `${list.length} colors · ${list.filter(stock).length} in stock` : "");

/* Retired colors keep their own drawer under the library, shut by default.
   They are not gone — you can still add a roll of one, which is the whole
   reason they are not simply deleted — but they have stopped being part of
   what you own, and a library you scan for what to print next should not have
   them in it. Deliberately unfiltered: the drawer is opened on purpose, and a
   filter that quietly emptied it would just look broken. */
export const retiredHTML = (list, open, stock, esc) => (!list.length ? "" : `
  <button class="log-head" data-swretired aria-expanded="${open}"
      style="width:100%;background:none;border:0;font:inherit;color:inherit;padding:16px 0 7px;cursor:pointer">
    <span class="eyebrow">Retired</span><span class="hair"></span>
    <span class="meta">${list.length} ${list.length === 1 ? "color" : "colors"} ${open ? "▾" : "▸"}</span>
  </button>
  ${open ? `<div class="swatches">${list.map(sw => rowHTML(sw, stock(sw), esc)).join("")}</div>` : ""}`);

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

/* A note is one thing you know about a filament that the app cannot work out:
 * a speed it will not tolerate, the fact that it makes the best support
 * interface you own, the fact that it snapped twice in the AMS.
 *
 * The kind is an icon, not a colour. A swatch row is painted in the filament's
 * own colour, so there is no ground to put a gold star or a red exclamation on
 * — on Sulfur Yellow the gold star simply is not there. Shape survives what
 * colour cannot, so the icons take the row's ink and are told apart by their
 * outline, the way the printed mark and the magnifier already are. */
export const NOTE_KINDS = [
  { key: "", label: "None" },
  { key: "star", label: "Favourite" },
  { key: "warn", label: "Careful" },
  { key: "spec", label: "Setting" },
];

const NOTE_PATH = {
  star: `<path d="m12 3 2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 16.4l-5.25 2.75 1-5.85L3.5 9.15l5.9-.85Z"/>`,
  warn: `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>`,
  spec: `<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>`,
};

/* Filled for the star — a hollow one at 14px reads as a scribble — and hollow
   for the other two, which are outlines by nature. */
export const noteIcon = (kind, size = 14) => (NOTE_PATH[kind]
  ? `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="flex:none"
      fill="${kind === "star" ? "currentColor" : "none"}" stroke="currentColor"
      stroke-width="${kind === "star" ? 1.6 : 2}" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true">${NOTE_PATH[kind]}</svg>`
  : "");

/* Nothing stored for a note that says nothing, so an emptied note leaves no
   trace behind on the swatch. */
export const noteFrom = (kind, text) => (kind || text ? { kind, text } : null);
export const hasNote = sw => !!(sw.note && (sw.note.kind || sw.note.text));

/* Why you would not buy it again. Kept on the record rather than deleted with
   the swatch: the point of writing it down is the next time you are in a shop
   looking at that exact spool. */
export const retiredIcon = (size = 14) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}"
    style="flex:none" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"
    ><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></svg>`;

const whyLine = (sw, esc) => (sw.retired && sw.retiredWhy
  ? `<span class="sw-note">${retiredIcon()}<span>${esc(sw.retiredWhy)}</span></span>`
  : "");

/* What a roll of this color carries with it out onto the bench: the note's
   mark, and the ban if the color has been retired. The words stay on the
   swatch — out here they are a reminder at the moment you are holding the
   roll, and the roll itself is told nothing and stores nothing. */
const mark = (icon, title, esc) => `<span class="notemark" title="${esc(title)}">${icon}</span>`;

export const rollMarks = (w, esc) =>
  (hasNote(w) ? mark(noteIcon(w.note.kind, 13), w.note.text, esc) : "")
  + (w.retired ? mark(retiredIcon(13), w.retiredWhy ? "Retired — " + w.retiredWhy : "Retired", esc) : "");

/* Its own line under the row, because a note is a sentence and the row above it
   is a set of readings. One line only — it is a reminder here, and the whole of
   it is in the sheet. */
const noteLine = (sw, esc) => (hasNote(sw)
  ? `<span class="sw-note">${noteIcon(sw.note.kind)}<span>${esc(sw.note.text)}</span></span>`
  : "");

export const rowHTML = (sw, stock, esc) =>
  `<button class="swatch${sw.transparent ? " clear" : ""}" data-swatch="${sw.id}" style="${paint(sw, esc)}">
    <span class="sw-name">${esc(sw.colorName)}</span>
    <span class="sw-meta">${esc(sw.brand)} · ${esc(sw.material)}</span>
    <span class="sw-hex">${esc(sw.hex.toUpperCase())}</span>
    <span class="sw-own${stock ? "" : " none"}">${stock ? stock + (stock === 1 ? " roll" : " rolls") : "none left"}</span>
    ${printedMark(sw)}${noteLine(sw, esc)}${whyLine(sw, esc)}${findButton(sw, stock)}
  </button>`;

/* The swatch's own sheet. Markup only — every control is wired by swatchForm()
   in index.html, which owns the camera, the wheel and the saving. What it needs
   from the page comes in through `p`: the escape, the material list, and the
   brands already in the library. */
export const formHTML = (sw, p) => `<h2>${p.existing ? "Swatch" : "Add a swatch"}</h2>
  <div class="field"><label>Brand</label>
    <input type="text" id="w-brand" value="${p.esc(sw.brand)}" list="brands" placeholder="Bambu Lab, Prusament…">
    <datalist id="brands">${p.brands.map(b => `<option>${p.esc(b)}</option>`).join("")}</datalist>
  </div>
  <div class="two">
    <div class="field"><label>Material</label>
      <select id="w-mat">${p.materials.map(m => `<option${m === sw.material ? " selected" : ""}>${m}</option>`).join("")}</select>
    </div>
    <div class="field"><label>Color name</label>
      <input type="text" id="w-name" value="${p.esc(sw.colorName)}" placeholder="Galaxy Silver">
    </div>
  </div>
  <div class="field"><label>Hex</label>
    <div class="swatchrow">
      <button class="iconbtn" id="w-cam" title="Read the color off a photo" aria-label="Read the color off a photo">${p.cameraIcon}</button>
      <button type="button" class="chipbtn" id="w-hex" style="background:${p.esc(sw.hex)}"
        title="Pick a color" aria-label="Pick a color"></button>
      <input type="text" id="w-code" class="mono" value="${p.esc(sw.hex.toUpperCase())}" maxlength="7" spellcheck="false" placeholder="#RRGGBB">
      <input type="file" id="w-shot" accept="image/*" capture="environment" hidden>
    </div>
    <p class="empty-note" style="padding:5px 2px 0">Don't know the hex? Read it off the spool with the camera,
      then tap the chip to fine-tune it on the wheel.</p>
    <label class="never" style="display:inline-flex;margin-top:9px">
      <input type="checkbox" id="w-clear"${sw.transparent ? " checked" : ""}> transparent
    </label>
    <label class="never" style="display:inline-flex;margin:9px 0 0 16px" title="You have printed a chip in this color"><input type="checkbox" id="w-print"${sw.printed ? " checked" : ""}> printed swatch</label>
    <div class="linkrow">
      <a class="btn ghost tiny linkbtn" id="w-lib" href="#" target="_blank" rel="noopener noreferrer">Find it in the library ↗</a>
      <a class="btn ghost tiny linkbtn" id="w-find" href="https://filamentcolors.xyz/colormatch/" target="_blank" rel="noopener noreferrer">Match by hex ↗</a>
    </div>
  </div>
  <div class="field"><label>Note</label>
    <div class="chips" style="margin-bottom:7px">${NOTE_KINDS.map(k =>
      `<button type="button" class="btn tiny${(sw.note && sw.note.kind || "") === k.key ? " on" : ""}" data-nkind="${k.key}"
        >${noteIcon(k.key, 12)}${k.label}</button>`).join("")}</div>
    <input type="text" id="w-note" value="${p.esc(sw.note ? sw.note.text : "")}"
      placeholder="50 mm/s or it strings badly">
  </div>
  <div class="field"><label>Retired</label>
    <label class="never" style="display:inline-flex"><input type="checkbox" id="w-retired"${
      sw.retired ? " checked" : ""}> wouldn't buy this again</label>
    <input type="text" id="w-why" style="margin-top:7px" value="${p.esc(sw.retiredWhy || "")}"
      placeholder="Why not — colour was off, stringed badly…">
  </div>
  ${p.existing ? `<p class="empty-note" style="margin:0 0 4px">${p.n ? `${p.n} ${p.n === 1 ? "roll" : "rolls"} in stock right now.` : "Nothing in stock in this color."}</p>` : ""}
  <div class="sheet-foot">
    ${p.existing ? `<button class="btn danger" id="w-del">Delete</button>` : ""}
    <span class="spacer"></span>
    ${p.existing ? `<button class="btn ghost" id="w-spool">Add a spool of this</button>` : ""}
    <button class="btn primary" id="w-save">${p.existing ? "Save" : "Add swatch"}</button>
  </div>`;
