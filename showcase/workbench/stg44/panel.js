// StG 44 (2044) bench: the side panel (slots, sliders, finish, wear, views) built from the slot catalogue.
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids);
  return n;
};
export function buildPanel(o) {
  const {state, SLOTS, MOUNTS, PALETTES, WEAR, RIFLES, available, setVariant, setOption, slideTo, setPalette, setWear, view, reset} = o;
  const root = document.getElementById('slots'),
    syncers = [];
  // the two competing rebuilds of the same rifle
  const pick = document.getElementById('variant'),
    note = document.getElementById('variant-note');
  for (const [v, r] of Object.entries(RIFLES)) {
    const b = el('button', {textContent: r.label, onclick: () => (setVariant(v), sync())});
    syncers.push(() => b.setAttribute('aria-pressed', String(state.variant === v)));
    pick.append(b);
  }
  syncers.push(
    () => (note.textContent = RIFLES[state.variant].note + ' ' + document.getElementById('stage').dataset.triangles + ' triangles.'),
  );
  for (const [slot, def] of Object.entries(SLOTS)) {
    const sec = el('section', {className: 'slot'}, el('h2', {textContent: def.label}));
    const row = el('div', {className: 'tools', role: 'group'});
    row.setAttribute('aria-label', def.label);
    for (const opt of def.options) {
      const b = el('button', {textContent: opt.label, onclick: () => setOption(slot, opt.id)});
      syncers.push(() => {
        b.setAttribute('aria-pressed', String(state.build[slot] === opt.id));
        b.disabled = !available(opt);
        b.title = b.disabled ? 'Not on this rebuild' : '';
      });
      row.append(b);
    }
    sec.append(row);
    const range = MOUNTS[slot]?.range || def.slide?.range;
    if (range) {
      const out = el('output'),
        input = el('input', {type: 'range', min: String(Math.round(range[0] * 100)), max: String(Math.round(range[1] * 100)), step: '1'});
      input.setAttribute('aria-label', (def.slide?.label || 'Position on the rail') + ', ' + def.label);
      input.oninput = () => slideTo(slot, input.value / 100);
      syncers.push(() => {
        input.value = String(Math.round(state.pos[slot] * 100));
        out.textContent = Math.round((state.pos[slot] - range[0]) * 1000) + ' mm';
        input.disabled = state.build[slot] === 'none' || (def.slide?.only && state.build[slot] !== def.slide.only);
      });
      sec.append(el('label', {className: 'slider'}, el('span', {textContent: def.slide?.label || 'Rail position'}), out, input));
    }
    root.append(sec);
  }
  const fin = document.getElementById('finish');
  for (const [id, p] of Object.entries(PALETTES)) {
    const b = el('button', {textContent: p.label, onclick: () => (setPalette(id), sync())});
    syncers.push(() => b.setAttribute('aria-pressed', String(state.palette === id)));
    fin.append(b);
  }
  const wear = document.getElementById('wear'),
    wearOut = document.getElementById('wear-level');
  wear.oninput = () => (setWear(wear.value / 100), sync());
  syncers.push(() => {
    wear.value = String(Math.round(WEAR.value * 100));
    wearOut.textContent =
      WEAR.value < 0.15 ? 'Factory new' : WEAR.value < 0.45 ? 'Issued' : WEAR.value < 0.75 ? 'Field worn' : 'Battle worn';
  });
  document.querySelectorAll('[data-view]').forEach(b => (b.onclick = () => view(b.dataset.view)));
  document.getElementById('reset').onclick = () => (reset(), sync());
  const snd = document.getElementById('sound');
  snd.onclick = () => ((state.sound = !state.sound), sync());
  syncers.push(() => {
    snd.setAttribute('aria-pressed', String(state.sound));
    snd.textContent = state.sound ? 'Handling sound on' : 'Handling sound off';
  });
  const sync = () => syncers.forEach(f => f());
  return {sync};
}
