import { describe, expect, it } from "vitest";
import { BATCH_SIZE, batchFrom, looseBatch } from "../src/batch.js";

/* A loose zone is a list of ids; what makes two rolls stack is their color,
   whether they are low, and whether they are still sealed. */
const shelf = spools => [spools.map(s => s.id), id => spools.find(s => s.id === id)];
const roll = (id, swatchId, extra = {}) => ({ id, swatchId, low: false, sealed: false, ...extra });

describe("batchFrom()", () => {
  it("takes at most a batch and leaves the list it was handed alone", () => {
    const loose = ["a", "b", "c", "d", "e", "f"];

    expect(batchFrom(loose)).toEqual(["a", "b", "c", "d"]);
    expect(BATCH_SIZE).toBe(4);

    /* The reason this is worth a test at all. slice and splice differ by one
       letter and read almost the same, but splice(0, 4) would take those four
       out of the array it was given — and the array it is given is
       state.spares. Arming a batch would quietly empty Unassigned, on a call
       made during render, with no user action to blame it on. */
    expect(loose).toEqual(["a", "b", "c", "d", "e", "f"]);

    /* Fewer than a batch is not an error, it is a smaller batch. */
    expect(batchFrom(["a", "b"])).toEqual(["a", "b"]);
    expect(batchFrom([])).toEqual([]);
  });
});

describe("looseBatch()", () => {
  it("counts rolls rather than the piles they are drawn as", () => {
    /* Three identical blacks draw as one card with a 3 on it, then a red, then
       two blues — three cards, six rolls. The batch is the first four rolls,
       which means the whole black pile and the red.

       Counting cards instead would take three blacks, a red, and two blues:
       six rolls into a dryer with four slots, two of them silently left
       behind. */
    const [ids, spoolOf] = shelf([
      roll("k1", "black"), roll("k2", "black"), roll("k3", "black"),
      roll("r1", "red"),
      roll("b1", "blue"), roll("b2", "blue"),
    ]);

    expect(looseBatch(ids, spoolOf)).toEqual(["k1", "k2", "k3", "r1"]);
  });

  it("splits a pile when the batch runs out partway through it", () => {
    /* Five identical blacks are one card. Four of them go, one stays — the
       card is outlined whole because a card is the smallest thing that can be
       outlined, but only four rolls move. */
    const [ids, spoolOf] = shelf(["k1", "k2", "k3", "k4", "k5"].map(id => roll(id, "black")));

    expect(looseBatch(ids, spoolOf)).toEqual(["k1", "k2", "k3", "k4"]);
  });

  it("keeps rolls apart when only their condition differs", () => {
    /* Same color, but a sealed roll and a low one are not interchangeable and
       do not stack. Order follows first appearance, so the sealed pair leads
       and the batch reaches into the open ones. */
    const [ids, spoolOf] = shelf([
      roll("s1", "black", { sealed: true }),
      roll("o1", "black"),
      roll("s2", "black", { sealed: true }),
      roll("o2", "black"),
      roll("l1", "black", { low: true }),
    ]);

    expect(looseBatch(ids, spoolOf)).toEqual(["s1", "s2", "o1", "o2"]);
  });
});
