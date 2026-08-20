/* Picking a color by holding the real thing against the screen.
 *
 * This is the one screen in the app whose job is a judgement your eyes make,
 * so it is not a sheet like everything else. A 36px chip in a white card is
 * the worst possible test: a small patch takes on the opposite of whatever
 * surrounds it, and a white surround drags every reading toward dark and
 * washed out. What you compare against a printed swatch has to be a field,
 * not a chip.
 *
 * So the picked color is the background — all of it, edge to edge — and the
 * controls are banded off at the top and the bottom with nothing but color
 * between them. Hold the spool or the print up to the middle of the glass and
 * the two are side by side on the same field.
 *
 * Only the strip along the top — title, hex and brightness together — and the
 * buttons hold their own ground; everything around them is the color, including
 * the field the wheel floats on. None of them re-inks with it either: chrome that turns
 * over as you cross from a dark color to a light one is a screen flashing
 * inside out under your thumb, which is worse than the contrast it buys.
 *
 * Everything here is its own screen and its own listeners; nothing in it
 * reaches for the bench. */

import * as Color from "./color.js";

const TITLE = "Pick a color";

export function open(startHex, onPick) {
  let { h, s, v } = Color.hexToHsv(startHex);

  const root = document.createElement("div");
  root.className = "cwfull";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", TITLE);
  root.innerHTML = `
    <div class="cw-top">
      <div class="cw-head"><h2>${TITLE}</h2><span class="hexcode" id="cw-hex"></span></div>
      <input type="range" id="cw-val" min="0" max="100" value="${Math.round(v * 100)}" aria-label="Brightness">
    </div>
    <div class="wheel" id="cw-wheel">
      <div class="cw-layer cw-hue"></div><div class="cw-layer cw-sat"></div>
      <div class="cw-layer cw-shade" id="cw-shade"></div>
      <div class="cw-dot" id="cw-dot"></div>
    </div>
    <div class="cw-foot">
      <button class="btn" id="cw-cancel">Cancel</button>
      <button class="btn primary" id="cw-use">Use this color</button>
    </div>`;
  document.body.appendChild(root);
  const was = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  const find = id => root.querySelector("#" + id);
  const wheel = find("cw-wheel"), dot = find("cw-dot"), shade = find("cw-shade");
  const hexEl = find("cw-hex"), valEl = find("cw-val");

  function paint() {
    const hex = Color.hsvToHex(h, s, v);
    /* The whole of what this screen paints. */
    root.style.background = hex;

    /* The disc always shows full-brightness hues; darkening is an overlay, so
       the dot stays visible instead of vanishing into a black wheel. */
    shade.style.opacity = String(1 - v);
    /* Twelve o'clock is hue 0 and it runs clockwise, matching the gradient. */
    const rad = (h * Math.PI) / 180;
    dot.style.left = `${50 + Math.sin(rad) * s * 50}%`;
    dot.style.top = `${50 - Math.cos(rad) * s * 50}%`;
    dot.style.background = hex;
    hexEl.textContent = hex;
  }

  function pickAt(clientX, clientY) {
    const box = wheel.getBoundingClientRect();
    const dx = clientX - (box.left + box.width / 2);
    const dy = clientY - (box.top + box.height / 2);
    s = Math.min(1, Math.hypot(dx, dy) / (box.width / 2));
    /* atan2(dx, -dy) measures clockwise from twelve o'clock rather than
       anticlockwise from three, which is the convention the gradient uses. */
    h = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (h < 0) h += 360;
    paint();
  }

  let dragging = false;
  wheel.addEventListener("pointerdown", e => {
    dragging = true;
    wheel.setPointerCapture(e.pointerId);
    pickAt(e.clientX, e.clientY);
  });
  wheel.addEventListener("pointermove", e => { if (dragging) pickAt(e.clientX, e.clientY); });
  const drop = () => { dragging = false; };
  wheel.addEventListener("pointerup", drop);
  wheel.addEventListener("pointercancel", drop);
  valEl.oninput = () => { v = Number(valEl.value) / 100; paint(); };

  /* No tap-outside to close: outside is the color field, and the whole point
     is that you can put a finger on it while comparing. Escape and Cancel. */
  const shut = () => {
    root.remove();
    document.body.style.overflow = was;
    document.removeEventListener("keydown", onKey, true);
  };
  const onKey = e => { if (e.key === "Escape") { e.stopPropagation(); shut(); } };
  document.addEventListener("keydown", onKey, true);
  find("cw-cancel").onclick = shut;
  find("cw-use").onclick = () => { onPick(Color.hsvToHex(h, s, v)); shut(); };

  paint();
  return root;
}
