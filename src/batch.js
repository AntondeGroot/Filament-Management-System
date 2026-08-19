/* Picking up a handful of rolls at once.
 *
 * Four, because that is what a dryer holds, and an AMS, and a box. A shelf
 * holds six and Unassigned holds however many you own, so those are the places
 * where "move what is here" and "move what will fit" stop being the same
 * question — and the answer nobody has to think about is the first four.
 *
 * Which four is deliberately positional rather than clever: the ones at the
 * front of the row, in the order they are drawn. A pile of four identical
 * blacks is four, not one. */

export const BATCH_SIZE = 4;

export const batchFrom = ids => ids.slice(0, BATCH_SIZE);

/* Said on the control itself, so nobody has to count the outlined rolls. */
export const batchLabel = n => (n === 1 ? "Move this roll" : `Move these ${n}`);

/* Identical rolls read as one pile with a count, which is what makes the rows
   legible when you own thirty spools — but a pile of four blacks is still four
   rolls. Everything downstream of this has to agree on that, so the grouping
   lives here beside the rule that consumes it.

   `spoolOf` is passed in rather than reached for: what makes two rolls
   identical is their color, whether they are low, and whether they are still
   sealed, and none of that is this module's business to look up. */
export function stacks(ids, spoolOf) {
  const piles = [], seen = new Map();
  for (const id of ids) {
    const s = spoolOf(id);
    if (!s) continue;
    const key = [s.swatchId, s.low, s.sealed].join("|");
    if (seen.has(key)) seen.get(key).ids.push(id);
    else { const pile = { ids: [id] }; seen.set(key, pile); piles.push(pile); }
  }
  return piles;
}

/* What a loose zone hands over: the first rolls as the row draws them, piles
   flattened first. Four rolls, not four cards — one pile of four is the whole
   batch, and the card standing for it is one card. */
export const looseBatch = (ids, spoolOf) =>
  batchFrom(stacks(ids, spoolOf).flatMap(pile => pile.ids));
