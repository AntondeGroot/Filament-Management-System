/* The roll's own sheet: which color it is, what state it is in, and when it was
 * last dried. Markup only — spoolForm() in index.html wires the color swap, the
 * state select and the saving.
 *
 * What it cannot work out for itself comes in through `p`: the escape, the
 * swatch it belongs to, whether drying is being tracked at all, and the bore
 * color, which is arithmetic on the hex that belongs to Color. */

export const formHTML = (s, p) => `
  <h2>${p.existing ? "Edit roll" : "Add a roll"}</h2>
  <div style="display:flex;gap:11px;align-items:center;margin:-4px 0 14px">
    <div class="disc" style="--c:${p.esc(p.w.hex)};--bore:${p.bore};--fill:1;width:46px;height:46px">
      <div class="flange"></div><div class="wind"></div><div class="hub"></div>
    </div>
    <div style="min-width:0">
      <div style="font-family:var(--display);text-transform:uppercase;letter-spacing:.05em;font-weight:600;font-size:16px">${p.esc(p.w.colorName)}</div>
      <div style="font-size:12px;color:var(--ink-soft)">${p.esc(p.w.brand)} · ${p.esc(p.w.material)}
        <button class="btn ghost tiny" id="f-swap" style="margin-left:6px">Change color</button></div>
    </div>
  </div>
  <div class="two">
    <div class="field"><label>State</label>
      <select id="f-state">
        <option value="fine"${!s.low && !s.sealed ? " selected" : ""}>Open, fine</option>
        <option value="low"${s.low && !s.sealed ? " selected" : ""}>Running low</option>
        <option value="sealed"${s.sealed ? " selected" : ""}>Sealed, unopened</option>
      </select>
    </div>
    ${p.existing ? "" : `<div class="field"><label>How many</label>
      <input type="number" id="f-qty" min="1" max="24" value="1"></div>`}
  </div>
  ${p.drying ? `<div class="field" id="f-dried-wrap" style="display:${s.sealed ? "none" : "block"}">
    <label>Last dried</label>
    <input type="date" id="f-dried" value="${p.esc(s.driedAt || "")}">
    <div style="font-size:11px;color:var(--ink-soft);margin-top:3px">
      Leave blank if you don't know.</div>
  </div>` : ""}
  <div class="sheet-foot">
    <span class="spacer"></span>
    <button class="btn ghost" data-close>Cancel</button>
    <button class="btn primary" id="f-save">${p.existing ? "Save" : "Add to unassigned"}</button>
  </div>`;
