import { execFileSync } from "node:child_process";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const inRoot = name => new URL(`../${name}`, import.meta.url);
const inDist = name => new URL(`../dist/${name}`, import.meta.url);

const STRAY = "_stray-test-file.txt";

/* The real thing `npm run build` runs, in a subprocess, because the script does
   its work on import and there is nothing to call. */
const build = () => execFileSync(process.execPath, ["scripts/build.mjs"], { cwd: ROOT });

afterEach(async () => {
  await rm(inRoot(STRAY), { force: true });
});

describe("scripts/build.mjs", () => {
  it("copies only the files the site needs", async () => {
    /* Something unrelated sitting in the repo root. This is why the script
       lists its files instead of globbing: the root also holds android/,
       node_modules/ and whatever is lying around mid-edit, and all of it would
       otherwise be packaged into the APK. */
    await writeFile(inRoot(STRAY), "not for the APK");

    /* And a leftover from an earlier build, which the rm/mkdir at the top of
       the script is there to clear. A file dropped from the list has to
       disappear from dist/, not linger and keep shipping. */
    await mkdir(inDist(""), { recursive: true });
    await writeFile(inDist("stale.js"), "from a previous build");

    build();

    expect((await readdir(inDist(""))).sort()).toEqual([
      "icon-192.png",
      "icon-512-maskable.png",
      "icon-512.png",
      "index.html",
      "manifest.webmanifest",
      "sw.js",
    ]);
  });
});