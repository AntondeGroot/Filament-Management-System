/* Collects the app into dist/, which is what Capacitor packages into the APK.
 *
 * There is no bundler here and there is not going to be one — the app is one
 * HTML file with no dependencies, and that is a feature. So "build" is a copy.
 *
 * It exists at all because `cap sync` copies webDir wholesale, and webDir
 * cannot be the repo root: it would sweep android/, node_modules/ and .git into
 * the APK. Keeping the sources at the root is what lets GitHub Pages serve this
 * repo directly, exactly as the README describes.
 */

import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "dist");

/* The deployable site, and nothing else. Listed rather than globbed so that a
   stray file in the repo root can never end up shipped inside the APK. */
const FILES = [
  "index.html",
  "sw.js",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "icon-512-maskable.png",
];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (const name of FILES) {
  await cp(join(ROOT, name), join(OUT, name));
}

console.log(`built dist/ — ${FILES.length} files`);