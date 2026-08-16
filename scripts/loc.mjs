/* Counting lines of code, where a comment is not one.
 *
 * The rule this serves is a hard ceiling per file, so the count has to be one
 * nobody argues with: a line counts when something other than whitespace
 * survives having its comments removed. Blank lines and comment-only lines are
 * free, which is deliberate — the limit should push toward smaller units, never
 * toward explaining less.
 *
 * Strings containing // are not parsed for real. Doing that properly means
 * tokenising JavaScript, and the failure mode here is harmless: the text before
 * the quote still counts the line, so a line is never lost. */

const stripHtmlComments = source => source.replace(/<!--[\s\S]*?-->/g, "");

export function countLoc(source, { html = false } = {}) {
  const text = html ? stripHtmlComments(source) : source;
  let inBlock = false;
  let count = 0;

  for (const raw of text.split("\n")) {
    let line = raw;

    if (inBlock) {
      const end = line.indexOf("*/");
      if (end === -1) continue;
      inBlock = false;
      line = line.slice(end + 2);
    }

    /* Opening a block comment can happen more than once on a line, and the last
       one may never close. */
    for (;;) {
      const start = line.indexOf("/*");
      if (start === -1) break;
      const end = line.indexOf("*/", start + 2);
      if (end === -1) { line = line.slice(0, start); inBlock = true; break; }
      line = line.slice(0, start) + line.slice(end + 2);
    }

    const slash = line.indexOf("//");
    if (slash > -1) line = line.slice(0, slash);

    if (line.trim()) count += 1;
  }

  return count;
}
