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
  } else if (def && (EFC_PARTISAN_WEAPON_MODELS.has(def.id) || def.id === 'stg44')) {
    const image = dialog.querySelector('.efc-bench-stage img');
    const url = efcCall('thumb:weaponVariant', session.item.id, def.key);
    if (image && url) image.src = url;
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
      if (select.value !== (old || '')) efcEmit('ui:inventory-gesture', select.value ? 'mount' : 'unmount', session.item);
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
    '<div class="efc-bench-content"><div class="efc-bench-stage"></div><section class="efc-bench-controls"><div class="efc-bench-options"><div class="efc-bench-slots"></div>' +
    '<label>Finish<select class="efc-bench-finish"></select></label><p class="efc-bench-stats" aria-live="polite"></p></div>' +
    '<p role="status"></p><button type="button" class="btn primary efc-bench-save">Save build</button></section></div>';
  const style = document.createElement('style');
  style.textContent = `
.efc-bench { position:fixed;inset:0;margin:0;width:100%;height:100%;max-width:none;max-height:none;overflow:hidden;
  color:var(--paper);background:var(--panel-2);border:0;padding:clamp(12px,1.8vw,36px); }
.efc-bench[open] { display:grid;grid-template-rows:auto minmax(0,1fr);gap:clamp(10px,1.2vw,24px); }
.efc-bench::backdrop { background:rgba(5,7,5,.88); }
.efc-bench header { display:flex;align-items:center;justify-content:space-between;gap:12px; }
.efc-bench h2 { margin:0;font-family:var(--display);font-size:clamp(24px,2.3vw,44px);font-weight:600; }
.efc-bench-content { display:grid;grid-template-columns:minmax(0,1fr) clamp(230px,28vw,480px);gap:clamp(10px,1.2vw,24px);min-height:0; }
.efc-bench-stage { position:relative;min-width:0;min-height:0;background:#171915; }
.efc-bench-stage :is(iframe,img) { position:absolute;inset:0;display:block;width:100%;height:100%;border:0; }
.efc-bench-stage img { object-fit:contain; }
.efc-bench-controls { display:flex;flex-direction:column;align-items:flex-start;gap:10px;min-height:0; }
.efc-bench-options { width:100%;flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain; }
.efc-bench label { display:grid;gap:4px;margin:0 0 10px; }
.efc-bench select { min-width:0;padding:8px;color:var(--paper);background:var(--panel);border:1px solid var(--line-2);font:inherit; }
.efc-bench [role=status] { color:var(--acc);margin:0; }
.efc-bench [role=status]:empty { display:none; }
@media (max-width: 700px) {
  .efc-bench-content { grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(125px,1fr) minmax(0,1fr); }
}
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
  window.addEventListener('message', event => {
    if (!dialog.open || event.origin !== location.origin || event.data?.type !== 'efc:bench-foley') return;
    const frame = dialog.querySelector('.efc-bench-stage iframe');
    if (frame?.contentWindow !== event.source) return;
    const { cue, intensity } = event.data;
    if ((cue === 'handle' || cue === 'hit') && Number.isFinite(intensity)) efcEmit('workbench:turn-foley', cue, clamp(intensity, 0, 1));
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
  const useRaidPreview = EFC_PARTISAN_WEAPON_MODELS.has(def.weapon.wkey) || [...available].some(id => ATT[efcUiDef(id).part.key]?.partisan);
  if (location.protocol !== 'file:' && !useRaidPreview) {
    const frame = document.createElement('iframe');
    frame.title = def.name + ' workbench preview';
    frame.addEventListener('load', efcBenchPreview);
    frame.src = 'showcase/workbench/stg44/raid-preview.html?model=' + def.weapon.wkey;
    stage.replaceChildren(frame);
  } else stage.innerHTML = efcThumbImg(item.id, def.kind, 'big');
  efcBenchOptions();
  efcBenchPreview();
  dialog.showModal();
  efcEmit('workbench:open');
  return true;
}
efcProvide('weaponmods:open', efcBenchOpen);
