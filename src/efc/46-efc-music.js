/* Escape From Claudov music (P5): seamless streamed loops, the raid beds that rotate with long gaps of plain ambience, stings on raid
   events, and the Claudov harbour layer (chains, rigging, buoy bell) laid into the map ambience by src/05c-ambiance.js.
   Files: assets/music/*.ogg, shipped by build.py as dist/music/<name>.<hash>.ogg; their addresses are in <meta name="efc-music">.
   Raid music goes through the engine's ducked mix bus (AU.bus: master volume, ducking under gunfire) at Settings.music; with music
   volume 0 nothing is started. A missing file or table leaves the game silent. Credits: assets/music/credits.json. */
const EFC_MUSIC = {
  beds: ['bed-drone', 'bed-machines', 'bed-wastelands'],
  stings: { start: 'sting-extract-start', out: 'sting-extracted', dead: 'sting-killed', late: 'sting-late-extract' },
  firstAt: [20, 45], // game seconds after insertion before the first bed
  play: [150, 300], // seconds a bed plays before fading out
  gap: [90, 240], // seconds of plain ambience between two beds
  bedGain: 0.5, stingGain: 0.75, stingDuck: 0.35, // bed level is multiplied by stingDuck while a sting plays
  fadeIn: 8, fadeOut: 10, endFade: 3, xf: 1.5, // seconds; xf: crossfade at the loop point of a streamed loop
  harbour: { chain: [25, 60], rigging: [18, 40], bell: [30, 70] }, // seconds between two of each harbour sound on Claudov
};
const EFCM = { urls: null, live: false, t: 0, next: -1, bed: null, bedId: '', bedEnd: 0, order: [], idx: 0, out: null, duck: 1, duckT: 0,
  hold: false, holdT: -99, open: {}, played: {}, stingEls: {}, calls: [], hb: null };

/* The { name: address } table from the page; tests replace it with efcMusicSetUrls */
function efcMusicUrls() {
  if (EFCM.urls) return EFCM.urls;
  let u = {};
  try { const m = document.querySelector('meta[name="efc-music"]'); if (m && m.content) u = JSON.parse(m.content) || {}; } catch (e) { u = {}; }
  EFCM.urls = u; return u;
}
function efcMusicSetUrls(u) { EFCM.urls = u || {}; }
function efcMusicUrl(id) { return efcMusicUrls()[id] || ''; }
function efcMusicLevel() { return typeof Settings === 'undefined' ? 0 : clamp(Settings.music, 0, 1); }
function efcMusicLog(what, id, extra) { EFCM.calls.push(Object.assign({ what, id, t: Math.round(EFCM.t * 10) / 10 }, extra || {})); if (EFCM.calls.length > 200) EFCM.calls.shift(); }

/* ---------- Streamed seamless loop ----------
   Two <audio> elements of the same file; shortly before the end of one, the other starts at 0 and they crossfade over EFC_MUSIC.xf s,
   so the loop point never has the gap an <audio loop> leaves (that gap clicks). dest: a Web Audio node to route through (the levels are
   then on L.g), or null to set element volumes directly (menus, before the audio graph exists). L.vol is the level, set by the owner. */
function efcLoopNew(url, dest) {
  const L = { url, els: [], cur: 0, vol: 0, playing: false, dead: !url, pending: false, blocked: false, g: null, xfT: -1 };
  if (L.dead) return L;
  for (let i = 0; i < 2; i++) {
    const a = new Audio(); a.preload = i ? 'none' : 'auto'; a.volume = 0; a.src = url;
    a.addEventListener('error', () => { L.dead = true; });
    L.els.push(a);
  }
  if (dest && typeof AU !== 'undefined' && AU.ctx) {
    try {
      L.g = AU.ctx.createGain(); L.g.gain.value = 0; L.g.connect(dest);
      for (const a of L.els) AU.ctx.createMediaElementSource(a).connect(L.g);
    } catch (e) { L.g = null; }
  }
  return L;
}
function efcLoopPlay(L) {
  if (!L || L.dead || L.pending || L.blocked) return;
  const a = L.els[L.cur]; if (!a.paused) { L.playing = true; return; }
  L.pending = true; L.playing = true;
  let p; try { p = a.play(); } catch (e) { p = null; }
  if (p && p.then) p.then(() => { L.pending = false; }, (e) => { L.pending = false; if (e && e.name === 'NotAllowedError') L.blocked = true; else L.dead = true; });
  else L.pending = false;
}
function efcLoopPause(L) { if (!L) return; L.playing = false; L.xfT = -1; for (const a of L.els) if (!a.paused) a.pause(); }
function efcLoopRewind(L) { if (!L) return; efcLoopPause(L); L.cur = 0; for (const a of L.els) { try { a.currentTime = 0; } catch (e) { /* not ready */ } } }
function efcLoopStop(L) { if (!L) return; efcLoopPause(L); if (L.g) setTimeout(() => { try { L.g.disconnect(); } catch (e) { /* gone */ } }, 50); for (const a of L.els) a.removeAttribute('src'); L.dead = true; }
/* Every frame or logic step: levels and the crossfade at the loop point */
function efcLoopTick(L) {
  if (!L || L.dead || !L.playing) return;
  const A = L.els[L.cur], B = L.els[1 - L.cur], d = A.duration, xf = EFC_MUSIC.xf;
  if (L.xfT < 0 && d > xf * 4 && A.currentTime > d - xf) {
    L.xfT = 0; try { B.currentTime = 0; } catch (e) { /* not ready */ }
    const p = B.play(); if (p && p.catch) p.catch(() => { /* retried at the next loop */ });
  }
  let wA = 1, wB = 0;
  if (L.xfT >= 0) {
    const k = clamp((A.currentTime - (d - xf)) / xf, 0, 1);
    wA = Math.cos(k * Math.PI / 2); wB = Math.sin(k * Math.PI / 2); // equal power
    if (A.ended || k >= 1) { A.pause(); L.cur = 1 - L.cur; L.xfT = -1; wA = 0; wB = 1; }
  }
  const v = L.g ? 1 : clamp(L.vol, 0, 1);
  if (L.g) L.g.gain.value = clamp(L.vol, 0, 1);
  A.volume = clamp(v * wA, 0, 1); B.volume = clamp(v * wB, 0, 1);
}

/* ---------- Raid beds ---------- */
function efcMusicOut() {
  if (EFCM.out || typeof AU === 'undefined' || !AU.ctx || !AU.bus) return EFCM.out;
  EFCM.out = AU.ctx.createGain(); EFCM.out.gain.value = 1; EFCM.out.connect(AU.bus);
  return EFCM.out;
}
function efcMusicShuffle() {
  const o = EFC_MUSIC.beds.filter((id) => efcMusicUrl(id));
  for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
  if (o.length > 1 && o[0] === EFCM.bedId) o.push(o.shift()); // never the same bed twice in a row
  EFCM.order = o; EFCM.idx = 0;
}
function efcMusicBedStart() {
  if (EFCM.idx >= EFCM.order.length) efcMusicShuffle();
  const id = EFCM.order[EFCM.idx++]; if (!id) return false;
  if (efcMusicLevel() <= 0) { efcMusicLog('skip', id, { why: 'music volume 0' }); return false; }
  efcMusicBedStop(0);
  EFCM.bed = efcLoopNew(efcMusicUrl(id), efcMusicOut()); EFCM.bedId = id; EFCM.bed.fade = 0;
  EFCM.bedEnd = EFCM.t + rand(EFC_MUSIC.play[0], EFC_MUSIC.play[1]);
  efcLoopPlay(EFCM.bed); efcMusicLog('bed', id);
  return true;
}
function efcMusicBedStop(fade) {
  const B = EFCM.bed; if (!B) return;
  EFCM.bed = null; efcMusicLog('bedStop', EFCM.bedId);
  if (!fade || B.dead || !B.playing) { efcLoopStop(B); return; }
  // fade out on a timer: the raid may already be over, so the logic steps stop
  const t0 = performance.now(), v0 = B.vol;
  const step = () => { const k = (performance.now() - t0) / (fade * 1000); B.vol = v0 * Math.max(0, 1 - k); efcLoopTick(B); if (k < 1) setTimeout(step, 50); else efcLoopStop(B); };
  step();
}
function efcMusicBegin() {
  efcMusicEnd(true);
  EFCM.live = true; EFCM.t = 0; EFCM.hold = false; EFCM.holdT = -99; EFCM.open = {}; EFCM.played = {}; EFCM.duck = 1;
  EFCM.next = rand(EFC_MUSIC.firstAt[0], EFC_MUSIC.firstAt[1]);
  const st = efcCall('raid:state'); if (st && st.extracts) for (const x of st.extracts) EFCM.open[x.id] = !!x.open;
  efcMusicShuffle();
  if (efcMusicLevel() > 0) for (const k in EFC_MUSIC.stings) efcMusicStingEl(EFC_MUSIC.stings[k]); // preload the stings (small)
}
function efcMusicEnd(now) {
  EFCM.live = false; EFCM.next = -1;
  efcMusicBedStop(now ? 0 : EFC_MUSIC.endFade);
}
/* Each live raid logic step */
function efcMusicTick(dt) {
  if (!EFCM.live) return;
  EFCM.t += dt;
  const lvl = efcMusicLevel();
  // stings on the state of the raid: extraction started (entering an open extract), a late extract opening
  const st = efcCall('raid:state');
  if (st) {
    const holding = st.hold > 0;
    if (holding && !EFCM.hold && EFCM.t - EFCM.holdT > 20) { EFCM.holdT = EFCM.t; efcMusicSting('start'); }
    EFCM.hold = holding;
    for (const x of st.extracts || []) {
      if (x.open && EFCM.open[x.id] === false && x.openAt > 0) efcMusicSting('late', x.name);
      EFCM.open[x.id] = !!x.open;
    }
  }
  // bed rotation: bed for EFC_MUSIC.play s, then plain ambience for EFC_MUSIC.gap s
  if (!EFCM.bed && EFCM.next >= 0 && EFCM.t >= EFCM.next) {
    EFCM.next = -1;
    if (!efcMusicBedStart()) EFCM.next = EFCM.t + 30; // music off or nothing to play: look again later
  }
  const B = EFCM.bed;
  if (B) {
    if (B.dead) { EFCM.bed = null; EFCM.next = EFCM.t + rand(EFC_MUSIC.gap[0], EFC_MUSIC.gap[1]); return; }
    const ending = EFCM.t >= EFCM.bedEnd;
    B.fade = clamp(B.fade + dt / (ending ? -EFC_MUSIC.fadeOut : EFC_MUSIC.fadeIn), 0, 1);
    if (EFCM.duckT > 0) EFCM.duckT -= dt;
    EFCM.duck += ((EFCM.duckT > 0 ? EFC_MUSIC.stingDuck : 1) - EFCM.duck) * Math.min(1, dt * 2);
    B.vol = EFC_MUSIC.bedGain * lvl * B.fade * B.fade * EFCM.duck;
    efcLoopTick(B);
    if (ending && B.fade <= 0) { efcMusicBedStop(0); EFCM.next = EFCM.t + rand(EFC_MUSIC.gap[0], EFC_MUSIC.gap[1]); }
  }
}

/* ---------- Stings ---------- */
function efcMusicStingEl(id) {
  if (EFCM.stingEls[id] !== undefined) return EFCM.stingEls[id];
  const url = efcMusicUrl(id); if (!url) return (EFCM.stingEls[id] = null);
  const a = new Audio(); a.preload = 'auto'; a.src = url; a.volume = 0;
  const S = { a, g: null, dead: false };
  a.addEventListener('error', () => { S.dead = true; });
  if (typeof AU !== 'undefined' && AU.ctx && efcMusicOut()) {
    try { S.g = AU.ctx.createGain(); S.g.gain.value = 0; S.g.connect(EFCM.out); AU.ctx.createMediaElementSource(a).connect(S.g); } catch (e) { S.g = null; }
  }
  return (EFCM.stingEls[id] = S);
}
/* kind: 'start' | 'out' | 'dead' | 'late'; once per raid for 'out', 'dead' and each late extract */
function efcMusicSting(kind, tag) {
  const key = kind + (tag || '');
  if (kind !== 'start') { if (EFCM.played[key]) return; EFCM.played[key] = true; }
  const id = EFC_MUSIC.stings[kind], lvl = efcMusicLevel();
  if (!id || lvl <= 0) { efcMusicLog('skip', id || kind, { why: lvl <= 0 ? 'music volume 0' : 'unknown sting' }); return; }
  const S = efcMusicStingEl(id); if (!S || S.dead) { efcMusicLog('skip', id, { why: 'missing file' }); return; }
  const v = EFC_MUSIC.stingGain * lvl;
  if (S.g) { S.g.gain.value = v; S.a.volume = 1; } else S.a.volume = clamp(v, 0, 1);
  try { S.a.currentTime = 0; } catch (e) { /* not ready: plays from the start anyway */ }
  const p = S.a.play(); if (p && p.catch) p.catch(() => { /* refused before a gesture: silent */ });
  EFCM.duckT = 8; efcMusicLog('sting', id, { kind });
}

/* ---------- Claudov harbour layer (called from ambStart, ambStop and ambTick in src/05c-ambiance.js) ----------
   Low, distant, spatialised: chains against hulls (our own files), wind in the rigging and a buoy bell (takes already in the map's
   amb_embruns pack that the map definition does not schedule). Ambience level: it follows the effects mix, not the music volume. */
function efcHarbourStart(out) {
  efcHarbourStop();
  if (typeof CURMAP === 'undefined' || CURMAP.id !== 'claudov' || !AU.ctx || !out) return;
  const H = EFCM.hb = { out, chains: [], next: { chain: rand(8, 20), rigging: rand(5, 15), bell: rand(10, 30) } };
  for (const id of ['amb-chain-1', 'amb-chain-2']) {
    const url = efcMusicUrl(id); if (!url) continue;
    // one streamed element per take, routed once through its own distance filter, panner and gain into the ambience output
    const ctx = AU.ctx, a = new Audio(); a.preload = 'auto'; a.src = url;
    const C = { a, dead: false, lp: ctx.createBiquadFilter(), pan: ctx.createPanner(), g: ctx.createGain() };
    a.addEventListener('error', () => { C.dead = true; });
    C.lp.type = 'lowpass'; C.pan.panningModel = 'equalpower'; C.pan.distanceModel = 'inverse'; C.pan.refDistance = 6; C.pan.maxDistance = 400;
    try { ctx.createMediaElementSource(a).connect(C.lp); } catch (e) { continue; }
    C.lp.connect(C.pan); C.pan.connect(C.g); C.g.connect(out);
    if (AU.verb) { C.v = ctx.createGain(); C.v.gain.value = 0.3; C.g.connect(C.v); C.v.connect(AU.verb); }
    H.chains.push(C);
  }
}
function efcHarbourStop() {
  const H = EFCM.hb; EFCM.hb = null; if (!H) return;
  for (const C of H.chains) { C.a.pause(); C.a.removeAttribute('src'); setTimeout(() => { for (const n of [C.g, C.v]) if (n) n.disconnect(); }, 1500); }
}
function efcHarbourTick(dt) {
  const H = EFCM.hb; if (!H || typeof MATCH === 'undefined' || MATCH.state !== 'playing') return;
  const ins = AU.inside || 0, R = EFC_MUSIC.harbour, quay = () => new V3(rand(-75, -55), rand(-0.5, 2), rand(-70, 70));
  for (const k in H.next) {
    if ((H.next[k] -= dt) > 0) continue;
    H.next[k] = rand(R[k][0], R[k][1]);
    if (k === 'chain') {
      const free = H.chains.filter((C) => !C.dead && C.a.paused);
      if (free.length) efcHarbourOne(free[Math.floor(Math.random() * free.length)], quay(), 0.22 * (1 - 0.6 * ins));
      continue;
    }
    const id = k === 'bell' ? 'a_buoybell' : 'a_rigging';
    if (!sfxHas(id)) continue;
    const p = k === 'bell' ? new V3(rand(-200, -120), 0, rand(-120, 120)) : new V3(rand(-70, -58), rand(4, 12), rand(-60, 60));
    sfxEmitter(id, p, { gain: (k === 'bell' ? 0.25 : 0.18) * (1 - 0.6 * ins), ref: k === 'bell' ? 25 : 6, roll: 1, max: 400, air: 120, dest: H.out, verb: 0.3, rate: rand(0.94, 1.04) });
    efcMusicLog('harbour', id);
  }
}
function efcHarbourOne(C, p, gain) {
  C.lp.frequency.value = clamp(9000 - p.distanceTo(camera.position) * 60, 1500, 9000);
  const P = C.pan;
  if (P.positionX) { P.positionX.value = p.x; P.positionY.value = p.y; P.positionZ.value = p.z; } else P.setPosition(p.x, p.y, p.z);
  C.g.gain.value = gain; C.a.playbackRate = rand(0.85, 1.0);
  try { C.a.currentTime = 0; } catch (e) { /* not ready */ }
  const pr = C.a.play(); if (pr && pr.catch) pr.catch(() => { /* refused: skipped */ });
  efcMusicLog('harbour', 'chain');
}

/* ---------- Wiring ---------- */
efcOn('raid:begin', () => efcMusicBegin());
efcOn('tick', (dt) => efcMusicTick(dt));
efcOn('died', (victim) => { if (EFCM.live && typeof PL !== 'undefined' && victim === PL.ent) { efcMusicSting('dead'); efcMusicEnd(false); } });
efcOn('raid:over', (s) => {
  if (s && s.result === 'extracted') efcMusicSting('out');
  else if (s && s.result === 'dead') efcMusicSting('dead');
  efcMusicEnd(false);
});
efcOn('match:left', () => efcMusicEnd(true));
/* For the bench radio (src/efc/55-efc-bench*.js): what the menu theme is, and a switch for it (see src/09g-music.js) */
efcProvide('music:nowPlaying', () => ({ id: efcMenuTrack(), ...EFC_MENU_TRACKS[efcMenuTrack()], on: typeof MUS === 'undefined' || !MUS.off }));
efcProvide('music:menu', (on) => { if (typeof MUS !== 'undefined') MUS.off = !on; return !MUS.off; });
efcProvide('music:calls', () => EFCM.calls.slice());
