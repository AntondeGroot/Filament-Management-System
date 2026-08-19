import { describe, expect, it } from "vitest";
import { openApp, setBench, stubMedia } from "./harness.js";

const ONE_FILE = {
  projects: [{ id: "pj-1", kind: "3mf", name: "keychain.3mf", title: "keychain", note: "",
               folder: null, added: "2026-08-01", thumb: null, seconds: 0, uses: [] }],
};

/* What the sheet on screen is asking, and whether the file survived it. */
const asking = run => run(`({
  sheet: document.querySelector(".sheet h2")?.textContent ?? null,
  files: state.projects.length,
})`);

describe("removing a file", () => {
  it("asks first, and keeps the file unless the answer is Remove", async () => {
    const { run, close } = await openApp();
    stubMedia(run);
    setBench(run, ONE_FILE);
    run(`render();
         document.querySelector("[data-projedit]").click();
         document.querySelector("[data-projmenu]").click();
         document.getElementById("pm-del").click();`);

    expect(asking(run)).toEqual({ sheet: "Remove file?", files: 1 });

    /* Cancel is not just an escape: it puts the sheet you were working in back,
       so changing your mind about deleting does not also lose the rename. */
    run(`document.getElementById("pd-no").click()`);

    expect(asking(run)).toEqual({ sheet: "keychain", files: 1 });

    run(`document.getElementById("pm-del").click();
         document.getElementById("pd-yes").click();`);

    expect(asking(run)).toEqual({ sheet: null, files: 0 });

    close();
  });
});
