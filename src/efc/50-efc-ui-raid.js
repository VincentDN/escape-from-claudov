/* Escape From Claudov UI in raid: the "F  Search" prompt and its hold, the loot panel, the inventory panel (Tab), heal progress.
   The match is never paused: a panel frees the cursor, and while it is open the soldier cannot fire or turn (service ui:busy). The engine's
   input listeners are on window; the capture listeners below run first and keep mouse look, firing, the knife (F), the scoreboard (Tab) and the
   pause (Escape, lost pointer lock) away from the soldier while a panel or the summary is open. */
const EFC_UIR = { on: false, panel: null, cid: null, hold: null, near: null, sel: 0, all: null };
const EFC_UIR_MOVE = new Set(['KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', 'ShiftLeft', 'ControlLeft', 'KeyC']);

efcProvide('ui:busy', () => !!EFC_UIR.panel);

function efcUirCont() { const id = EFC_UIR.cid; return id == null ? null : (efcCall('world:list') || []).find((c) => c.id === id) || null; }
function efcUirName(c) { return (c && c.name) || ({ crate: 'Crate', locker: 'Locker', bag: 'Bag', body: 'Body', drop: 'Dropped items' }[c && c.kind] || 'Container'); }
function efcUirDist(c) { const p = PL.ent.pos; return Math.hypot(c.x - p.x, c.z - p.z); }

/* ---------- Panels ---------- */
function efcUirOpen(kind, cid) {
  if (EFC_UIR.panel) efcUirClose(true);
  EFC_UIR.panel = kind; EFC_UIR.cid = cid == null ? null : cid; EFC_UIR.hold = null; EFC_UIR.sel = 0;
  efcUirPrompt('');
  for (const k in KEYS) KEYS[k] = false;
  PL.held = false; PL.queued = false; PL.adsWant = false;
  showScoreboard(false); showLockPrompt(false); LOCK.quiet = false;
  if (document.pointerLockElement) document.exitPointerLock(); // the cursor is free; the pointerlockchange guard below keeps the match running
  $(kind === 'loot' ? 'efcLoot' : 'efcInv').classList.remove('hidden');
  efcUirRender();
  const f = $(kind === 'loot' ? 'efcLootList' : 'efcInvList').querySelector('.efc-it:not(.empty)') || $(kind === 'loot' ? 'efcLoot' : 'efcInv').querySelector('button:not(:disabled)');
  if (f) f.focus({ preventScroll: true });
}
function efcUirClose(silent) {
  if (!EFC_UIR.panel) return;
  EFC_UIR.panel = null; EFC_UIR.cid = null; EFC_UIR.all = null;
  $('efcInv').classList.add('hidden'); $('efcLoot').classList.add('hidden');
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  for (const k in KEYS) KEYS[k] = false;
  if (!silent && MATCH.state === 'playing' && PL.ent.alive) requestLock(); // back to pointer lock (the key that closed the panel is the gesture)
}
function efcUirRender() {
  if (EFC_UIR.panel === 'inv') efcUirRenderInv();
  else if (EFC_UIR.panel === 'loot') efcUirRenderLoot();
}
function efcUirRenderInv() {
  const root = $('efcInv'), mark = efcUiFocusMark(root), inv = EFC.inv;
  const canDrop = efcHas('world:put'), canUse = efcHas('med:use');
  $('efcInvList').innerHTML = efcUiInvHtml(inv, {
    slotActs: () => [['unequip', 'Unequip'], ['drop', 'Drop', !canDrop]],
    bagActs: (i, it) => {
      const k = efcUiDef(it.id).kind, a = [];
      if (EFC_UI_EQUIP[k]) a.push(['equip', 'Equip']);
      if (k === 'med') a.push(['use', 'Use', !canUse]);
      a.push(['drop', 'Drop', !canDrop]);
      return a;
    },
  });
  $('efcInvW').innerHTML = efcUiTotHtml(inv);
  efcUiFocusBack(root, mark);
}
function efcUirRenderLoot() {
  const root = $('efcLoot'), mark = efcUiFocusMark(root), c = efcUirCont(), items = (c && c.items) || [];
  EFC_UIR.sel = Math.min(Math.max(EFC_UIR.sel, 0), Math.max(items.length - 1, 0));
  $('efcLootTitle').textContent = efcUirName(c);
  $('efcLootName').textContent = items.length ? `Contents (${items.length})` : 'Contents';
  $('efcLootList').innerHTML = items.length ? items.map((it, i) => efcUiRow(it, { key: 'c-' + i, data: { take: i }, sel: i === EFC_UIR.sel, title: 'Take' })).join('') : '<p class="efc-none">Nothing left.</p>';
  $('efcLootAll').disabled = !items.length;
  const bag = (EFC.inv && EFC.inv.bag) || [];
  $('efcLootBag').innerHTML = bag.length ? bag.map((it, i) => efcUiRow(it, { key: 'b-' + i, data: { put: i }, title: 'Put in the container' })).join('') : '<p class="efc-none">The bag is empty.</p>';
  $('efcLootW').innerHTML = efcUiTotHtml(EFC.inv);
  efcUiFocusBack(root, mark);
}

/* ---------- Actions ---------- */
function efcUirChanged() { efcEmit('inv:changed'); efcUirRender(); }
function efcUirTake(i) { if (EFC_UIR.cid != null) { EFC_UIR.sel = i; efcCall('world:take', EFC_UIR.cid, i); efcUirRender(); } }
/* Take all: one item at a time (the host answers each request); an item that does not fit is skipped */
function efcUirTakeAll() {
  if (EFC_UIR.cid == null || EFC_UIR.all) return;
  const A = EFC_UIR.all = { skip: 0, n: -1, t: 0 };
  const step = () => {
    if (EFC_UIR.all !== A || EFC_UIR.panel !== 'loot') return;
    const c = efcUirCont(), items = (c && c.items) || [];
    if (A.n >= 0 && items.length >= A.n) A.skip++; // the last request did not take anything
    if (A.skip >= items.length) { EFC_UIR.all = null; efcUirRender(); return; }
    A.n = items.length; efcUirTake(A.skip);
    A.t = setTimeout(step, 150);
  };
  step();
}
function efcUirPut(i) {
  if (!EFC.inv || EFC_UIR.cid == null) return;
  const it = EFC.inv.bag[i]; if (!it) return;
  const out = efcCall('inv:remove', EFC.inv, i, it.n || 1); if (!out) return;
  efcCall('world:put', EFC_UIR.cid, out); efcUirChanged();
}
function efcUirInvAct(act, ds) {
  const inv = EFC.inv; if (!inv) return;
  if (ds.slot !== undefined) {
    const s = ds.slot, it = inv.slots[s]; if (!it) return;
    if (act === 'unequip') efcCall('inv:unequip', inv, s);
    else if (act === 'drop') { inv.slots[s] = null; efcCall('world:put', null, it); }
    else return;
  } else if (ds.bag !== undefined) {
    const i = +ds.bag, it = inv.bag[i]; if (!it) return;
    if (act === 'equip') efcCall('inv:equip', inv, i);
    else if (act === 'use') efcCall('med:use', i);
    else if (act === 'drop') { const out = efcCall('inv:remove', inv, i, it.n || 1); if (out) efcCall('world:put', null, out); }
    else return;
  }
  efcUirChanged();
}
function efcUirClick(e) {
  const b = e.target.closest && e.target.closest('button'); if (!b || b.disabled || !EFC_UIR.panel) return;
  const ds = b.dataset;
  if (b.id === 'efcLootAll') efcUirTakeAll();
  else if (ds.take !== undefined) efcUirTake(+ds.take);
  else if (ds.put !== undefined) efcUirPut(+ds.put);
  else if (EFC_UIR.panel === 'inv') {
    const k = ds.bag !== undefined && efcUirBagKind(+ds.bag);
    efcUirInvAct(ds.act || (ds.slot !== undefined ? 'unequip' : k === 'med' ? 'use' : EFC_UI_EQUIP[k] ? 'equip' : 'drop'), ds);
  }
}
function efcUirBagKind(i) { const it = EFC.inv && EFC.inv.bag[i]; return it ? efcUiDef(it.id).kind : ''; }

/* ---------- Search prompt, hold, heal (every raid logic step) ---------- */
function efcUirPrompt(text, p) {
  const el = $('efcPrompt'); el.classList.toggle('show', !!text);
  if (text) { $('efcPromptT').innerHTML = text; $('efcPromptBar').style.transform = `scaleX(${p || 0})`; el.querySelector('.efc-pbar').style.display = p == null ? 'none' : ''; }
}
function efcUirHoldStart() {
  const c = EFC_UIR.near; if (!c) return;
  EFC_UIR.hold = { id: c.id, t: 0, need: (EFC.cfg.searchTime && EFC.cfg.searchTime[c.kind]) || 2 };
  efcUirTick(0);
}
function efcUirTick(dt) {
  if (!EFC_UIR.on || typeof PL === 'undefined') return;
  const me = PL.ent;
  if (!me.alive || MATCH.state === 'menu') { efcUirClose(true); EFC_UIR.hold = null; EFC_UIR.near = null; efcUirPrompt(''); efcUirHeal(); return; }
  if (EFC_UIR.panel === 'loot') { const c = efcUirCont(); if (!c || efcUirDist(c) > EFC.cfg.interactR + 1) efcUirClose(); }
  const near = EFC_UIR.panel ? null : efcCall('world:near', { x: me.pos.x, y: me.pos.y, z: me.pos.z }, EFC.cfg.interactR) || null;
  EFC_UIR.near = near;
  const H = EFC_UIR.hold;
  if (H && (!near || near.id !== H.id)) EFC_UIR.hold = null; // moved away: cancelled
  else if (H) { H.t += dt || 0; if (H.t >= H.need) { EFC_UIR.hold = null; efcUirOpen('loot', H.id); } }
  if (EFC_UIR.panel || !near) efcUirPrompt('');
  else if (EFC_UIR.hold) efcUirPrompt(`<b>F</b>Searching ${esc(efcUirName(near))}`, EFC_UIR.hold.t / EFC_UIR.hold.need);
  else efcUirPrompt(`<b>F</b>Search ${esc(efcUirName(near))}`);
  efcUirHeal();
}
/* Heal progress from med:state: null when idle, else { name, t (seconds used), time (seconds needed) } or { p } (0 to 1) */
function efcUirHeal() {
  const s = EFC_UIR.on ? efcCall('med:state') : null, el = $('efcHeal');
  const on = !!s && s.active !== false && (s.p != null || s.time > 0);
  el.classList.toggle('show', on);
  if (!on) return;
  const p = s.p != null ? s.p : s.t / s.time;
  $('efcHealT').textContent = s.name ? `Using ${s.name}` : 'Healing';
  $('efcHealBar').style.transform = `scaleX(${Math.min(Math.max(p, 0), 1)})`;
}

/* ---------- Input guards ---------- */
function efcUirKey(e) {
  if (!EFC_UIR.on || CHAT.open || (MATCH.state !== 'playing' && MATCH.state !== 'killcam')) return;
  const down = e.type === 'keydown', c = e.code, stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
  if (EFC_UIR.panel) {
    const root = $(EFC_UIR.panel === 'loot' ? 'efcLoot' : 'efcInv');
    if (c === 'Tab' || c === 'Escape') { stop(); if (down && !e.repeat) efcUirClose(); return; }
    if (c.startsWith('Arrow')) { stop(); if (down) efcUiNav(root, c); return; }
    if (c === 'KeyF') {
      stop(); if (!down || e.repeat || EFC_UIR.panel !== 'loot') return;
      const a = document.activeElement, t = a && a.dataset && a.dataset.take !== undefined ? +a.dataset.take : EFC_UIR.sel;
      efcUirTake(t); return;
    }
    if (c === 'Enter' || c === 'NumpadEnter') { stop(); if (down && !e.repeat && root.contains(document.activeElement)) document.activeElement.click(); return; }
    if (EFC_UIR_MOVE.has(keyCanon(c)) && pointerActive()) return; // walking stays possible when the engine reads the keys
    e.stopImmediatePropagation(); return;
  }
  if (MATCH.state !== 'playing' || !PL.ent.alive) return;
  if (c === 'Tab') { stop(); if (down && !e.repeat) efcUirOpen('inv'); return; }
  if (c === 'KeyF' && (EFC_UIR.near || EFC_UIR.hold)) { stop(); if (down && !e.repeat) efcUirHoldStart(); else if (!down) EFC_UIR.hold = null; }
}
addEventListener('keydown', efcUirKey, true);
addEventListener('keyup', efcUirKey, true);
// mouse: no look, fire, aim or weapon change while a panel or the summary is open (clicks on the panel still work)
for (const ev of ['mousedown', 'mousemove', 'wheel']) addEventListener(ev, (e) => { if (EFC_UIR.panel || efcUiOverlayOpen()) e.stopImmediatePropagation(); }, { capture: true, passive: true });
// lost pointer lock while a panel or the summary is open: not a pause
document.addEventListener('pointerlockchange', (e) => { if (document.pointerLockElement !== canvas && (EFC_UIR.panel || efcUiOverlayOpen())) e.stopImmediatePropagation(); }, true);

/* ---------- Events ---------- */
efcOn('raid:begin', () => { efcUirClose(true); EFC_UIR.on = true; EFC_UIR.hold = null; EFC_UIR.near = null; });
efcOn('raid:over', () => { efcUirClose(true); EFC_UIR.on = false; EFC_UIR.hold = null; EFC_UIR.near = null; efcUirPrompt(''); efcUirHeal(); });
efcOn('tick', efcUirTick);
efcOn('died', (v) => { if (typeof PL !== 'undefined' && v === PL.ent) { efcUirClose(true); EFC_UIR.hold = null; efcUirPrompt(''); } });
efcOn('inv:changed', () => { if (EFC_UIR.panel) efcUirRender(); });
efcOn('world:changed', (id) => { if (EFC_UIR.panel === 'loot' && (id == null || id === EFC_UIR.cid)) efcUirRender(); });
efcOn('ui:init', () => {
  $('efcInv').addEventListener('click', efcUirClick); $('efcLoot').addEventListener('click', efcUirClick);
  $('efcLootList').addEventListener('focusin', (e) => { const b = e.target.closest('[data-take]'); if (b) { EFC_UIR.sel = +b.dataset.take; for (const x of $('efcLootList').querySelectorAll('.efc-it')) x.classList.toggle('sel', x === b); } });
});
// back in the menus (match quit from the pause): nothing of the raid stays on screen
efcOn('ui:screen', () => { if (MATCH.state === 'menu') { efcUirClose(true); EFC_UIR.on = false; efcUirPrompt(''); efcUirHeal(); } });
