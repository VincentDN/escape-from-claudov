/* Raid HUD: hides the team score (keeps the timer), lists the extracts (name, distance, open or closed), the extraction progress bar,
   the squad (alive, out, dead) and the end-of-raid line. Also the minimal built-in summary shown when nothing listens to 'raid:over'.
   DOM built here with an injected <style>; shell.html is not touched. */
const EFC_HUD = { el: null, ext: null, bar: null, barF: null, barT: null, sq: null, msg: null, t: 0, sum: null };

function efcRaidHudBuild() {
  if (EFC_HUD.el) return;
  const st = document.createElement('style');
  st.id = 'efcRaidStyle';
  st.textContent = `
#hud.efc-raid .score .row, #hud.efc-raid #scLim, #hud.efc-raid #domRow { display: none; }
#efcRaidHud { position: absolute; right: calc(18 * var(--hu, 1px)); top: calc(110 * var(--hu, 1px)); font: 600 calc(14 * var(--hu, 1px))/1.35 var(--hud, sans-serif);
  color: var(--paper, #eee); text-shadow: 0 1px 2px rgba(0,0,0,.8); text-align: right; pointer-events: none; letter-spacing: .03em; }
#efcRaidHud .efc-h { font-size: .8em; opacity: .7; text-transform: uppercase; margin-top: .5em; }
#efcRaidHud .efc-x.open b { color: var(--ally, #8fd06b); } #efcRaidHud .efc-x.closed { opacity: .55; }
#efcRaidHud .efc-sq.dead { opacity: .5; text-decoration: line-through; } #efcRaidHud .efc-sq.out { color: var(--ally, #8fd06b); }
#efcRaidBar { position: absolute; left: 50%; top: 62%; transform: translateX(-50%); width: calc(260 * var(--hu, 1px)); display: none; pointer-events: none;
  font: 700 calc(16 * var(--hu, 1px))/1.2 var(--hud, sans-serif); color: var(--paper, #eee); text-align: center; text-shadow: 0 1px 2px rgba(0,0,0,.8); }
#efcRaidBar.show { display: block; } #efcRaidBar div { height: 6px; background: rgba(0,0,0,.5); margin-top: 4px; }
#efcRaidBar i { display: block; height: 100%; background: var(--ally, #8fd06b); transform-origin: left; }
#efcRaidMsg { position: absolute; left: 50%; top: 35%; transform: translateX(-50%); font: 700 calc(30 * var(--hu, 1px))/1.2 var(--hud, sans-serif);
  color: var(--paper, #eee); text-shadow: 0 2px 4px rgba(0,0,0,.8); pointer-events: none; text-transform: uppercase; text-align: center; }
#efcRaidSum { position: fixed; inset: 0; z-index: 100000; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,.72);
  font: 600 16px/1.4 sans-serif; color: #eee; }
#efcRaidSum .box { background: #1d1f1c; padding: 24px 32px; min-width: 280px; box-shadow: 0 8px 30px rgba(0,0,0,.6); }
#efcRaidSum h2 { margin: 0 0 12px; font-size: 26px; text-transform: uppercase; } #efcRaidSum button { margin-top: 16px; font: inherit; padding: 8px 22px; cursor: pointer; }`;
  document.head.appendChild(st);
  const hud = $('hud'), mk = (id, html) => { const d = document.createElement('div'); d.id = id; d.innerHTML = html || ''; hud.appendChild(d); return d; };
  EFC_HUD.el = mk('efcRaidHud', '<div class="efc-h">Extracts</div><div class="efc-ext"></div><div class="efc-h">Squad</div><div class="efc-sqs"></div>');
  EFC_HUD.ext = EFC_HUD.el.querySelector('.efc-ext'); EFC_HUD.sq = EFC_HUD.el.querySelector('.efc-sqs');
  EFC_HUD.bar = mk('efcRaidBar', '<span></span><div><i></i></div>');
  EFC_HUD.barT = EFC_HUD.bar.firstChild; EFC_HUD.barF = EFC_HUD.bar.querySelector('i');
  EFC_HUD.msg = mk('efcRaidMsg');
}
function efcRaidHudShow() {
  efcRaidHudBuild();
  $('hud').classList.add('efc-raid');
  for (const k of ['el', 'bar', 'msg']) EFC_HUD[k].style.display = '';
  EFC_HUD.t = 0; efcRaidHudUpdate(1);
}
function efcRaidHudHide() {
  const h = $('hud'); if (h) h.classList.remove('efc-raid');
  for (const k of ['el', 'bar', 'msg']) if (EFC_HUD[k]) EFC_HUD[k].style.display = 'none';
}
const efcFmtM = (m) => (m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(1) + ' km');
function efcRaidHudUpdate(dt) {
  if (!EFC_HUD.el || (EFC_HUD.t -= dt) > 0) return;
  EFC_HUD.t = 0.1;
  const S = efcCall('raid:state'); if (!S) return;
  hudHtml(EFC_HUD.ext, S.extracts.map((x) => `<div class="efc-x ${x.open ? 'open' : 'closed'}">${esc(x.name)} · ${efcFmtM(x.d)} · <b>${x.open ? 'open' : 'opens in ' + fmtTime(x.openAt - S.t)}</b></div>`).join('') || '<div>none</div>');
  const sq = efcSquadOf(PL.ent), you = MATCH.online && NET.nick ? NET.nick : 'You';
  hudHtml(EFC_HUD.sq, efcSquadMembers(sq).map((e) => {
    const s = e.out ? 'out' : e.alive ? 'alive' : 'dead';
    return `<div class="efc-sq ${s}">${esc(e.isPlayer ? you : e.name)} · ${s}</div>`;
  }).join(''));
  const holding = S.state === 'live' && S.holdId;
  hudCls(EFC_HUD.bar, 'show', !!holding);
  if (holding) {
    hudText(EFC_HUD.barT, `Extracting ${Math.max(0, EFC.cfg.extractHold - S.hold).toFixed(1)} s`);
    hudStyle(EFC_HUD.barF, 'transform', `scaleX(${Math.min(1, S.hold / EFC.cfg.extractHold).toFixed(3)})`);
  }
  hudText(EFC_HUD.msg, S.state === 'dead' ? (PL.efcKiller ? 'Killed by ' + PL.efcKiller : 'Killed') : S.state === 'out' ? 'Extracted' : S.state === 'mia' ? 'Missing in action' : '');
}
efcOn('raid:begin', efcRaidHudShow);
efcOn('tick', efcRaidHudUpdate);

/* Built-in summary when no package listens to 'raid:over': result, kills, time, items and value, and a Leave button */
function efcRaidFallbackSummary(s) {
  efcRaidSummaryClose();
  const title = { extracted: 'Extracted', dead: 'Killed in action', mia: 'Missing in action' }[s.result] || s.result;
  const d = document.createElement('div'); d.id = 'efcRaidSum';
  d.innerHTML = `<div class="box"><h2>${esc(title)}</h2><div>${s.extract ? 'Extract: ' + esc(s.extract) + '<br>' : ''}Kills: ${s.kills}<br>Time in raid: ${fmtTime(s.time)}<br>`
    + `Items kept: ${s.items.length} · value ${s.value}</div><button type="button">Leave</button></div>`;
  d.querySelector('button').addEventListener('click', () => efcCall('raid:leave'));
  document.body.appendChild(d); EFC_HUD.sum = d;
  if (document.pointerLockElement) document.exitPointerLock();
}
function efcRaidSummaryClose() { if (EFC_HUD.sum) { EFC_HUD.sum.remove(); EFC_HUD.sum = null; } }
