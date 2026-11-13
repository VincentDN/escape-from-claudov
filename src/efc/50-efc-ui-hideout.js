/* Escape From Claudov UI: the Hideout screen. Left, the stash grouped by kind; right, the loadout (four slots, the bag, carried weight
   against the limit, total value). Every move goes through the ITEMS services (stash:toLoadout, stash:toStash, inv:equip) and the screen
   is drawn again from stash:get after each one. */
const EFC_HO = { note: '' };

function efcHoRender() {
  const root = $('scr-hideout'); if (!root) return;
  const mark = efcUiFocusMark(root), st = efcCall('stash:get');
  if (!st) {
    $('efcHoStash').innerHTML = '<p class="efc-none">The stash is not available.</p>';
    $('efcHoLoad').innerHTML = efcUiInvHtml(null); $('efcHoTot').innerHTML = efcUiTotHtml(null);
  } else {
    // stash: grouped by kind, each row keeps its index in the stash list
    const items = (st.items || []).map((it, i) => ({ it, i, d: efcUiDef(it.id) }));
    let h = '';
    for (const [kind, label] of EFC_UI_KINDS) {
      const g = items.filter((x) => (EFC_UI_KINDS.some((k) => k[0] === x.d.kind) ? x.d.kind : 'loot') === kind);
      if (!g.length) continue;
      g.sort((a, b) => String(a.d.name).localeCompare(String(b.d.name)));
      h += `<p class="efc-gh">${label}</p>` + g.map((x) => efcUiRow(x.it, { key: 'st-' + x.it.id + '-' + x.i, data: { stash: x.i }, title: 'Move to the loadout' })).join('');
    }
    $('efcHoStash').innerHTML = h || '<p class="efc-none">The stash is empty.</p>';
    const lo = st.loadout;
    $('efcHoLoad').innerHTML = efcUiInvHtml(lo, {
      bagActs: (i, it) => (EFC_UI_EQUIP[efcUiDef(it.id).kind] ? [['equip', 'Equip']] : []),
    });
    $('efcHoTot').innerHTML = efcUiTotHtml(lo);
  }
  $('efcHoNote').textContent = EFC_HO.note;
  const first = root.querySelector('#efcHoStash .efc-it') || root.querySelector('#efcHoLoad .efc-it:not(.empty)');
  if (first) first.dataset.focus = ''; // where uiGo puts the focus on arrival (src/09e-menus.js)
  efcUiFocusBack(root, mark);
}
function efcHoMove(fn) {
  const ok = fn();
  EFC_HO.note = ok === false ? 'That did not fit. Check the carry limit or free the slot first.' : '';
  efcHoRender();
}
function efcHoClick(e) {
  const b = e.target.closest && e.target.closest('button'); if (!b || b.disabled) return;
  const ds = b.dataset;
  if (ds.act === 'equip') {
    const i = +ds.bag;
    efcHoMove(() => {
      if (efcHas('stash:equip')) return efcCall('stash:equip', i);
      const st = efcCall('stash:get'); if (!st) return false;
      const r = efcCall('inv:equip', st.loadout, i);
      if (efcHas('stash:save')) efcCall('stash:save');
      return r;
    });
  } else if (ds.stash !== undefined) efcHoMove(() => efcCall('stash:toLoadout', +ds.stash));
  else if (ds.slot !== undefined) efcHoMove(() => efcCall('stash:toStash', ds.slot));
  else if (ds.bag !== undefined) efcHoMove(() => efcCall('stash:toStash', +ds.bag));
}

efcOn('ui:screen', (name, fresh) => { if (name === 'hideout') { if (fresh) EFC_HO.note = ''; efcHoRender(); } });
efcOn('ui:init', () => {
  $('scr-hideout').addEventListener('click', efcHoClick);
  $('efcHoGo').addEventListener('click', () => uiGo('raid'));
});
for (const ev of ['inv:changed', 'stash:changed']) efcOn(ev, () => { if (typeof UI !== 'undefined' && UI.screen === 'hideout' && MATCH.state === 'menu') efcHoRender(); });
