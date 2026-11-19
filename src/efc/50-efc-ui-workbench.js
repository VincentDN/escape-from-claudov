/* Hideout workbench. The iframe renders a draft; the game alone settles the stash transaction. */
const EFC_BENCH = { dialog: null, session: null };
function efcBenchOption(value, label) {
  const opt = document.createElement('option');
  opt.value = value;
  opt.textContent = label;
  return opt;
}
function efcBenchPreview() {
  const { dialog, session } = EFC_BENCH;
  if (!session) return;
  const def = efcCall('weaponmods:definition', { ...session.item, mods: { parts: session.parts, finish: session.finish } });
  dialog.querySelector('.efc-bench-stats').textContent = def ? [
    def.mag + ' rounds', 'Aim ' + Math.round(def.adsTime * 1000) + ' ms',
    'Spread ' + Math.round(def.spread[1] * 10000) / 10,
    'Recoil ' + Math.round(def.recoil.v * 10000) / 10,
    def.silent ? 'Suppressed sound' : 'Standard sound',
  ].join(' · ') : '';
  const parts = Object.fromEntries(session.parts.map(id => {
    const d = efcUiDef(id);
    const slot = d.part.bench === 'peq15' || d.part.bench === 'peq2' ? 'laser' :
      d.part.bench === 'scout' ? 'light' : efcCall('weaponmods:fit', session.item, id);
    return [slot, d.part.bench];
  }));
  const frame = dialog.querySelector('iframe');
  if (frame && location.protocol !== 'file:') {
    frame.contentWindow?.postMessage({ type: 'efc:bench-preview', parts, finish: session.finish }, location.origin);
  }
}
function efcBenchOptions() {
  const { dialog, session } = EFC_BENCH;
  const slots = dialog.querySelector('.efc-bench-slots');
  slots.replaceChildren();
  for (const { slot, label } of efcCall('weaponmods:slots', session.item) || []) {
    const row = document.createElement('label');
    row.textContent = label;
    const old = session.parts.find(id => efcCall('weaponmods:fit', session.item, id) === slot);
    const select = document.createElement('select');
    select.dataset.partSlot = slot;
    select.append(efcBenchOption('', 'Factory configuration'));
    for (const id of session.available) {
      if (efcCall('weaponmods:fit', session.item, id) !== slot) continue;
      select.append(efcBenchOption(id, efcUiDef(id).name));
    }
    select.value = old || '';
    select.addEventListener('change', () => {
      const draft = session.parts.filter(id => id !== old);
      if (select.value) draft.push(select.value);
      const normalized = efcCall('weaponmods:normalize', session.item, { parts: draft, finish: session.finish });
      if ((normalized?.parts.length || 0) !== draft.length) {
        select.value = old || '';
        dialog.querySelector('[role=status]').textContent = 'This build has reached its attachment limit.';
        return;
      }
      session.parts = draft;
      dialog.querySelector('[role=status]').textContent = '';
      efcBenchOptions();
      slots.querySelector('[data-part-slot="' + slot + '"]').focus();
      efcBenchPreview();
    });
    row.append(select);
    slots.append(row);
  }
}
function efcBenchDialog() {
  if (EFC_BENCH.dialog) return EFC_BENCH.dialog;
  const dialog = document.createElement('dialog');
  dialog.className = 'efc-bench';
  dialog.setAttribute('aria-labelledby', 'efcBenchTitle');
  dialog.innerHTML = '<header><h2 id="efcBenchTitle">Workbench</h2><button type="button" class="btn efc-bench-close">Close</button></header>' +
    '<div class="efc-bench-content"><div class="efc-bench-stage"></div><section><div class="efc-bench-slots"></div>' +
    '<label>Finish<select class="efc-bench-finish"></select></label><p class="efc-bench-stats" aria-live="polite"></p>' +
    '<p role="status"></p><button type="button" class="btn primary efc-bench-save">Save build</button></section></div>';
  const style = document.createElement('style');
  style.textContent = `
.efc-bench { color:var(--paper);background:var(--panel-2);border:1px solid var(--line-2);width:min(1050px,94vw);padding:16px;max-height:92vh; }
.efc-bench::backdrop { background:rgba(5,7,5,.88); }
.efc-bench header { display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px; }
.efc-bench h2 { margin:0;font-family:var(--stencil);font-size:32px;font-weight:400; }
.efc-bench-content { display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,30%);gap:16px; }
.efc-bench-stage { background:#171915;min-height:280px; }
.efc-bench-stage iframe { display:block;width:100%;height:100%;min-height:350px;border:0; }
.efc-bench-stage img { display:block;width:100%;height:auto;margin:60px auto; }
.efc-bench label { display:grid;gap:4px;margin:0 0 10px; }
.efc-bench select { padding:8px;color:var(--paper);background:var(--panel);border:1px solid var(--line-2);font:inherit; }
.efc-bench [role=status] { color:var(--acc); }
`;
  document.head.append(style);
  document.body.append(dialog);
  EFC_BENCH.dialog = dialog;
  dialog.querySelector('.efc-bench-close').addEventListener('click', () => dialog.close());
  dialog.querySelector('.efc-bench-save').addEventListener('click', () => {
    const session = EFC_BENCH.session;
    if (efcCall('weaponmods:save', session.where, session.expected, session.parts, session.finish)) dialog.close();
    else dialog.querySelector('[role=status]').textContent = 'The build could not be saved. Close and reopen the workbench to refresh your stash.';
  });
  dialog.querySelector('.efc-bench-finish').addEventListener('change', event => {
    EFC_BENCH.session.finish = event.target.value;
    efcBenchPreview();
  });
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    EFC_BENCH.session = null;
    dialog.querySelector('.efc-bench-stage').replaceChildren();
  });
  return dialog;
}
function efcBenchOpen(where) {
  if (typeof MATCH === 'undefined' || MATCH.state !== 'menu' || UI.screen !== 'hideout') return false;
  const stash = efcCall('stash:get');
  const item = Number.isInteger(where) ? stash?.items[where] : stash?.loadout.slots[where];
  if (!efcCall('weaponmods:slots', item)?.length) return false;
  const dialog = efcBenchDialog();
  if (dialog.open) return false;
  const def = efcUiDef(item.id), mods = item.mods || { parts: [], finish: 'stock' };
  const parts = mods.parts.slice();
  const available = new Set([...parts, ...stash.items.filter(it => !it.free && efcCall('weaponmods:fit', item, it.id)).map(it => it.id)]);
  EFC_BENCH.session = { where, expected: JSON.stringify(item), item, parts, finish: mods.finish, available };
  dialog.querySelector('h2').textContent = def.name + ' workbench';
  dialog.querySelector('[role=status]').textContent = '';
  const finish = dialog.querySelector('.efc-bench-finish');
  finish.replaceChildren(...Object.entries(efcCall('weaponmods:finishOptions')).map(([id, label]) => efcBenchOption(id, label)));
  finish.value = mods.finish;
  const stage = dialog.querySelector('.efc-bench-stage');
  if (location.protocol !== 'file:') {
    const frame = document.createElement('iframe');
    frame.title = def.name + ' workbench preview';
    frame.addEventListener('load', efcBenchPreview);
    frame.src = 'showcase/workbench/stg44/raid-preview.html?model=' + def.weapon.wkey;
    stage.replaceChildren(frame);
  } else stage.innerHTML = efcThumbImg(item.id, def.kind, 'big');
  efcBenchOptions();
  efcBenchPreview();
  dialog.showModal();
  return true;
}
efcProvide('weaponmods:open', efcBenchOpen);
