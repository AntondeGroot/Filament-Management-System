/* Colour, as arithmetic. Nothing here reads the bench or touches the page —
   it converts, compares and reduces, which is why every one of these can be
   checked against a known value rather than against a screenshot. */

export const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) || 0);

export const readable = hex => {
  const [r, g, b] = rgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.56 ? "#16181D" : "#F2F1ED";
};

/* How much of a translucent colour survives where the row thins out. */
export const CLEAR_ALPHA = 0.7;
export const CLEAR_HEX = Math.round(CLEAR_ALPHA * 255).toString(16);

/* Ordering colours is a perceptual problem, so it is done in a perceptual
   space. OKLCH costs about fifteen lines and fixes two things HSL gets wrong
   for a shelf of filament: its lightness calls #F5C518 and #3E7BD1 equally
   bright, which no eye agrees with, and its hue crowds every yellow into twenty
   degrees while letting the greens sprawl over sixty. */
export const srgbToLinear = u => (u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4));

export function oklch(hex) {
  const [r8, g8, b8] = rgb(hex);
  const r = srgbToLinear(r8 / 255), g = srgbToLinear(g8 / 255), b = srgbToLinear(b8 / 255);
  const cl = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const cm = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const cs = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * cl + 0.7936177850 * cm - 0.0040720468 * cs;
  const a = 1.9779984951 * cl - 2.4285922050 * cm + 0.4505937099 * cs;
  const bb = 0.0259040371 * cl + 0.7827717662 * cm - 0.8086757660 * cs;
  let h = (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C: Math.hypot(a, bb), h };
}
/* Rainbow first, then the neutrals as their own band from white down to black.
 *
 * HUE_START is where the circle gets cut, and a circle has to be cut somewhere.
 * 350° puts the join between magenta and crimson so every red stays together at
 * the front. Sorting raw hue cuts at 0° instead, which sends a warm red to one
 * end of the shelf and a cool one to the other — they differ by a couple of
 * degrees and end up as far apart as it is possible to be.
 *
 * Within a band the order is vivid to muted, so a family reads as a run from
 * the pure colour down through its greyed and pastel versions. Lightness only
 * breaks ties: ordering a band by lightness alone buried a pure orange behind a
 * pale peach and a brown that happened to share its hue. */
export const HUE_START = 350, HUE_BAND = 20, NEUTRAL_C = 0.04;

/* Brown is not a hue. It is a warm colour with most of the chroma taken out,
 * which is why a chroma threshold alone scatters it: #C09F83 keeps just enough
 * to sort among the oranges while #D9C7B2 and #625141 fall through to the
 * greys — three shades of the same thing in three different places.
 *
 * So warmth decides, not colourfulness. Below EARTH_C a colour that still leans
 * orange is an earth tone; one that leans blue, or leans nowhere, is a grey.
 * #899FAB and #625141 have almost identical chroma and belong in different
 * places, and their hue is the only thing that says so.
 *
 * The floor matters as much as the ceiling. Hue is a direction, and a colour
 * with no chroma is not pointing anywhere — pure white computes to hue 90,
 * squarely in the warm range, and would file itself under brown. Below
 * EARTH_C[0] the hue is 8-bit rounding noise and the colour is simply grey.
 *
 * The arc runs from 330°, so it takes in the washed-out pinks as well as the
 * tans. A pale pink is the same phenomenon as a brown — a warm colour with the
 * chroma drained — and #F1DEDF has less chroma than #899FAB while still
 * obviously being a pink and not a grey. That asymmetry is real: blues and
 * greens desaturate into greys, warm colours desaturate into pinks and tans and
 * keep their name. */
export const EARTH_C = [0.015, 0.09], EARTH_HUE = [330, 110], EARTH_BAND = 40;

export const inArc = (h, [from, to]) => (from <= to ? h >= from && h <= to : h >= from || h <= to);

/* 0 rainbow, 1 earth, 2 neutral — the three runs the shelf reads in. */
export const colourTier = t =>
  t.C >= EARTH_C[0] && t.C < EARTH_C[1] && inArc(t.h, EARTH_HUE) ? 1
    : t.C < NEUTRAL_C ? 2
    : 0;

/* ---------------- hex ⇄ hue, saturation, value ----------------
   The wheel is polar and the app stores hex, so every interaction crosses this
   pair. Value is kept separate from the disc: hue and saturation are where you
   are on the wheel, brightness is how far the light is turned up. */
export function hexToHsv(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return { h, s: max ? d / max : 0, v: max };
}

export function hsvToHex(h, s, v) {
  const f = n => {
    const k = (n + h / 60) % 6;
    return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))));
  };
  const pair = x => x.toString(16).padStart(2, "0");
  return ("#" + pair(f(5)) + pair(f(3)) + pair(f(1))).toUpperCase();
}

/* Shifts a colour along the warm–cool axis — the correction you would apply if
 * the light were bluer or oranger than the camera took it for. Positive warms,
 * negative cools.
 *
 * Green is deliberately left alone. An illuminant shift is overwhelmingly a
 * red/blue trade; moving green as well stops being a white balance and starts
 * being a tint, which is how a reading ends up further from the spool than it
 * started. */
export function warmShift(hex, amount) {
  if (!hex || !amount) return hex;
  const k = amount / 250;
  const channel = i => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const pair = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return ("#" + pair(channel(0) * (1 + k)) + pair(channel(1)) + pair(channel(2) * (1 - k))).toUpperCase();
}

export function bodyHex(data) {
  const ranked = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;   /* transparent — not part of the picture */
    const r = data[i], g = data[i + 1], b = data[i + 2];
    ranked.push([0.2126 * r + 0.7152 * g + 0.0722 * b, r, g, b]);
  }
  if (!ranked.length) return null;
  ranked.sort((a, b) => a[0] - b[0]);

  const lo = Math.floor(ranked.length * 0.25);
  const hi = Math.max(lo + 1, Math.ceil(ranked.length * 0.75));
  let r = 0, g = 0, b = 0;
  for (let i = lo; i < hi; i++) { r += ranked[i][1]; g += ranked[i][2]; b += ranked[i][3]; }

  const n = hi - lo;
  const pair = v => Math.round(v / n).toString(16).padStart(2, "0");
  return ("#" + pair(r) + pair(g) + pair(b)).toUpperCase();
}

