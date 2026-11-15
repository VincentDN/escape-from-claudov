// P2b Warden pace test, raid on Claudov: ground speed per state over scripted runs (idle patrol leg, alert search, combat advance), each
// within 15 % of its number (combat: EFC.cfg.wardenCombatMul times the engine's speed, measured in the same run with the pace off), the step
// cadence scales with speed with the stance foot planted, an idle Warden turns its head first and its body slower, no Warden fires while
// its weapon comes up, and tdm speeds are the engine's. Optional contact sheet: SHEET=/tmp/warden-pace.png (one rendered frame).
// NODE_PATH=/opt/node22/lib/node_modules node tools/dev/efc/test-warden-pace.mjs
import { openGame, startSolo, simRun } from './harness.mjs';
const { browser, page, errors } = await openGame({ settings: { map: 'claudov', mode: 'raid' } });
const fails = [], ok = (cond, msg, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg + (info !== undefined ? ' ' + JSON.stringify(info) : '')); if (!cond) fails.push(msg); };
const near = (v, want, tol = 0.15) => Number.isFinite(v) && Math.abs(v - want) <= want * tol;
await page.evaluate(() => {
  window.T = { inv: true };
  const ad0 = applyDamage;
  applyDamage = function (v, ...r) { if (v.isPlayer && T.inv) return; return ad0(v, ...r); };
});
await startSolo(page);
// helpers in the page: parking spot out of sight, raise-fire monitor, speed and cadence sampler
await page.evaluate(() => {
  MATCH.timeLeft = 1e5;
  const P = EFC.wd.posts, eye = new V3(), at = new V3(); let best = -1, bd = -1;
  for (let id = 0; id < NAV.count; id += 3) {
    if (NAV.comp[id] !== NAV.mainComp) continue;
    const d = Math.min(...P.map((p) => hyp(NAV.nx[id] - p.x, NAV.nz[id] - p.z))); if (d <= bd) continue;
    eye.set(NAV.nx[id], NAV.ny[id] + 1.6, NAV.nz[id]);
    if (P.some((p) => hyp(NAV.nx[id] - p.x, NAV.nz[id] - p.z) < 120 && lineClear(eye, at.set(p.x, p.y + 1.6, p.z)))) continue;
    bd = d; best = id;
  }
  window.PARK = [NAV.nx[best], NAV.ny[best], NAV.nz[best]];
  window.HOLD = PARK;
  window.PM = { raiseFire: 0, shots: new Map() };
  window.MON = () => {
    const me = PL.ent; me.pos.set(...HOLD); me.vel.set(0, 0, 0); me.health = 100;
    for (const e of entities) {
      if (e.squad !== 'w' || e.isPlayer || !e.alive) continue;
      const s0 = PM.shots.has(e) ? PM.shots.get(e) : e.arms.shots;
      if (e.arms.shots > s0 && MATCH.time < e.efcRaiseT) PM.raiseFire++;
      PM.shots.set(e, e.arms.shots);
    }
  };
  window.REC = null;
  window.recStart = (W, want, keep) => { window.REC = { W, want, keep: keep || null, v: [], cyc: [], foot: [], prev: null }; };
  window.SAMPLE = () => {
    const R = REC; if (!R || !R.W.alive) return;
    const W = R.W, S = W.model, J = S.J, fl = J[J_FTL], fr = J[J_FTR];
    if (R.prev) {
      const dc = (((S.cyc - R.prev.c) % 1) + 1) % 1, low = fl.y <= fr.y ? 0 : 1, f = low ? fr : fl, pf = low ? R.prev.fr : R.prev.fl;
      const v = hyp(W.vel.x, W.vel.z), cmd = hyp(W.input.mx, W.input.mz);
      if (cmd > 0.05 && W.holdT <= 0 && W.onGround && (R.want === '*' || W.efcState === R.want) && (!R.keep || R.keep(W))) {
        R.v.push(v); R.cyc.push(dc * 30); R.foot.push(hyp(f.x - pf[0], f.z - pf[2]) * 30);
      }
    }
    R.prev = { c: S.cyc, fl: [fl.x, fl.y, fl.z], fr: [fr.x, fr.y, fr.z] };
  };
  const med = (a) => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  window.recEnd = () => { const R = REC; window.REC = null; return { n: R.v.length, v: +med(R.v).toFixed(3), cad: +med(R.cyc).toFixed(3), foot: +med(R.foot).toFixed(3) }; };
  // a nav node about d m from W on the main component, reachable
  window.nodeAway = (W, d) => {
    for (let k = 0; k < 4000; k++) {
      const id = Math.floor(Math.random() * NAV.count); if (NAV.comp[id] !== NAV.mainComp) continue;
      const x = NAV.nx[id], z = NAV.nz[id]; if (Math.abs(hyp(x - W.pos.x, z - W.pos.z) - d) > 3) continue;
      const v = new V3(x, NAV.ny[id], z); setPath(W, v); if (W.path && W.path.length > 1) return v;
    }
    return null;
  };
  window.idleW = () => entities.filter((e) => e.squad === 'w' && e.alive && !e.isPlayer && e.efcState === 'idle' && !e.efcPatrol && e.tactic === 'roam');
});
const each = 'MON(); SAMPLE();';
const cfg = await page.evaluate(() => ({ idle: EFC.cfg.wardenIdleSpeed, alert: EFC.cfg.wardenAlertSpeed, mul: EFC.cfg.wardenCombatMul, raise: EFC.cfg.wardenRaise }));
await simRun(page, 3, each);
const n0 = await page.evaluate(() => idleW().length);
ok(n0 >= 3, 'at least three idle Wardens at their posts after 3 s', n0);

// (1) turning: a held, idle Warden hears a noise to its left: head first, then the body, slower than the engine (same set-up, pace off)
async function turnRun(paced, k) {
  return page.evaluate(([paced, k]) => {
    EFC.cfg.wardenPace = paced;
    const W = idleW()[k]; window.TW = W; if (!W) return null;
    efcPaceReset(W); W.goal = null; W.path = null; W.holdT = 20; W.yawV = 0;
    W.holdLookP = { x: W.pos.x - Math.sin(W.yaw) * 20, z: W.pos.z - Math.cos(W.yaw) * 20 };
    const y0 = W.lookYaw, a = y0 + 2.2; // 2.2 rad to its left
    botLookAt(W, { x: W.pos.x - Math.sin(a) * 10, z: W.pos.z - Math.cos(a) * 10 }, MATCH.time, 3);
    window.TR = { y0, a, n: 0, at02: null, peak: 0, head: 0 };
    return { name: W.name };
  }, [paced, k]);
}
const turnEach = each + ` TR.n++; TR.peak = Math.max(TR.peak, Math.abs(TW.yawV || 0)); TR.head = Math.max(TR.head, Math.abs(TW.efcHead || 0));
  if (TR.n === 6) TR.at02 = { body: Math.abs(angDiff(TR.y0, TW.lookYaw)), head: Math.abs(TW.efcHead || 0) };`;
const t1 = await turnRun(true, 0);
await simRun(page, 2.5, turnEach);
const tOn = await page.evaluate(() => ({ ...TR, left: Math.abs(angDiff(TW.lookYaw, TR.a)), state: TW.efcState }));
const t2 = await turnRun(false, 1);
await simRun(page, 2.5, turnEach);
const tOff = await page.evaluate(() => ({ ...TR, left: Math.abs(angDiff(TW.lookYaw, TR.a)) }));
await page.evaluate(() => { EFC.cfg.wardenPace = true; });
await simRun(page, 0.5, each); // (states back with the pace on)
ok(!!t1 && !!t2, '(1) two idle Wardens for the turning runs', [t1, t2]);
if (t1 && t2) {
  ok(tOn.at02.head > 0.4 && tOn.at02.body < 0.15, '(1) after 0.2 s the head has turned toward the noise, the body hardly', tOn.at02);
  ok(tOn.left < 0.5, '(1) after 2.5 s the body faces the noise', { left: +tOn.left.toFixed(2) });
  ok(tOn.peak < tOff.peak * 0.7, '(1) body turn rate calmer than the engine\'s (peak rad/s, paced vs engine)', { paced: +tOn.peak.toFixed(2), engine: +tOff.peak.toFixed(2) });
}

// (2) idle patrol leg: walking to the neighbouring post
const idleSet = await page.evaluate(() => {
  const all = entities.filter((e) => e.squad === 'w' && e.alive && !e.isPlayer);
  const W = idleW().find((e) => e !== TW && efcNeighbour(EFC.wd.posts[e.efcPost])); window.W = W;
  if (!W) return { none: all.map((e) => [e.name, e.efcState, e.tactic, !!e.efcPatrol, !!efcNeighbour(EFC.wd.posts[e.efcPost])]) };
  const p = EFC.wd.posts[W.efcPost], q = efcNeighbour(p);
  W.efcPatrol = { id: 1, to: q.i, stage: 'out', fails: 0 }; W.goal = null; W.path = null; W.holdT = 0;
  recStart(W, 'idle');
  return { name: W.name, to: q.i, d: Math.round(hyp(q.x - W.pos.x, q.z - W.pos.z)) };
});
ok(!!idleSet && !idleSet.none, '(2) an idle Warden sent on a patrol leg', idleSet);
if (!idleSet || idleSet.none) { await browser.close(); process.exit(1); }
await simRun(page, 25, each);
const sIdle = await page.evaluate(() => recEnd());
ok(sIdle.n > 150 && near(sIdle.v, cfg.idle), `(2) idle patrol ground speed within 15 % of ${cfg.idle} m/s (median of walking steps)`, sIdle);

// (3) alert: told where a noise was, it hunts there then searches (no enemy seen)
async function huntRun(want, paced, sawIt, secs) {
  await page.evaluate(([want, paced, sawIt]) => {
    EFC.cfg.wardenPace = paced;
    const now = MATCH.time, pt = nodeAway(W, 40); window.HP = pt;
    W.efcPatrol = null; W.holdT = 0; W.stealth = false; W.chaseE = null; W.goal = null;
    W.lastKnown.copy(pt); W.lastSeenT = now - 1; W.warnT = now + 30; W.tactic = 'hunt'; setPath(W, W.lastKnown); W.decideT = 99;
    window.SAW = sawIt;
    recStart(W, want, (b) => b.tactic !== 'hunt' || b.lastKnown.distanceTo(b.pos) > 16); // (combat hunt: sights up within 15 m)
  }, [want, paced, sawIt]);
  await simRun(page, secs, each + ' W.decideT = 99; if (SAW) W.efcSawT = MATCH.time;');
  return page.evaluate(() => recEnd());
}
const sAlert = await huntRun('alert', true, false, 14);
ok(sAlert.n > 150 && near(sAlert.v, cfg.alert), `(3) alert hunt and search ground speed within 15 % of ${cfg.alert} m/s`, sAlert);
// (4) combat advance on the last known position just after losing sight of the enemy: engine first (pace off), then paced
const sEng = await huntRun('*', false, true, 9);
const sCombat = await huntRun('combat', true, true, 9);
ok(sEng.n > 100 && near(sEng.v, 3.3 * 1.05, 0.1), '(4) engine (pace off) combat advance at the engine\'s hunt speed (3.3 x 1.05 m/s)', sEng);
ok(sCombat.n > 100 && near(sCombat.v, sEng.v * cfg.mul), `(4) combat advance within 15 % of ${cfg.mul} x the engine's speed`, { combat: sCombat, want: +(sEng.v * cfg.mul).toFixed(2) });
// (5) cadence scales with speed; the stance foot stays planted
const cads = [sIdle, sAlert, sCombat].map((s) => s.cad), strides = [sIdle, sAlert, sCombat].map((s) => +(s.v / s.cad).toFixed(2));
ok(cads[0] < cads[1] * 0.92 && cads[1] < cads[2] * 1.02, '(5) step cadence rises with speed (cycles/s: idle, alert, combat)', { cads, strides });
ok([sIdle, sAlert, sCombat].every((s) => s.foot < s.v * 0.3), '(5) feet do not slide: median stance-foot speed under 30 % of the body speed', [sIdle, sAlert, sCombat].map((s) => [s.v, s.foot]));

// (6) idle to combat on sight: the raise, no shot during it, then it fires
const r0 = await page.evaluate(() => {
  EFC.cfg.wardenPace = true;
  const eye = new V3(), at = new V3();
  for (const w of idleW()) {
    if (w === W || w === TW) continue;
    for (let id = 0; id < NAV.count; id++) {
      if (NAV.comp[id] !== NAV.mainComp) continue;
      const d = hyp(NAV.nx[id] - w.pos.x, NAV.nz[id] - w.pos.z); if (d < 9 || d > 13) continue;
      eye.set(NAV.nx[id], NAV.ny[id] + 1.6, NAV.nz[id]); if (!lineClear(eye, entChest(w, at))) continue;
      const fwd = angDiff(w.yaw, Math.atan2(-(NAV.nx[id] - w.pos.x), -(NAV.nz[id] - w.pos.z))); if (Math.abs(fwd) > 0.6) continue;
      window.PRW = w; window.HOLD = [NAV.nx[id], NAV.ny[id], NAV.nz[id]];
      window.PRS = { n: 0, trans: -1, raiseT: -1, shot: -1, s0: w.arms.shots, mid: null };
      return { name: w.name, d: +d.toFixed(1), state: w.efcState };
    }
  }
  return null;
});
ok(!!r0, '(6) an idle Warden with the player put 9 to 13 m in front of it, in view', r0);
if (r0) {
  await simRun(page, 6, each + ` PRS.n++; const t = PRS.n / 30;
    if (PRS.trans < 0 && PRW.efcState !== 'idle') { PRS.trans = t; PRS.raiseT = PRW.efcRaiseT - MATCH.time + t; PRS.st = PRW.efcState; }
    if (PRS.trans >= 0 && PRS.mid === null && t >= PRS.trans + 0.2) PRS.mid = PRW.model.efcRaise;
    if (PRS.shot < 0 && PRW.arms.shots > PRS.s0) PRS.shot = t;`);
  const r = await page.evaluate(() => ({ ...PRS, raiseFire: PM.raiseFire }));
  ok(r.trans >= 0 && r.shot > 0, '(6) the Warden leaves idle and fires within 6 s', r);
  ok(r.shot >= r.raiseT - 1e-6 && r.shot - r.trans >= cfg.raise - 1e-6, `(6) its first shot comes after the ${cfg.raise} s raise`, { trans: r.trans, raiseEnds: r.raiseT, shot: r.shot });
  ok(r.mid > 0.2 && r.mid < 0.8, '(6) the weapon is half way up 0.2 s into the raise (visible raise)', r.mid);
  ok(r.raiseFire === 0, '(6) no Warden fired during a raise in the whole raid run', r.raiseFire);
}
await page.evaluate(() => { window.HOLD = PARK; });

// (7) online: the posture reaches the guest's copy (publish and apply)
const net = await page.evaluate(() => {
  const w = entities.find((e) => e.squad === 'w' && e.alive && e.efcPose);
  const wp = efcWardenPub(w), copy = { efcPose: 0, efcHead: 0 }; efcWardenNet(copy, wp);
  const plain = {}; efcWardenNet(plain, undefined);
  return { pose: w.efcPose, wp, copy, plain, inPresence: /efcWardenPub/.test(netPresence.toString()), inApply: /efcWardenNet/.test(netApply.toString()) };
});
ok(net.inPresence && net.inApply && net.copy.efcPose === net.pose && net.plain.efcPose === 0, '(7) a Warden\'s posture is published (p.wp) and applied to the remote copy', net);

// (8) tdm: the engine's speeds, no posture
await page.evaluate(() => { T.inv = true; Settings.mode = 'tdm'; endMatch(); LOCK.fallback = true; startMatch({}); MATCH.timeLeft = 1e5; window.HOLD = [PL.ent.pos.x, PL.ent.pos.y, PL.ent.pos.z]; });
await simRun(page, 8, 'PL.ent.health = 100; window.MAXV = Math.max(window.MAXV || 0, ...entities.filter((e) => !e.isPlayer && e.alive).map((e) => hyp(e.vel.x, e.vel.z)));');
const td = await page.evaluate(() => {
  const W = entities.find((e) => !e.isPlayer && e.alive && !e.visible); window.W = W;
  return { mode: MATCH.mode, posed: entities.filter((e) => e.efcPose || e.efcState).length, maxV: +window.MAXV.toFixed(2), name: W && W.name };
});
const sTdm = await huntRun('*', true, false, 6);
ok(td.mode === 'tdm' && td.posed === 0, '(8) tdm: no soldier has a Warden posture', td);
ok(td.maxV > 5, '(8) tdm bots still sprint at the engine\'s speeds (max ground speed m/s)', td.maxV);
ok(sTdm.n > 60 && near(sTdm.v, sEng.v, 0.08), '(8) tdm hunt speed equals the engine\'s (raid, pace off)', { tdm: sTdm.v, engine: sEng.v });

ok(errors.length === 0, 'no page errors', errors.slice(0, 10));
console.log('speeds', JSON.stringify({ idle: sIdle, alert: sAlert, combat: sCombat, engine: sEng, tdm: sTdm }));
await browser.close();
console.log(fails.length ? `test-warden-pace: ${fails.length} FAILED` : 'test-warden-pace: all passed');
process.exit(fails.length ? 1 : 0);
