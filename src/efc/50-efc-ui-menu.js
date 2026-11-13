/* Escape From Claudov UI: main menu entries, the Raid screen (map choice, then the engine's loading and deploy flow), the raid deploy view,
   Credits, and the helpers the other UI files share (item rows, numbers, list keyboard navigation). Other packages are reached only through
   efcCall and events (docs/contracts/CONTRACT.md); every result may be undefined while a package is missing. */
const EFC_UI = { map: null, raidL: null, depTitle: '' };
const EFC_UI_KINDS = [['weapon', 'Weapons'], ['ammo', 'Ammunition'], ['armor', 'Armour'], ['pack', 'Packs'], ['med', 'Medical'], ['loot', 'Valuables']];
const EFC_UI_SLOTS = [['primary', 'Primary'], ['sidearm', 'Sidearm'], ['armor', 'Armour'], ['pack', 'Pack']];
const EFC_UI_EQUIP = { weapon: 1, armor: 1, pack: 1 }; // kinds that go into a slot
const EFC_UI_SRC = 'https://github.com/VincentDN/escape-from-claudov';

/* ---------- Shared helpers ---------- */
function efcUiDef(id) { return efcCall('item:def', id) || { id, name: String(id), kind: 'loot', w: 0, value: 0 }; }
function efcUiKg(w) { return (Math.round((+w || 0) * 10) / 10).toFixed(1) + ' kg'; }
function efcUiVal(v) { return Math.round(+v || 0).toLocaleString('en-US'); }
function efcUiItemW(it) { return (efcUiDef(it.id).w || 0) * (it.n || 1); }
function efcUiItemV(it) { return (efcUiDef(it.id).value || 0) * (it.n || 1); }
/* Totals of an inventory: the ITEMS services when present, else the same rules computed here (the bag weighs, equipped slots are free) */
function efcUiInvTotals(inv) {
  if (!inv) return { w: 0, cap: EFC.cfg.bagBase, v: 0 };
  const bag = inv.bag || [], slots = inv.slots || {}, all = bag.concat(Object.values(slots).filter(Boolean));
  const pack = slots.pack ? efcUiDef(slots.pack.id) : null;
  const w = efcCall('inv:weight', inv), cap = efcCall('inv:cap', inv), v = efcCall('inv:value', inv);
  return {
    w: w !== undefined ? w : bag.reduce((s, it) => s + efcUiItemW(it), 0),
    cap: cap !== undefined ? cap : EFC.cfg.bagBase + ((pack && pack.pack && pack.pack.cap) || 0),
    v: v !== undefined ? v : all.reduce((s, it) => s + efcUiItemV(it), 0),
  };
}
/* One item row: a button (data attributes in o.data) and optional action buttons [[act, label, disabled]] */
function efcUiRow(it, o = {}) {
  const d = efcUiDef(it.id), data = Object.entries(o.data || {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
  const ammo = d.kind === 'weapon' && it.mag != null ? ` (${it.mag}${it.res != null ? ' + ' + it.res : ''})` : '';
  const head = o.slot ? `<span class="k">${esc(o.slot)}</span>` : '';
  const acts = (o.acts || []).map(([a, label, dis]) => `<button class="efc-act" type="button" data-act="${a}" data-key="${esc(o.key || '')}"${data}${dis ? ' disabled' : ''}>${esc(label)}</button>`).join('');
  return `<div class="efc-row" role="listitem"><button class="efc-it${o.slot ? '' : ' noslot'}${o.sel ? ' sel' : ''}" type="button" data-key="${esc(o.key || '')}"${data}${o.title ? ` title="${esc(o.title)}"` : ''}>`
    + `${head}<span class="nm">${esc(d.name)}${esc(ammo)}</span><span class="n">${(it.n || 1) > 1 ? it.n : ''}</span><span class="w">${efcUiKg(efcUiItemW(it))}</span><span class="v">${efcUiVal(efcUiItemV(it))}</span></button>${acts}</div>`;
}
function efcUiEmptySlot(label) {
  return `<div class="efc-row" role="listitem"><div class="efc-it empty"><span class="k">${esc(label)}</span><span class="nm">Empty</span><span class="n"></span><span class="w"></span><span class="v"></span></div></div>`;
}
/* Rows of an inventory: the four slots, then the bag. o.slotActs(slot, item) and o.bagActs(idx, item) give the action buttons */
function efcUiInvHtml(inv, o = {}) {
  let h = '';
  for (const [s, label] of EFC_UI_SLOTS) {
    const it = inv && inv.slots ? inv.slots[s] : null;
    h += it ? efcUiRow(it, { slot: label, key: 'slot-' + s, data: { slot: s }, acts: o.slotActs ? o.slotActs(s, it) : null }) : efcUiEmptySlot(label);
  }
  const bag = (inv && inv.bag) || [];
  h += `<p class="efc-gh">Bag</p>` + (bag.length ? bag.map((it, i) => efcUiRow(it, { key: 'bag-' + i, data: { bag: i }, acts: o.bagActs ? o.bagActs(i, it) : null })).join('') : '<p class="efc-none">The bag is empty.</p>');
  return h;
}
function efcUiTotHtml(inv) {
  const t = efcUiInvTotals(inv);
  return `<span>Carried <b class="${t.w > t.cap ? 'over' : ''}">${efcUiKg(t.w)}</b> of ${efcUiKg(t.cap)}</span><span>Total value <b>${efcUiVal(t.v)}</b></span>`;
}
/* Focus after a re-render: the row with the same key, else the row at the same place in the same list */
function efcUiFocusMark(root) {
  const a = document.activeElement; if (!a || !root.contains(a)) return null;
  const list = a.closest('.efc-list'), row = a.closest('.efc-row'), its = list ? [...list.querySelectorAll('.efc-it:not(.empty)')] : [];
  return { key: a.dataset.key, act: a.dataset.act || '', list: list ? list.id : '', i: its.indexOf(row ? row.querySelector('.efc-it') : a) };
}
function efcUiFocusBack(root, m) {
  if (!m) return;
  let t = m.key ? [...root.querySelectorAll('.efc-it, .efc-act')].find((e) => e.dataset.key === m.key && (e.dataset.act || '') === m.act) : null;
  if (!t && m.list && $(m.list)) { const its = [...$(m.list).querySelectorAll('.efc-it:not(.empty)')]; t = its[Math.min(Math.max(m.i, 0), its.length - 1)]; }
  if (!t) t = root.querySelector('.efc-it:not(.empty), button:not(:disabled)');
  if (t) t.focus({ preventScroll: false });
}
/* Arrow keys in a panel: up and down along a list (then on to the buttons after it), left and right along a row, or across to the other list */
function efcUiNav(root, code) {
  const vis = (e) => !e.disabled && e.tabIndex >= 0 && e.getClientRects().length > 0, all = [...root.querySelectorAll('button')].filter(vis), a = document.activeElement;
  if (!all.length) return;
  if (!a || !root.contains(a) || !all.includes(a)) { all[0].focus(); return; }
  const row = a.closest('.efc-row'), list = a.closest('.efc-list');
  if (code === 'ArrowUp' || code === 'ArrowDown') {
    const d = code === 'ArrowDown' ? 1 : -1;
    if (list) {
      const rows = [...list.querySelectorAll('.efc-it')].filter(vis), i = rows.indexOf(row ? row.querySelector('.efc-it') : a);
      if (rows[i + d]) { rows[i + d].focus(); return; }
    }
    const j = all.indexOf(d > 0 ? (row ? row.lastElementChild : a) : (row ? row.firstElementChild : a)), n = all[j + d];
    if (n) n.focus();
    return;
  }
  const d = code === 'ArrowRight' ? 1 : -1, sib = row ? [...row.querySelectorAll('button')].filter(vis) : [];
  const k = sib.indexOf(a);
  if (sib[k + d]) { sib[k + d].focus(); return; }
  const lists = [...root.querySelectorAll('.efc-list')].filter((l) => l.querySelector('.efc-it'));
  const li = lists.indexOf(list), other = lists[li + d];
  if (other) { const rows = [...other.querySelectorAll('.efc-it')].filter(vis), mine = list ? [...list.querySelectorAll('.efc-it')].indexOf(row ? row.querySelector('.efc-it') : a) : 0; if (rows.length) rows[Math.min(Math.max(mine, 0), rows.length - 1)].focus(); return; }
  if (!row) { const j = all.indexOf(a); if (all[j + d]) all[j + d].focus(); }
}
/* An Escape From Claudov overlay (inventory, loot, summary) is open over the game */
function efcUiOverlayOpen() { return !!document.querySelector('.efc-ov:not(.hidden)'); }

/* ---------- Raid screen: map, Hideout link, loadout on the right, then the engine's loading and deploy flow ---------- */
function efcUiRaidMap() { return mapById(EFC_UI.map || (EFC.cfg && EFC.cfg.raidMap) || 'simoun'); }
function efcUiKitNode() {
  const st = efcCall('stash:get'), el = document.createElement('div'); el.className = 'efc-stage';
  el.innerHTML = '<p class="lbl">Your loadout</p>' + efcUiKitHtml(st);
  return el;
}
function efcUiKitHtml(st) {
  if (!st || !st.loadout) return '<p class="hint">No stash yet. You go in with the free fallback pistol.</p>';
  return `<div class="efc-list">${efcUiInvHtml(st.loadout)}</div><div class="efc-tot">${efcUiTotHtml(st.loadout)}</div>`
    + '<p class="hint">Everything you take in is at risk. Reach an extraction point to keep what you carry.</p>';
}
function efcUiRaidPreview(m) {
  const art = m.ok && MAP_ART[m.id];
  return (art ? `<img class="mapart" alt="" decoding="async" src="${art}">` : '<span class="mapart none"></span>')
    + `<div class="pv-t"><b>${esc(m.name)}</b><span class="pv-m">Raid</span><span class="pv-i">${EFC.cfg.raidMinutes} min, one life</span></div>`;
}
const EFC_RAID_PAGES = {
  raid: () => {
    const m = efcUiRaidMap();
    return {
      title: 'Raid', sub: 'Solo raid against the Wardens',
      rows: [
        { k: 'link', key: 'map', label: 'Map', value: m.name, page: 'map' },
        { k: 'link', key: 'hideout', label: 'Hideout', value: 'Change your loadout', open: () => uiGo('hideout') },
      ],
      stage: efcUiKitNode, preview: efcUiRaidPreview(m),
    };
  },
  map: () => ({ head: 'Map', grid: true, rows: mapCards(efcUiRaidMap().id, (id) => { EFC_UI.map = id; sfxUi('click'); lmPop(EFC_UI.raidL); }) }),
};
/* Starts a solo raid on a map: the engine's loading screen, then the deploy screen in its raid view */
function efcUiRaidLaunch(mapId) {
  const id = mapById(mapId || efcUiRaidMap().id).id;
  EFC_UI.map = id; Settings.map = id; Settings.mode = 'raid'; saveSettings();
  menuLaunch({ online: false, map: id, raid: true, deploy: () => startMatch() });
}
/* Deploy screen of a raid (renderDeploy, src/09e-menus.js): the loadout instead of the class picker */
efcOn('ui:deploy', () => {
  $('scr-deploy').querySelector('h2').textContent = 'Ready to deploy';
  $('depGo').textContent = 'Deploy';
  $('depTimer').innerHTML = `Raid, <b>${EFC.cfg.raidMinutes} min</b>, one life`;
  $('efcDepKit').innerHTML = '<p class="lbl">Your loadout</p>' + efcUiKitHtml(efcCall('stash:get'));
  return true;
});
function efcUiStashLine() {
  const st = efcCall('stash:get'); if (!st) return 'Stash and loadout';
  const items = st.items || [], v = items.reduce((s, it) => s + efcUiItemV(it), 0);
  return `${items.length} ${items.length === 1 ? 'item' : 'items'} in the stash, value ${efcUiVal(v)}`;
}

/* ---------- Screens and start-up ---------- */
efcOn('ui:screen', (name, fresh) => {
  if (name === 'main') $('efcMmStash').textContent = efcUiStashLine();
  else if (name === 'raid') { if (fresh) lmReset(EFC_UI.raidL); else lmRender(EFC_UI.raidL, { focus: true, restore: true }); }
  else if (name === 'deploy' && !(UI.flow && UI.flow.raid)) $('scr-deploy').querySelector('h2').textContent = EFC_UI.depTitle;
});
efcOn('ui:init', () => {
  EFC_UI.depTitle = $('scr-deploy').querySelector('h2').textContent;
  EFC_UI.raidL = lmMount($('scr-raid'), { pages: EFC_RAID_PAGES, home: 'raid', col: $('efcRaidList'), stage: $('efcRaidStage'), panel: $('efcRaidPanel'),
    preview: $('efcRaidPrev'), preview2: $('efcRaidPrev2'), title: $('scr-raid').querySelector('h2'), sub: $('efcRaidSub'), screen: 'raid' });
  $('efcRaidGo').addEventListener('click', () => efcUiRaidLaunch());
  $('efcCrSrc').addEventListener('click', () => window.open(EFC_UI_SRC, '_blank', 'noopener'));
  $('efcMmStash').textContent = efcUiStashLine();
});
