/* Rewrites the POLYMAKER_HEX table in index.html from Polymaker's own wiki.
 *
 * The table is bundled rather than looked up at runtime, for three reasons that
 * are unlikely to change: the page carries no Access-Control-Allow-Origin
 * header, so a browser cannot read it at all; it is a 51 MB GitBook document,
 * 814 KB even gzipped, which is an absurd download to answer one question; and
 * the app is meant to work in a workshop with no signal. Six kilobytes of
 * colours in the file solves all three.
 *
 * The cost is that the copy goes stale when Polymaker adds a colour, which is
 * what this script is for.
 *
 * Usage:
 *   npm run polymaker
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = "https://wiki.polymaker.com/polymaker-products/more-about-our-products/" +
  "hex-codes-and-transmission-distances";

const html = await fetch(PAGE, { headers: { "user-agent": "Mozilla/5.0" } }).then(r => {
  if (!r.ok) throw new Error(`the wiki answered ${r.status}`);
  return r.text();
});

/* The page renders each colour as a name in a <p> followed by its hex in a
   later cell, so reading the two in document order pairs them up. Brittle by
   nature — it is someone else's markup — which is why the count is checked
   below rather than trusted. */
const tokens = [...html.matchAll(/>([^<>]{1,70})<\/p>|>(#[0-9A-Fa-f]{6})</g)]
  .map(m => (m[1] || m[2] || "").trim())
  .filter(Boolean);

const colours = new Map();
let pending = null;
for (const token of tokens) {
  if (/^#[0-9A-Fa-f]{6}$/.test(token)) {
    if (pending && !colours.has(pending)) colours.set(pending, token.toUpperCase());
    pending = null;
  } else if (/^[A-Za-z0-9][A-Za-z0-9 \-+'/&.()]{1,60}$/.test(token)) {
    pending = token;
  }
}

/* 235 at the time of writing. A collapse to a handful means the markup moved
   and the parse above needs revisiting — better to stop than to quietly write
   a nearly empty table over a working one. */
if (colours.size < 100) {
  throw new Error(`only ${colours.size} colours parsed — the page layout has probably changed`);
}

const entries = [...colours].map(([name, hex]) => `"${name}":"${hex}"`);
const lines = [];
let line = "  ";
for (const entry of entries) {
  if (line.length + entry.length + 2 > 104) { lines.push(line.trimEnd()); line = "  "; }
  line += entry + ", ";
}
lines.push(line.trimEnd().replace(/,$/, ""));

const file = join(ROOT, "index.html");
const before = await readFile(file, "utf8");

/* Track the match rather than comparing the result: an unchanged wiki produces
   byte-identical output, and that is a success, not a failed substitution. */
let replaced = false;
const after = before.replace(
  /(const POLYMAKER_HEX = \{\n)[\s\S]*?(\n\};)/,
  (_, open, close) => { replaced = true; return open + lines.join("\n") + close; },
);
if (!replaced) throw new Error("could not find the POLYMAKER_HEX block in index.html");

await writeFile(file, after);
console.log(after === before
  ? `${colours.size} colours, unchanged since the last run`
  : `wrote ${colours.size} colours into index.html`);