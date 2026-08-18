import { describe, expect, it } from "vitest";
import { openApp } from "./harness.js";

describe("picking files", () => {
  it("filters by name after the pick rather than in the picker", async () => {
    const { run, close } = await openApp();

    /* No accept list, on purpose. Android turns one into MIME types for the
       picker's intent, and a provider that can name .stl but not .3mf greys out
       every .3mf in the folder — the file is visible and untappable, with
       nothing on screen to say why. Re-adding this attribute would look like a
       tidy-up and would break picking on a phone. */
    expect(run(`document.getElementById("fileinput").hasAttribute("accept")`)).toBe(false);

    /* Which puts the whole burden on the check after the pick: something that
       is neither is turned away here, and says so. */
    await run(`intake([new File(["hello"], "notes.txt")])`);

    expect(run(`state.projects.length`)).toBe(0);
    expect(run(`document.getElementById("toast").textContent`)).toBe("Pick .3mf or .stl files.");

    close();
  });
});
