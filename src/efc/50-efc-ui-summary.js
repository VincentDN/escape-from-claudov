/* Escape From Claudov UI: the raid summary, shown on event raid:over(Summary). Result, raid time, kills, extract, the items brought out
   with their value. "Hideout" and "Raid again" call raid:leave, then open the right screen (the lobby after an online raid). */
const EFC_SUM = { s: null, online: false, map: null };
const EFC_SUM_TITLE = { extracted: 'Extracted', dead: 'Killed in action', mia: 'Missing in action' };

function efcSumShow(S) {
  S = S || { result: 'mia', kills: 0, time: 0, extract: '', items: [], value: 0 };
  EFC_SUM.s = S; EFC_SUM.online = !!MATCH.online; EFC_SUM.map = MATCH.online ? null : Settings.map;
  const res = EFC_SUM_TITLE[S.result] ? S.result : 'mia', el = $('efcSum');
  el.dataset.res = res;
  $('efcSumKick').textContent = `Raid over, ${mapById(MATCH.online && typeof NET !== 'undefined' && NET.cfg ? NET.cfg.map : Settings.map).name}`;
  $('efcSumTitle').textContent = EFC_SUM_TITLE[res];
  const st = (label, v) => `<div class="st"><span>${label}</span><b>${esc(v)}</b></div>`;
  $('efcSumStats').innerHTML = st('Raid time', fmtTime(S.time || 0)) + st('Kills', S.kills || 0) + (res === 'extracted' ? st('Extract', S.extract || 'Unknown') : '');
  const items = (res === 'extracted' && S.items) || [];
  $('efcSumItems').innerHTML = items.length ? `<p class="efc-gh">Brought out</p>` + items.map((it, i) => efcUiRow(it, { key: 'sum-' + i })).join('') : '';
  const total = S.value != null ? S.value : items.reduce((s, it) => s + efcUiItemV(it), 0);
  $('efcSumTot').innerHTML = items.length ? `<span>Total value <b>${efcUiVal(total)}</b></span>` : res === 'extracted' ? '<span>You came out with nothing.</span>' : '<span>Everything you carried is lost.</span>';
  $('efcSumAgain').textContent = EFC_SUM.online ? 'Back to the squad' : 'Raid again';
  for (const b of $('efcSumItems').querySelectorAll('button')) b.tabIndex = -1; // rows are a list to read, the keys move between the two buttons
  el.classList.remove('hidden');
  if (document.pointerLockElement) document.exitPointerLock();
  showLockPrompt(false);
  for (const k in KEYS) KEYS[k] = false;
  PL.held = false; PL.adsWant = false;
  requestAnimationFrame(() => $('efcSumAgain').focus({ preventScroll: true }));
}
function efcSumHide() { $('efcSum').classList.add('hidden'); EFC_SUM.s = null; }
/* to: 'hideout' or 'again' */
function efcSumLeave(to) {
  if (!EFC_SUM.s) return;
  const online = EFC_SUM.online, map = EFC_SUM.map;
  efcSumHide();
  efcCall('raid:leave');
  const lobby = online || netInLobby(), screen = to === 'hideout' ? 'hideout' : lobby ? 'multi' : 'raid';
  if (MATCH.state !== 'menu') toMenu(screen); else uiOpen(screen, ['main']);
  if (to === 'again' && !lobby) efcUiRaidLaunch(map);
}
function efcSumKey(e) {
  if (!EFC_SUM.s) return;
  const c = e.code, down = e.type === 'keydown';
  if (c === 'Enter' || c === 'NumpadEnter' || c === 'Space') { e.stopImmediatePropagation(); return; } // the focused button acts (browser default)
  if (c === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); if (down && !e.repeat) efcSumLeave('hideout'); return; }
  if (c.startsWith('Arrow')) { e.preventDefault(); e.stopImmediatePropagation(); if (down) efcUiNav($('efcSum'), c); return; }
  if (c !== 'Tab') e.stopImmediatePropagation(); // nothing reaches the soldier or the menus behind
}
addEventListener('keydown', efcSumKey, true);
addEventListener('keyup', efcSumKey, true);

efcOn('raid:over', (S) => efcSumShow(S));
efcOn('ui:init', () => {
  $('efcSumHide').addEventListener('click', () => efcSumLeave('hideout'));
  $('efcSumAgain').addEventListener('click', () => efcSumLeave('again'));
});
