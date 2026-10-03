/* One color on a logged file, as it is drawn on the project card.
 *
 * A use is a slot the slicer listed — a filament, its weight, the swatch you
 * matched it to — plus, optionally, a note on what that color is for in this
 * print: "pawns and field", "box". A label, not a story.
 *
 * `esc` arrives as an argument for the same reason it does in swatches.js:
 * index.html defines it and cannot import anything. */

/* Long enough for "light blue — pawns and field", short enough to stay one
   line under the color on a phone. */
export const NOTE_MAX = 60;

/* Writes what was typed onto the use. Blank is no note at all: an empty string
   left behind would still read as a note to anything that asks. */
export function writeNote(use, typed) {
  const text = typed.trim().slice(0, NOTE_MAX);
  if (text) use.note = text;
  else delete use.note;
}

/* What a color row says: the swatch it landed on, or what the slicer called a
   filament nothing matched. `none` is for the row that has neither yet — a
   statement while you read the list, an invitation while you edit it. */
const label = (use, sw, none) => {
  if (sw) return `${sw.brand} ${sw.colorName} · ${sw.material}`;
  return use.type ? `Unmatched — ${use.type} ${use.color}` : none;
};

/* The row itself, given the swatch the use is matched to, if any. `slot` is
   where the use sits in the file, not where it is drawn: the picker and the ×
   have to act on the filament you pointed at.

   Reading, the note is a quiet line under the color's name. Editing, it is a
   field under the picker, saved as you type. */
export function rowHTML({ projectId, use, slot, sw, editable }, esc) {
  const ref = `${projectId}|${slot}`;
  const dot = `<span class="dot" style="background:${esc(sw ? sw.hex : use.color || "#B9B7B0")}"></span>`;
  const grams = `<span class="g">${use.grams ? use.grams + " g" : ""}</span>`;
  if (!editable) {
    const note = use.note ? `<span class="un">${esc(use.note)}</span>` : "";
    const name = esc(label(use, sw, "No color picked"));
    return `<div class="fil read">${dot}<span class="nm">${name}${note}</span>${grams}</div>`;
  }
  return `<div class="fil">${dot}
      <button class="pick" data-pickuse="${ref}">${esc(label(use, sw, "Pick a color"))}</button>
      ${grams}
      <button class="btn ghost tiny" data-usedel="${ref}" aria-label="Remove color">×</button>
    </div>
    <input type="text" class="fil-note" data-usenote="${ref}" maxlength="${NOTE_MAX}"
           value="${esc(use.note || "")}" placeholder="Which parts used this color?"
           aria-label="Note for this color">`;
}
