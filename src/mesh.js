/* Reading what a sliced file has to say, and drawing a picture of one.
 *
 * Bambu Studio writes a sliced .3mf as a plain zip. Two entries matter:
 * Metadata/slice_info.config lists every filament with its type, colour and
 * grams, and Metadata/plate_*.png is the plate preview. No library needed — the
 * central directory is easy to walk and DecompressionStream does deflate.
 *
 * Nothing here knows about projects or swatches. It answers what is in a file;
 * deciding which colour in the library that corresponds to, and what record to
 * write, belongs to the app. */

async function inflateRaw(bytes) {
  const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

/* Walks a zip's central directory and returns the entries `want` accepts. */
export async function unzip(buf, want) {
  const u8 = new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--)
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("not a zip");
  const n = dv.getUint16(eocd + 10, true);
  let off = dv.getUint32(eocd + 16, true);
  const out = {};
  for (let i = 0; i < n; i++) {
    if (dv.getUint32(off, true) !== 0x02014b50) break;
    const method = dv.getUint16(off + 10, true), csize = dv.getUint32(off + 20, true);
    const nl = dv.getUint16(off + 28, true), el = dv.getUint16(off + 30, true), cl = dv.getUint16(off + 32, true);
    const lho = dv.getUint32(off + 42, true);
    const name = new TextDecoder().decode(u8.subarray(off + 46, off + 46 + nl));
    off += 46 + nl + el + cl;
    if (!want(name) || csize === 0xFFFFFFFF) continue;
    const lnl = dv.getUint16(lho + 26, true), lel = dv.getUint16(lho + 28, true);
    const start = lho + 30 + lnl + lel;
    const data = u8.subarray(start, start + csize);
    out[name] = method === 0 ? data : await inflateRaw(data);
  }
  return out;
}

const attr = (tag, k) => (tag.match(new RegExp(k + '="([^"]*)"')) || [])[1] || "";

/* Shrink the plate preview so a long project list still fits in storage. */
export function shrink(bytes) {
  return new Promise(res => {
    const url = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      const k = Math.min(1, 124 / Math.max(img.width, img.height));
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const g = c.getContext("2d");
      g.fillStyle = "#F2F1ED"; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => { URL.revokeObjectURL(url); res(null); };
    img.src = url;
  });
}

/* The filaments a slicer says it used, how long it thinks the print takes, and
   the plate preview. Null when the file is not a sliced .3mf — a plain model
   exported from CAD is still a perfectly good project, its colours just go in
   by hand. */
export async function read3mfInfo(file) {
  try {
    const files = await unzip(await file.arrayBuffer(),
      n => /slice_info\.config$/.test(n) || /plate_\d+(_small)?\.png$/.test(n));
    const infoKey = Object.keys(files).find(k => /slice_info\.config$/.test(k));
    const out = { filaments: [], seconds: 0, thumb: null };
    if (infoKey) {
      const xml = new TextDecoder().decode(files[infoKey]);
      out.filaments = [...xml.matchAll(/<filament\b[^>]*>/g)].map(m => ({
        type: attr(m[0], "type") || "?",
        color: (attr(m[0], "color") || "#999999").slice(0, 7),
        grams: Math.round((+attr(m[0], "used_g") || 0) * 10) / 10,
      }));
      out.seconds = [...xml.matchAll(/key="prediction" value="(\d+)"/g)].reduce((n, m) => n + +m[1], 0);
    }
    const thumbKey = Object.keys(files).find(k => /_small\.png$/.test(k))
      || Object.keys(files).find(k => /\.png$/.test(k));
    if (thumbKey) out.thumb = await shrink(files[thumbKey]);
    return out;
  } catch (e) {
    return null;
  }
}

/* An STL carries no colour and no thumbnail, so one is drawn from the geometry. */
export async function readStlThumb(file) {
  try {
    const tris = readStlTriangles(await file.arrayBuffer());
    return tris ? renderMesh(tris) : null;
  } catch (e) {
    return null;   /* unreadable geometry is fine — the name and colours still work */
  }
}

export function readStlTriangles(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf);
  const head = new TextDecoder().decode(u8.subarray(0, 80)).trim().toLowerCase();
  if (buf.byteLength > 84) {
    const n = dv.getUint32(80, true);
    if (84 + n * 50 === buf.byteLength && n) {
      const step = Math.max(1, Math.ceil(n / 40000));   /* sample big meshes; it's a thumbnail */
      const out = [];
      for (let i = 0; i < n; i += step) {
        const o = 84 + i * 50 + 12;
        out.push([
          [dv.getFloat32(o, true), dv.getFloat32(o + 4, true), dv.getFloat32(o + 8, true)],
          [dv.getFloat32(o + 12, true), dv.getFloat32(o + 16, true), dv.getFloat32(o + 20, true)],
          [dv.getFloat32(o + 24, true), dv.getFloat32(o + 28, true), dv.getFloat32(o + 32, true)],
        ]);
      }
      return out;
    }
  }
  if (!head.startsWith("solid")) return null;
  const text = new TextDecoder().decode(u8.subarray(0, Math.min(u8.length, 24e6)));
  const nums = [...text.matchAll(/vertex\s+(-?[\d.eE+-]+)\s+(-?[\d.eE+-]+)\s+(-?[\d.eE+-]+)/g)];
  const out = [];
  for (let i = 0; i + 2 < nums.length; i += 3)
    out.push([0, 1, 2].map(k => nums[i + k].slice(1, 4).map(Number)));
  return out.length ? out : null;
}

/* Flat-shaded isometric render, painter's algorithm. No library, no WebGL. */
export function renderMesh(tris) {
  const S = 132, c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");   /* transparent outside the model, so it can be tinted later */

  const rx = -Math.PI / 3, rz = Math.PI / 6;
  const cx = Math.cos(rx), sx = Math.sin(rx), cz = Math.cos(rz), sz = Math.sin(rz);
  const proj = ([x, y, z]) => {
    const X = x * cz - y * sz, Y = x * sz + y * cz;
    return [X, Y * cx - z * sx, Y * sx + z * cx];
  };
  const pts = tris.map(t => t.map(proj));
  let m = [Infinity, Infinity, -Infinity, -Infinity];
  pts.forEach(t => t.forEach(([x, y]) => {
    m[0] = Math.min(m[0], x); m[1] = Math.min(m[1], y);
    m[2] = Math.max(m[2], x); m[3] = Math.max(m[3], y);
  }));
  const k = 0.86 * S / Math.max(m[2] - m[0], m[3] - m[1], 1e-6);
  const ox = (S - (m[2] - m[0]) * k) / 2 - m[0] * k;
  const oy = (S - (m[3] - m[1]) * k) / 2 - m[1] * k;

  const order = pts.map((t, i) => [i, (t[0][2] + t[1][2] + t[2][2]) / 3]).sort((a, b) => a[1] - b[1]);
  for (const [i] of order) {
    const t = pts[i];
    const ux = t[1][0] - t[0][0], uy = t[1][1] - t[0][1], uz = t[1][2] - t[0][2];
    const vx = t[2][0] - t[0][0], vy = t[2][1] - t[0][1], vz = t[2][2] - t[0][2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    const lit = Math.max(0, (0.35 * nx + 0.25 * ny + 0.9 * nz) / len);
    /* Light greys only: this gets multiplied by the filament colour at display time. */
    const v = Math.round(96 + lit * 159);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.beginPath();
    g.moveTo(t[0][0] * k + ox, S - (t[0][1] * k + oy));
    g.lineTo(t[1][0] * k + ox, S - (t[1][1] * k + oy));
    g.lineTo(t[2][0] * k + ox, S - (t[2][1] * k + oy));
    g.closePath(); g.fill();
  }
  return c.toDataURL("image/png");
}
