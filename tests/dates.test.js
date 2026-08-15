import { afterEach, describe, expect, it } from "vitest";
import { openApp } from "./harness.js";

const REAL_TZ = process.env.TZ;

afterEach(() => {
  if (REAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = REAL_TZ;
});

describe("iso()", () => {
  it("reads the day off the device clock, not UTC", async () => {
    /* Both instants below are the same UTC day — 15 August. A formatter built
       on toISOString() would answer "2026-08-15" for each of them, and did
       until it was fixed. The device disagrees in both directions. */

    /* UTC+14: it is already the 16th here while UTC is still on the 15th. */
    process.env.TZ = "Pacific/Kiritimati";
    const ahead = await openApp({ now: "2026-08-15T23:30:00Z" });
    expect(ahead.run("today()")).toBe("2026-08-16");
    ahead.close();

    /* UTC-11: it is still the 14th here after UTC has rolled over to the 15th.
       This is the case that made "Dried today" record yesterday. */
    process.env.TZ = "Pacific/Niue";
    const behind = await openApp({ now: "2026-08-15T00:30:00Z" });
    expect(behind.run("today()")).toBe("2026-08-14");
    behind.close();
  });
});