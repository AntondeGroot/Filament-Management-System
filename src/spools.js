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
        <option value="fine"${!s.low ? " selected" : ""}>Open, fine</option>
        <option value="low"${s.low ? " selected" : ""}>Running low</option>
      </select>
    </div>
    ${p.existing ? "" : `<div class="field"><label>How many</label>
      <input type="number" id="f-qty" min="1" max="24" value="1"></div>`}
  </div>
  <label style="display:flex;align-items:center;gap:7px;font-size:13px;margin:-2px 0 12px;cursor:pointer">
    <input type="checkbox" id="f-sealed"${s.sealed ? " checked" : ""}>
    Sealed in a bag — nothing dries out in there</label>
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

/* The roll's own sheet: where it sits, how dry it is, and everything you can do
 * to it without dragging it anywhere. Markup only — openSpool() in index.html
 * wires the buttons and works out what this cannot: where "here" is, what the
 * drying ledger makes of it, and which slots it could move to.
 *
 * Sealing sits on the drying line rather than in the row of buttons at the
 * foot, because that is the sentence it changes. A bag with desiccant is a
 * place a roll can be, and putting one back into it is the same kind of act as
 * moving it to a box — not a fourth thing to do to it after Delete and Edit.
 *
 * Offered wherever the roll is, including the places a bag makes no sense —
 * loaded on a printer, or sitting in the dryer. What the button records is what
 * you say you did, and a sheet that hides the control until the app agrees the
 * roll is somewhere baggable is a sheet arguing with the person holding it. The
 * bench still has the last word on the one move that cannot be survived: a
 * sealed roll dropped onto a machine comes out of its bag. */
export const detailHTML = (s, p) => `
  <h2>${p.esc(p.w.brand)} ${p.esc(p.w.colorName)}</h2>
  <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px">
    <div class="disc" style="--c:${p.esc(p.w.hex)};--bore:${p.bore};--fill:${p.fill};width:58px;height:58px">
      <div class="flange"></div><div class="wind"></div><div class="hub"></div>
    </div>
    <div>
      <div><span class="chip">${p.esc(p.w.material)}</span>
        <span class="mono" style="font-size:12px;margin-left:5px">${p.esc(p.w.hex.toUpperCase())}</span>
        <button class="btn ghost tiny" data-swatch="${p.w.id}" style="margin-left:5px">Swatch</button></div>
      <div style="font-size:12px;color:var(--ink-soft);margin-top:4px">${p.where}</div>
      <div style="font-size:12px;margin-top:3px;color:${p.stale ? "var(--damp)" : "var(--ink-soft)"};display:flex;align-items:center;gap:5px;flex-wrap:wrap">
        ${p.drop}${p.dryLine}
        <button class="btn ghost tiny" id="d-seal">${s.sealed ? "Open it" : "Seal it"}</button></div>
    </div>
  </div>
  <div class="field"><label>Move to</label>
    <select id="d-move"><option value="">Pick a slot…</option>${p.opts}${p.zone === "spares" ? "" : `<option value="spares">Unassigned</option>`}${p.zone === "reorder" ? "" : `<option value="reorder">Reorder queue</option>`}</select>
  </div>
  <div class="sheet-foot">
    <button class="btn danger" id="d-del">Delete</button>
    <span class="spacer"></span>
    <button class="btn" id="d-edit">Edit</button>
    ${p.reorder ? `<button class="btn ghost" id="d-ordered">${s.ordered ? "Not ordered yet" : "Mark as ordered"}</button>`
      : `<button class="btn ghost" id="d-low">${s.low ? "Not low anymore" : "Mark running low"}</button>
         ${p.drying && !s.sealed ? `<button class="btn ghost" id="d-dried">Dried today</button>` : ""}
         ${s.sealed ? "" : `<button class="btn ghost" id="d-spare">Add a sealed spare</button>`}`}
    <button class="btn primary" data-close>Done</button>
  </div>`;
