/* Escape From Claudov sound audition page for the owner (package P2): open the built game as dist/index.html#sounds.
   Every audited event (docs/audio-events.md) with a button for the sound before P2 ("old") and the one now ("new"), per weapon
   family, through the game's own loader and mix. Inactive unless the address ends in #sounds. */
const EFC_AUD = {
  weapons: [['m4', 'Rifle (M4)'], ['ak47', 'Rifle (AK-47)'], ['mp5', 'SMG (MP5)'], ['m9', 'Pistol (M9)'], ['deagle', 'Pistol (Desert Eagle)'],
    ['l96', 'Sniper (L96, bolt)'], ['m82', 'Sniper (Barrett)'], ['m1014', 'Shotgun (M1014)']],
  // [label, engine sfxMech kind, EFC_HANDLING key or a function of the family]
  handling: [['Magazine out', 'magout', 'magout'], ['Magazine in', 'magin', 'magin'], ['Magazine slap', 'slap', 'slap'],
    ['Charging handle / slide release / bolt forward', 'charge', (f) => (f === 'pistol' ? 'charge_pistol' : f === 'sniper' ? 'charge_sniper' : 'charge')],
    ['Bolt back', 'bolt', 'bolt'], ['Pump', 'pump', 'pump'], ['Shell insert', 'shell', 'shell'], ['Draw', 'draw', 'draw'],
    ['Holster (old: weapon switch had none; killstreak stow shown)', 'stow', 'stow'], ['Aim in', 'ads', 'ads_in'], ['Aim out', 'ads', 'ads_out'],
    ['Inspect (old: the draw sound)', 'draw', 'inspect'], ['Dry fire', 'empty', 'empty'], ['Weapon pickup', 'pickup', 'pickup']],
  inv: [['Open a container', 'inv_open'], ['Close it', 'inv_close'], ['Take an item', 'inv_take'], ['Equip', 'inv_equip'], ['Unequip', 'inv_unequip'],
    ['Drop', 'inv_drop'], ['Use a med item', 'inv_med']],
  wk: 'm4',
};
function efcAudFam(wk) { const W = typeof WEAPONS !== 'undefined' && WEAPONS[wk]; return W ? W.fam : 'rifle'; }
/* Runs fn with the P2 sounds off (old) or on (new) */
function efcAudWith(neu, fn) { const was = EFC_SND.on; EFC_SND.on = neu; try { fn(); } finally { EFC_SND.on = was; } }
function efcAudStart() {
  if (typeof initAudio !== 'function') return;
  initAudio(); sfxBootGame(); if (AU.ctx) sfxGate(true);
}
function efcAudHandling(neu, kind, key, wk, delay) {
  const fam = efcAudFam(wk), k = typeof key === 'function' ? key(fam) : key;
  if (!AU.ready) return;
  if (neu) {
    const bank = neu === 'recorded' && efcWeaponFoleyBank(k, fam, true);
    if (!bank && !efcHandlingReady(k)) return efcAudStatus('pack handling not loaded yet');
    efcHandlingLayers(k, auOut(null, 0.05, 1), AU.ctx.currentTime + (delay || 0), { rate: efcSndWeightRate(EFC_SND_KG[wk] || EFC_SND_FAM_KG[fam]), bank });
  } else efcAudWith(false, () => sfxMech(kind, delay || 0, null, fam));
}
/* A full reload of the selected weapon, events at their choreography times (the clock's allure is not applied: close, not exact) */
function efcAudReload(neu, empty) {
  const wk = EFC_AUD.wk, def = WEAPONS[wk]; if (!def || !AU.ready) return;
  const SND = { magout: ['magout'], insert: ['magin', 'slap'], slide: ['charge'], catch: ['charge'], boltsnd: ['bolt'], boltfwd: ['charge'], shellin: ['shell'], draw: ['draw'], pumpsnd: ['pump'] };
  let seq = [];
  if (def.tube) { const S = RELOAD.shotgun; let t0 = 0; for (const T of [S.shellStart, S.shell, S.shell, S.shellEnd]) { for (const e of T.ev) seq.push([t0 + e[0], e[1]]); t0 += T.dur; } }
  else { const R = RELOAD[def.rig || def.fam], T = R && (empty ? R.empty : R.norm); if (T) seq = T.ev.slice(); }
  if (def.bolt && !def.tube && !empty) for (const e of RELOAD.boltAction.ev) seq.push([e[0] + 3, e[1]]); // then one bolt cycle
  for (const [t, ev] of seq) for (const k of SND[ev] || []) {
    const row = EFC_AUD.handling.find((h) => h[1] === k);
    efcAudHandling(neu, k, row ? row[2] : k, wk, t + (k === 'slap' ? 0.05 : 0));
  }
}
function efcAudFire(neu, where) {
  if (!AU.ready) return;
  const def = WEAPONS[EFC_AUD.wk], kind = def ? def.sound : 'rifle';
  const pos = where === 'pov' ? null : camera.position.clone().add(new THREE.Vector3(where === 'near' ? 12 : 70, 0, 0));
  efcAudWith(neu, () => sfxGun(kind, pos, where === 'pov' ? null : EFC_AUD));
}
function efcAudCasing(neu, sf) { if (AU.ready) efcAudWith(neu, () => sfxCasing(sf, null, AU.ctx.currentTime)); }
function efcAudBank(id) {
  if (!AU.ready) return;
  if (!sfxHas(id)) return efcAudStatus(id + ' not loaded');
  sfxPlay(id, auOut(null, 0.05, 1), AU.ctx.currentTime, { gain: 0.6 });
}
function efcAudInv(key) {
  if (!AU.ready) return;
  if (!efcHandlingReady(key)) return efcAudStatus('pack handling not loaded yet');
  efcHandlingLayers(key, auOut(null, 0.02, 1), AU.ctx.currentTime, { rate: 1 });
}
function efcAudStatus(msg) {
  const el = document.getElementById('efcAudSt'); if (!el) return;
  const st = typeof SFX !== 'undefined' ? ['foley', 'armes', 'impacts', 'handling', 'ballistics', 'weapon_foley'].filter((k) => SFX_PACKS[k]).map((k) => k + ': ' + ((SFX.state.get(k) || {}).s || 'not started')).join(' | ') : '';
  el.textContent = (msg ? msg + ' | ' : '') + st;
}

function efcAudBtns(oldAct, newAct, recordedAct) {
  const b = (n, a) => (a ? `<button data-a="${a}">${n}</button>` : `<button disabled>${n === 'old' ? 'none' : n}</button>`);
  return `<td>${b('old', oldAct)}</td><td>${b('new', newAct)}</td>` + (recordedAct ? `<td>${b('Recorded Foley', recordedAct)}</td>` : '');
}
function efcAudHtml() {
  const fam = efcAudFam(EFC_AUD.wk), magazineFoley = ['rifle', 'smg', 'pistol', 'sniper'].includes(fam) && SFX_PACKS.weapon_foley;
  const row = (label, o, n, p) => `<tr><th>${label}</th>${efcAudBtns(o, n, p)}</tr>`;
  let h = '<h1>Escape From Claudov: sound audition</h1><p>Old: the sound before the polish pass. New: the Partisan takes. Press Start audio first; '
    + 'repeat a button to hear the other takes (random take, pitch and level, as in the game).</p>'
    + '<p><button data-a="start">Start audio</button> <span id="efcAudSt"></span></p><p>Weapon: '
    + EFC_AUD.weapons.map(([k, n]) => `<button data-w="${k}"${k === EFC_AUD.wk ? ' aria-pressed="true"' : ''}>${n}</button>`).join(' ') + '</p>';
  h += `<h2>Handling: ${EFC_AUD.weapons.find((w) => w[0] === EFC_AUD.wk)[1]} (family ${fam})</h2><table>`;
  EFC_AUD.handling.forEach(([label, , key], i) => { h += row(label, 'h0:' + i, 'h1:' + i, magazineFoley && ['magout', 'magin', 'slap'].includes(key) && 'h2:' + i); });
  h += row('Full reload', 'r0:0', 'r1:0', magazineFoley && 'r2:0') + row('Full reload from empty', 'r0:1', 'r1:1', magazineFoley && 'r2:1') + '</table>';
  h += '<h2>Firing: selected weapon</h2><table>' + row('First person' + (WEAPONS[EFC_AUD.wk] && WEAPONS[EFC_AUD.wk].sound === 'sniper' ? ' (replaced for the L96)' : ' (unchanged)'), 'f0:pov', 'f1:pov')
    + row('Near, 12 m (unchanged)', 'f0:near', 'f1:near') + row('Far, 70 m (unchanged)', 'f0:far', 'f1:far') + '</table>';
  h += '<h2>Casings landing (player)</h2><table>';
  for (const sf of ['concrete', 'wood', 'metal', 'dirt', 'sand']) h += row(sf, 'c0:' + sf, 'c1:' + sf);
  h += '</table><h2>Bullets</h2><table>' + row('Ricochet', 'b:i_ric', 'b:pt_ric') + row('Fly-by', 'b:i_whiz', 'b:pt_flyby') + '</table>';
  h += '<h2>Inventory and looting (old: no sound)</h2><table>';
  for (const [label, k] of EFC_AUD.inv) h += row(label, null, 'i:' + k);
  return h + '</table>';
}
function efcAudClick(e) {
  const b = e.target.closest && e.target.closest('button'); if (!b) return;
  if (b.dataset.w) { EFC_AUD.wk = b.dataset.w; efcAudRender(); return; }
  const a = b.dataset.a; if (!a) return;
  if (a === 'start') { efcAudStart(); efcAudStatus(); return; }
  if (!AU.ready) { efcAudStart(); }
  const [k, v] = a.split(':');
  if (k === 'h0' || k === 'h1' || k === 'h2') { const r = EFC_AUD.handling[+v]; efcAudHandling(k === 'h2' ? 'recorded' : k === 'h1', r[1], r[2], EFC_AUD.wk, 0); }
  else if (k === 'r0' || k === 'r1' || k === 'r2') efcAudReload(k === 'r2' ? 'recorded' : k === 'r1', v === '1');
  else if (k === 'f0' || k === 'f1') efcAudFire(k === 'f1', v);
  else if (k === 'c0' || k === 'c1') efcAudCasing(k === 'c1', v);
  else if (k === 'b') efcAudBank(v);
  else if (k === 'i') efcAudInv(v);
  efcAudStatus();
}
function efcAudRender() { const el = document.getElementById('efcAud'); if (el) { el.innerHTML = efcAudHtml(); efcAudStatus(); } }
function efcAudOpen() {
  if (document.getElementById('efcAud')) return;
  const el = document.createElement('div'); el.id = 'efcAud';
  el.style.cssText = 'position:fixed;inset:0;z-index:99999;overflow:auto;background:#111;color:#eee;font:14px/1.4 system-ui,sans-serif;padding:16px 24px';
  const css = document.createElement('style');
  css.textContent = '#efcAud table{border-collapse:collapse;margin-bottom:12px}#efcAud th{text-align:left;font-weight:normal;padding:2px 12px 2px 0;min-width:320px}'
    + '#efcAud button{font:inherit;padding:3px 10px;margin:1px;background:#2a2a2a;color:#eee;border:1px solid #555;border-radius:4px;cursor:pointer}'
    + '#efcAud button[aria-pressed=true]{background:#3c6;color:#000}#efcAud button:disabled{opacity:.4;cursor:default}#efcAud button:focus-visible{outline:2px solid #fc3}#efcAud h2{margin:18px 0 6px;font-size:16px}';
  document.head.appendChild(css); document.body.appendChild(el);
  el.addEventListener('click', efcAudClick);
  efcAudRender();
}
if (typeof location !== 'undefined' && location.hash === '#sounds' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', efcAudOpen); else setTimeout(efcAudOpen, 0);
}
