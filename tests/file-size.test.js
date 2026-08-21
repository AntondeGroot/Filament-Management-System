import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { countLoc } from "../scripts/loc.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/* A hard ceiling, not a guideline. Comments and blank lines are free, so the
   only way to come in under it is to do less in one file. */
const LIMIT = 200;

/* index.html is still the entire app, and cannot meet the limit until it is
 * split into modules. It is pinned here at what it measured the day the rule
 * came in, so it can only ever shrink: every extraction lowers this number and
 * nothing is allowed to raise it.
 *
 * TODO: delete this entry — and this comment — once the split is done. */
const SPLIT_PENDING = { "index.html": 2337 };

/* Everything generated, vendored, or not ours. */
const SKIP_DIRS = new Set(["node_modules", "dist", "android", "assets", ".git", ".idea", "coverage", "www"]);
const SOURCE = /\.(m?js|ts|html)$/;

function sourceFiles(dir = ROOT, found = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, found);
    else if (SOURCE.test(entry)) found.push(relative(ROOT, full));
  }
  return found;
}

describe("file size", () => {
  it("keeps every source file within its line limit", () => {
    /* Walked rather than listed: a ceiling you can escape by adding a file is
       not a ceiling. */
    const oversized = sourceFiles()
      .map(file => ({
        file,
        loc: countLoc(readFileSync(join(ROOT, file), "utf8"), { html: file.endsWith(".html") }),
        limit: SPLIT_PENDING[file] ?? LIMIT,
      }))
      .filter(({ loc, limit }) => loc > limit)
      .map(({ file, loc, limit }) => `${file}: ${loc} lines, limit ${limit}`);

    expect(oversized).toEqual([]);
  });
});
