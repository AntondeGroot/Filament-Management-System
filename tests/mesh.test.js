import { describe, expect, it } from "vitest";
import { readStlTriangles } from "../src/mesh.js";

/* No app, no document, no JSDOM — the module is imported and called. That is
   the whole point of moving it out. */

/* A binary STL is an 80-byte header, a uint32 count, then 50 bytes per
   triangle: a normal nobody trusts, three vertices, and two spare bytes. */
function binaryStl(triangles, header = "") {
  const buf = new ArrayBuffer(84 + triangles.length * 50);
  const dv = new DataView(buf);
  new Uint8Array(buf).set(new TextEncoder().encode(header.slice(0, 80)), 0);
  dv.setUint32(80, triangles.length, true);
  triangles.forEach((triangle, i) => {
    let at = 84 + i * 50 + 12;   /* past the normal, which is not read */
    triangle.flat().forEach(v => { dv.setFloat32(at, v, true); at += 4; });
  });
  return buf;
}

const TETRAHEDRON = [
  [[0, 0, 0], [10, 0, 0], [0, 10, 0]],
  [[0, 0, 0], [10, 0, 0], [0, 0, 10]],
  [[0, 0, 0], [0, 10, 0], [0, 0, 10]],
  [[10, 0, 0], [0, 10, 0], [0, 0, 10]],
];

describe("readStlTriangles()", () => {
  it("reads a binary STL even when its header claims to be an ASCII one", () => {
    /* The oldest trap in the format. An ASCII STL opens with the word "solid",
       and plenty of exporters write that same word into the 80 bytes of a
       binary file's header — so anything that sniffs the text picks the wrong
       parser and comes back with nothing.

       The size is the honest signal: a binary file is exactly 84 + 50n bytes,
       and nothing else is. That check has to be made before the header is
       believed, which is the behaviour pinned here. */
    const triangles = readStlTriangles(binaryStl(TETRAHEDRON, "solid exported by something helpful"));

    expect(triangles).toHaveLength(4);
    expect(triangles[0]).toEqual([[0, 0, 0], [10, 0, 0], [0, 10, 0]]);
  });

  it("parses an ASCII STL, however the exporter chose to write the numbers", () => {
    /* Every real exporter writes coordinates differently: plain decimals,
       negatives, and scientific notation from anything that computed them in
       floating point. All three appear below, because a parser that quietly
       drops a facet leaves a hole in the thumbnail and nothing says why. */
    const ascii = [
      "solid part",
      "facet normal 0 0 1",
      "  outer loop",
      "    vertex 0 0 0",
      "    vertex 1e1 0 0",
      "    vertex 0 -10 0",
      "  endloop",
      "endfacet",
      "facet normal 0 0 1",
      "  outer loop",
      "    vertex 0 0 0",
      "    vertex 0 0 2.5E1",
      "    vertex -1.5 0 0",
      "  endloop",
      "endfacet",
      "endsolid part",
    ].join("\n");

    const triangles = readStlTriangles(new TextEncoder().encode(ascii).buffer);

    expect(triangles).toEqual([
      [[0, 0, 0], [10, 0, 0], [0, -10, 0]],
      [[0, 0, 0], [0, 0, 25], [-1.5, 0, 0]],
    ]);
  });
});
