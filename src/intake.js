/* Picking a file you already have.
 *
 * The same .3mf comes back through the picker all the time: a model gets
 * re-sliced in a different color, or at a different layer height, and out comes
 * a file with the same name and a new preview. Logging that as a second project
 * leaves two rows that look identical and disagree about the print time.
 *
 * So a re-pick is a question, and this is the half of the answer that is only
 * arithmetic: which record the new one lands on, and what survives when it
 * does. The asking is the app's job — nothing here draws anything. */

/* The record a re-picked file would replace. Filed anywhere: a file moved into
   a folder is still the same file, and matching on name alone is what makes
   the question the same question wherever it was put. */
export const alreadyLogged = (rec, projects) => projects.find(p => p.name === rec.name) || null;

/* The new file laid over the old record.
 *
 * Re-picking is a display job. The model changed a little, or the preview did,
 * or the slice is simply newer — so the picture, the print time and the weights
 * come from the file, and everything you decided stays: the name you typed, the
 * folder, the note.
 *
 * The date moves to the day of the pick. It is the one thing here you can hold
 * against the file on disk: a record dated after the last time you sliced is a
 * record of what you sliced, and one dated before it is a picture of something
 * you have since changed.
 *
 * Colors you picked are decisions, not facts about the file, so they are never
 * written over. A slot the new file brings that you never had takes the swatch
 * the slicer matched; a slot you have that the new file no longer lists is left
 * alone rather than dropped. Losing a color you assigned by hand because a
 * re-slice renumbered its filaments is exactly the surprise this avoids.
 * Slot for slot, in the order the slicer lists them. */
function replaceWith(old, rec) {
  const uses = Array.from({ length: Math.max(old.uses.length, rec.uses.length) }, (_, i) => {
    const was = old.uses[i], now = rec.uses[i];
    if (!now) return was;
    return { ...now, swatchId: (was && was.swatchId) || now.swatchId };
  });
  return { ...old, kind: rec.kind, thumb: rec.thumb, seconds: rec.seconds, added: rec.added, uses };
}

/* Both answers to the question, applied to the log.
 *
 * Newest first, the way the picker hands them over. Replacing writes over the
 * record in place rather than swapping in a new object, so anything holding on
 * to the old one — a card mid-drag, a sheet left open — is looking at the new
 * file rather than at something quietly detached from the log. */
export const logAll = (projects, recs) => recs.forEach(rec => projects.unshift(rec));

export const replaceAll = (projects, recs) => recs.forEach(rec => {
  const old = alreadyLogged(rec, projects);
  if (old) Object.assign(old, replaceWith(old, rec));
});
