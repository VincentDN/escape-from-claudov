/* Escape From Claudov item preview: a 420 x 160 picture (the 'big' thumbnail, rendered at that size) with the item's name, weight and
   value, and for weapons the calibre, magazine and loaded rounds, shown beside the hovered or focused item row (or the selected row of
   the loot panel) in the hideout, the in-raid panels and the summary. It never takes the pointer and follows re-renders of the lists. */
const EFC_PV = { el: null, row: null };
/* Real-world calibre of each engine weapon (the game itself only knows five ammunition families) */
const EFC_PV_CAL = {
  m4: '5.56×45 mm', famas: '5.56×45 mm', ak47: '7.62×39 mm', sks: '7.62×39 mm', scarh: '7.62×51 mm', l96: '7.62×51 mm', svd: '7.62×54 mmR', m82: '.50 BMG',
  mp5: '9×19 mm', m9: '9×19 mm', glock18: '9×19 mm', mp7: '4.6×30 mm', ump45: '.45 ACP', vector: '.45 ACP', usp: '.45 ACP', deagle: '.50 AE',
  m1014: '12 gauge', rem870: '12 gauge', aa12: '12 gauge',
};
const EFC_PV_KIND = { weapon: 'Weapon', ammo: 'Ammunition', armor: 'Armour', pack: 'Pack', med: 'Medical', loot: 'Valuable' };

function efcPvEl() {
  if (EFC_PV.el) return EFC_PV.el;
  const el = document.createElement('div'); el.id = 'efcPrev'; el.className = 'efc-prev'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<div class="efc-prev-im"><img alt="" data-efc-var="big"></div><div class="efc-prev-h"><b></b><span></span></div><dl></dl>';
  document.body.appendChild(el);
  const st = document.createElement('style'); st.id = 'efcPrevCss';
  st.textContent = `
.efc-prev { position: fixed; z-index: 60; width: 448px; padding: 14px; pointer-events: none; display: none; color: var(--paper, #f2eee3);
  background: var(--panel-2, #1b1e17); border: 1px solid var(--line-2, rgba(242,238,227,.22)); box-shadow: 0 14px 40px rgba(0,0,0,.55); }
.efc-prev.show { display: block; }
.efc-prev-im { width: 420px; height: 160px; background: radial-gradient(ellipse at 50% 55%, rgba(242,238,227,.13), rgba(242,238,227,.02) 72%); }
.efc-prev-im img { display: block; width: 100%; height: 100%; object-fit: contain; }
.efc-prev-im img[data-pend] { opacity: .5; }
.efc-prev-h { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin: 10px 0 6px; }
.efc-prev-h b { font-size: 20px; font-weight: 700; }
.efc-prev-h span { color: var(--dim, #a9a594); font-size: var(--fs-xs, 12px); letter-spacing: .08em; text-transform: uppercase; }
.efc-prev dl { display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 4px 12px; margin: 0; font-size: var(--fs-s, 14px); }
.efc-prev dt { color: var(--dim, #a9a594); }
.efc-prev dd { margin: 0; font-variant-numeric: tabular-nums; }
.efc-prev dd.v { color: var(--acc, #f6c445); }`;
  document.head.appendChild(st);
  return (EFC_PV.el = el);
}
/* The item a row carries (set by efcThumbRow) */
function efcPvItem(row) {
  const ds = row.dataset; if (!ds.efcId) return null;
  return { id: ds.efcId, n: +ds.efcN || 1, mag: ds.efcMag != null ? +ds.efcMag : null, res: ds.efcRes != null ? +ds.efcRes : null };
}
function efcPvStats(it, d) {
  const out = [['Weight', efcUiKg(efcUiItemW(it))], ['Value', efcUiVal(efcUiItemV(it)), 'v']];
  if (d.kind === 'weapon' && d.weapon) {
    const W = typeof WEAPONS !== 'undefined' ? WEAPONS[d.weapon.wkey] : null, am = efcUiDef('ammo_' + d.weapon.fam);
    out.push(['Calibre', EFC_PV_CAL[d.weapon.wkey] || am.name || '?'], ['Ammunition', am.name || d.weapon.fam]);
    out.push(['Magazine', W ? W.mag + ' rounds' : '?'], ['Loaded', it.mag != null ? it.mag + (it.res != null ? ' + ' + it.res + ' spare' : '') : '?']);
  } else if (d.kind === 'ammo') out.push(['Rounds', String(it.n)], ['Box holds', String(d.stack || 1)]);
  else if (d.kind === 'armor' && d.armor) out.push(['Tier', String(d.armor.tier)], ['Stops', Math.round(d.armor.cut * 100) + ' % of body damage']);
  else if (d.kind === 'pack' && d.pack) out.push(['Carry', '+' + efcUiKg(d.pack.cap)]);
  else if (d.kind === 'med' && d.med) out.push(['Heals', d.med.heal + ' in ' + d.med.time + ' s'], ['Count', String(it.n)]);
  else if (it.n > 1) out.push(['Count', String(it.n)]);
  return out;
}
function efcPvShow(row) {
  const it = row && row.getClientRects().length && efcPvItem(row); if (!it) { efcPvHide(); return; }
  const el = efcPvEl(), d = efcUiDef(it.id), img = el.querySelector('img');
  EFC_PV.row = row;
  const url = efcCall('thumb:get', it.id, 'big', true);
  img.dataset.efcThumb = it.id;
  if (url) { img.src = url; img.removeAttribute('data-pend'); }
  else { img.src = efcCall('thumb:get', it.id, 'slot') || efcCall('thumb:get', it.id) || efcThumbSil(d.kind); img.dataset.pend = ''; }
  el.querySelector('.efc-prev-h b').textContent = d.name;
  el.querySelector('.efc-prev-h span').textContent = EFC_PV_KIND[d.kind] || '';
  el.querySelector('dl').innerHTML = efcPvStats(it, d).map(([k, v, c]) => `<dt>${esc(k)}</dt><dd${c ? ` class="${c}"` : ''}>${esc(v)}</dd>`).join('');
  el.classList.add('show');
  efcPvPlace();
}
/* Beside the row's list: on the side with more room, level with the row, inside the window */
function efcPvPlace() {
  const el = EFC_PV.el, row = EFC_PV.row; if (!el || !row) return;
  if (!row.isConnected) { efcPvHide(); return; }
  const r = row.getBoundingClientRect(), list = (row.closest('.efc-list') || row).getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
  const right = innerWidth - list.right, left = list.left;
  let x = right >= left ? list.right + 12 : list.left - w - 12;
  x = Math.max(8, Math.min(innerWidth - w - 8, x));
  const y = Math.max(8, Math.min(innerHeight - h - 8, r.top + r.height / 2 - h / 2));
  el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px';
}
function efcPvHide() { EFC_PV.row = null; if (EFC_PV.el) EFC_PV.el.classList.remove('show'); }
/* After a list is drawn again: the focused row, else the loot panel's selected row, else nothing */
function efcPvRefresh() {
  const a = document.activeElement, f = a && a.closest && a.closest('.efc-it[data-efc-id]');
  const sel = !f && document.querySelector('.efc-ov:not(.hidden) .efc-it.sel[data-efc-id]');
  const row = f || sel || (EFC_PV.row && EFC_PV.row.isConnected ? EFC_PV.row : null);
  if (row && row.getClientRects().length) efcPvShow(row); else efcPvHide();
}
function efcPvRowOf(t) { return t && t.closest ? t.closest('.efc-it[data-efc-id]') : null; }
/* The row under the pointer, if it is on screen (a row of a hidden screen keeps :hover) */
function efcPvHovered() { return [...document.querySelectorAll('.efc-it[data-efc-id]:hover')].find((r) => r.getClientRects().length) || null; }
addEventListener('mouseover', (e) => { const r = efcPvRowOf(e.target); if (r && r !== EFC_PV.row) efcPvShow(r); }, { passive: true });
addEventListener('mouseout', (e) => { const r = efcPvRowOf(e.target); if (r && r === EFC_PV.row && efcPvRowOf(e.relatedTarget) !== r) setTimeout(efcPvRefreshOut, 0); }, { passive: true });
function efcPvRefreshOut() { const h = efcPvHovered(); if (h) efcPvShow(h); else { EFC_PV.row = null; efcPvRefresh(); } }
addEventListener('focusin', (e) => { const r = efcPvRowOf(e.target); if (r) efcPvShow(r); });
addEventListener('focusout', () => setTimeout(() => { if (!efcPvHovered()) { EFC_PV.row = null; efcPvRefresh(); } }, 0));
addEventListener('scroll', () => efcPvPlace(), { capture: true, passive: true });
addEventListener('resize', () => efcPvPlace());
efcOn('thumb:ready', (id, v) => {
  if (v !== 'big' || !EFC_PV.el || !EFC_PV.row) return;
  const img = EFC_PV.el.querySelector('img');
  if (img.dataset.efcThumb === id) { img.src = efcCall('thumb:get', id, 'big'); img.removeAttribute('data-pend'); }
});
// lists are drawn again after every move: follow the focus to the new row, or hide
for (const ev of ['inv:changed', 'stash:changed', 'world:changed', 'ui:screen', 'raid:over', 'raid:begin']) efcOn(ev, () => setTimeout(efcPvRefresh, 0));
