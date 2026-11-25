/* Renders the repo's link preview, docs/social-preview.png, from
 * docs/social-preview.html. Called by generate-readme-images.mjs right after
 * the screenshots, which the template shows, so it always shows the app as it
 * is. Exactly 1280×640 at one device pixel per CSS pixel, which is the size
 * GitHub asks for. It is uploaded by hand: Settings → General → Social preview.
 */

import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const wait = ms => new Promise(done => setTimeout(done, ms));

/* cdp: the DevTools client the screenshots were taken with. */
export async function renderSocialPreview(cdp, root) {
  await cdp.send("Emulation.setDeviceMetricsOverride",
    { width: 1280, height: 640, deviceScaleFactor: 1, mobile: false });
  await cdp.send("Page.navigate", { url: "file://" + join(root, "docs/social-preview.html") });
  /* The title is set in a web font; captured before it arrives, it comes out
     in the fallback. The template asks for display=block, and this waits. */
  await cdp.send("Runtime.evaluate", { awaitPromise: true, expression: `(async () => {
    while (document.readyState !== "complete") await new Promise(r => setTimeout(r, 50));
    await document.fonts.ready;
    await Promise.all([...document.images].map(img => img.decode()));
  })()` });
  /* Decoded is not yet painted: Chrome rasterises the scaled-down, rotated
     phones in more than one pass, and an early capture catches the rough one.
     Two captures in a row that agree mean it has settled. */
  let data = "", previous;
  for (let tries = 0; tries < 20 && data !== previous; tries++) {
    previous = data;
    await wait(250);
    ({ data } = await cdp.send("Page.captureScreenshot", { format: "png" }));
  }
  if (data !== previous) throw new Error("The social preview never stopped changing between captures");
  await writeFile(join(root, "docs/social-preview.png"), Buffer.from(data, "base64"));
  console.log(`  ${"social-preview.png".padEnd(18)} the repo's link preview, in docs/`);
}
