// P6 SKS test: models build (first and third person), makeArms accepts it, and in a stepped raid on Claudov with the free kit it
// fires, aims and reloads round by round; time to kill at 25 m against a still target is the longest of all rifles (engine numbers
// and a stepped measurement). Writes two pictures: the SKS in first person and its side view (thumbnail service when present).
// node tools/dev/efc/test-sks.mjs        (SHOTS=dir for the pictures, default /tmp; NOSHOTS=1 skips them)
import fs from 'node:fs';
import { openGame, startSolo, simRun } from './harness.mjs';

const SHOTS = process.env.SHOTS || '/tmp';
let fails = 0;
const check = (name, ok, info) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' ' + JSON.stringify(info) : '')); if (!ok) fails++; };
const { browser, page, errors } = await openGame({ w: 960, h: 540, settings: { map: 'claudov', mode: 'raid' } });
const ev = (fn, arg) => page.evaluate(fn, arg);
try {
  // ---------- 1. catalogue, models, makeArms ----------
  let r = await ev(() => {
    const d = WEAPONS.sks, fp = buildGunModel('sks'), wg = buildWorldGun('sks'), A = makeArms(['sks']);
    let fpMesh = 0, wMesh = 0; fp.group.traverse((o) => { if (o.isMesh) fpMesh++; }); (wg.group || wg).traverse((o) => { if (o.isMesh) wMesh++; });
    // sights: the front post (sight material) and the rear notch tops on info.sightY
    const M = gunMaterials(); let post = null;
    fp.group.traverse((o) => { if (o.isMesh && o.material === M.sight) post = new THREE.Box3().setFromObject(o); });
    return { n: Object.keys(WEAPONS).length, d: { auto: d.auto, mag: d.mag, tube: d.tube, fam: d.fam, slots: d.slots, sound: d.sound }, ak: WEAPONS.ak47.dmg[0] - d.dmg[0],
      fpMesh, wMesh, fam: gunFam('sks'), tubeFed: fp.tubeFed, gripR: fp.gripR.toArray(), gripL: fp.gripL.toArray(), grips: !!(fp.gripDef && fp.trigDef),
      postTop: post ? post.max.y : null, sightY: fp.sightY, postX: post ? (post.max.x + post.min.x) / 2 : null, arms: A.slots[0].def.id + ' ' + A.slots[0].mag + '/' + A.slots[0].reserve,
      inBots: BOT_WEAPONS.includes('sks'), item: efcCall('item:def', 'w_sks') };
  });
  check('nineteen engine weapons', r.n === 19, r.n);
  check('SKS: semi-automatic, 10 rounds, tube reload, rifle family, no attachments, AK shot profile', !r.d.auto && r.d.mag === 10 && r.d.tube && r.d.fam === 'rifle' && r.d.slots.length === 0 && r.d.sound === 'ak', r.d);
  check('damage a little under the AK', r.ak > 0 && r.ak <= 8, r.ak);
  check('first-person model builds', r.fpMesh > 30 && r.fam === 'rifle' && r.tubeFed && r.grips, { mesh: r.fpMesh, fam: r.fam });
  check('world model builds', r.wMesh > 10, r.wMesh);
  check('front post tip on the sight line, centred', r.postTop !== null && Math.abs(r.postTop - r.sightY) < 0.0015 && Math.abs(r.postX) < 1e-4, { top: r.postTop, y: r.sightY });
  check('makeArms accepts the SKS', r.arms === 'sks 10/30', r.arms);
  check('item w_sks, low value, no Warden carries it', r.item && r.item.name === 'SKS' && r.item.value <= 1000 && r.item.noLoot && !r.inBots, r.item);
  // remote copy: the per-player state names the weapon by its key; the network side resolves keys from WEAPONS
  r = await ev(() => { const k = typeof gunKey === 'function' ? gunKey('sks', [], null) : 'sks'; let ok = true; try { gunSpec(k); buildWorldGun(k); } catch (e) { ok = String(e); } return { k, ok }; });
  check('remote copy: world gun from the published key', r.ok === true, r);

  // ---------- 2. a raid on Claudov with the free kit ----------
  await ev(() => { efcCall('stash:setFreeKit', true); });
  await startSolo(page);
  r = await ev(() => ({ map: MAPL.id, state: efcCall('raid:state').state, w: curW().def.id, mag: curW().mag, res: curW().reserve, slots: PL.ent.arms.slots.length, inv: efcCall('inv:all', EFC.inv).map((i) => i.id + (i.free ? '*' : '')) }));
  check('raid on Claudov starts with the free kit: SKS 10 + 30 and nothing else', r.map === 'claudov' && r.state === 'live' && r.w === 'sks' && r.mag === 10 && r.res === 30 && r.slots === 1 && r.inv.join() === 'w_sks*', r);
  const HOLD = 'PL.ent.health = 100; for (const e of entities) if (!e.isPlayer) { e.input && (e.input.fire = false); }';
  // aim: time for adsW to pass 0.95
  r = await ev(() => { PL.adsWant = true; let t = 0; while (PL.ent.arms.adsW < 0.95 && t < 3) { matchTick(1 / 30, false); PL.ent.health = 100; t += 1 / 30; } const s = { t, adsW: PL.ent.arms.adsW, ads: PL.ent.adsActive }; PL.adsWant = false; return s; });
  check('aims (slow: more than half a second to settle)', r.ads && r.adsW >= 0.95 && r.t > 0.5 && r.t < 1.5, r);
  await simRun(page, 1, HOLD);
  // fire: one shot per press, the follow-up limited by the rate of fire
  r = await ev(() => {
    const w = curW(), m0 = w.mag, out = [];
    for (let i = 0; i < 90 && out.length < 3; i++) { PL.queued = true; matchTick(1 / 30, false); PL.ent.health = 100; if (w.mag < m0 - out.length) out.push(+(i / 30).toFixed(3)); }
    PL.queued = false; return { m0, mag: w.mag, times: out };
  });
  const gap = r.times.length === 3 ? r.times[2] - r.times[1] : 0;
  check('fires semi-automatically at a slow rate', r.mag === r.m0 - 3 && gap >= 0.36, r);
  // reload round by round: from 7 rounds, one round at a time
  r = await ev(() => {
    const w = curW(), seq = [w.mag]; ctlStartReload(PL.ent); let t = 0;
    while ((PL.ent.arms.reload || t < 0.1) && t < 8) { matchTick(1 / 30, false); PL.ent.health = 100; t += 1 / 30; if (w.mag !== seq[seq.length - 1]) seq.push(w.mag); }
    return { seq, res: w.reserve, t: +t.toFixed(2) };
  });
  const steps = r.seq.slice(1).every((m, i) => m === r.seq[i] + 1);
  check('reloads round by round to a full magazine', steps && r.seq[r.seq.length - 1] === 10 && r.res === 27 && r.seq.length === 4, r);

  // ---------- 3. time to kill at 25 m against a still target ----------
  const ttk = await ev(() => {
    const rifles = Object.keys(WEAPONS).filter((k) => ['ar', 'sniper'].includes(WEAPONS[k].cat)), out = {};
    for (const k of rifles) { const d = WEAPONS[k], dm = propDamage(d, 25), n = Math.ceil(100 / dm); out[k] = { dmg: +dm.toFixed(1), shots: n, engine: +(((n - 1) * 60) / d.rpm).toFixed(3) }; }
    return out;
  });
  // stepped measurement: the player re-aimed at the chest of a frozen Warden 25 m away every step, firing as fast as the weapon allows
  const meas = await ev((keys) => {
    const P = PL.ent, tgt = entities.find((e) => !e.isPlayer && e.alive && !e.efcElite) || entities.find((e) => !e.isPlayer && e.alive);
    const base = P.pos.clone(); let dir = null;
    for (let a = 0; a < 32 && !dir; a++) {
      const dx = Math.sin((a * Math.PI) / 16), dz = Math.cos((a * Math.PI) / 16);
      if (!rayWorld(base.x, base.y + 1.2, base.z, dx, 0, dz, 26.5) && !rayWorld(base.x, base.y + 0.4, base.z, dx, 0, dz, 26.5)) dir = [dx, dz];
    }
    if (!dir || !tgt) return { err: 'no clear line', tgt: !!tgt };
    const tp = base.clone(); tp.x += dir[0] * 25; tp.z += dir[1] * 25;
    const out = {};
    for (const k of keys) {
      P.arms = makeArms([k]); P.arms.fireCd = 0; tgt.alive = true; tgt.health = 100; tgt.pos.copy(tp); tgt.vel && tgt.vel.set(0, 0, 0);
      if (tgt.efcArmor !== undefined) tgt.efcArmor = null;
      let t = 0, shots = 0, hits = 0, last = 100, first = -1;
      while (tgt.alive && tgt.health > 0 && t < 10) {
        P.pos.copy(base); P.vel.set(0, 0, 0); P.health = 100; tgt.pos.copy(tp); tgt.vel && tgt.vel.set(0, 0, 0);
        const ex = tp.x - base.x, ez = tp.z - base.z, ey = tp.y + 1.25 - (base.y + PL.eyeH);
        PL.yaw = Math.atan2(-ex, -ez); PL.pitch = Math.atan2(ey, Math.hypot(ex, ez));
        camera.position.set(base.x, base.y + PL.eyeH, base.z); camera.rotation.set(PL.pitch, PL.yaw, 0, 'YXZ'); camera.updateMatrixWorld();
        PL.adsWant = true; PL.queued = P.arms.adsW > 0.9; const s0 = P.arms.shots;
        matchTick(1 / 30, false); t += 1 / 30;
        if (P.arms.shots > s0) { shots++; if (first < 0) first = t; }
        if (tgt.health < last) { hits++; last = tgt.health; }
        if (P.arms.slots[0].mag === 0 && !P.arms.reload) ctlStartReload(P);
      }
      out[k] = { ttk: first < 0 || tgt.alive ? null : +(t - first).toFixed(3), shots, hits, dead: !tgt.alive || tgt.health <= 0 };
    }
    PL.adsWant = false; PL.queued = false;
    return out;
  }, Object.keys(ttk));
  console.log('\nTime to kill at 25 m, still target, 100 health, torso, no armour');
  console.log('weapon  damage  shots  engine TTK (s)  stepped TTK (s, ADS, re-aimed)');
  for (const k of Object.keys(ttk)) {
    const m = meas[k] || {};
    console.log(k.padEnd(8) + String(ttk[k].dmg).padEnd(8) + String(ttk[k].shots).padEnd(7) + String(ttk[k].engine).padEnd(16) + (m.ttk === null || m.ttk === undefined ? 'no kill' : m.ttk + ' (' + m.hits + ' hits / ' + m.shots + ' shots)'));
  }
  const others = Object.keys(ttk).filter((k) => k !== 'sks');
  check('engine TTK at 25 m: the SKS is the longest of all rifles', others.every((k) => ttk[k].engine < ttk.sks.engine), ttk.sks);
  check('engine TTK: still usable (under 1.5 s, 4 shots or fewer)', ttk.sks.engine < 1.5 && ttk.sks.shots <= 4, ttk.sks);
  if (meas.err) check('stepped TTK: clear 25 m line found on Claudov', false, meas);
  else {
    check('stepped TTK: the SKS kills', meas.sks && meas.sks.dead, meas.sks);
    check('stepped TTK: the SKS is the longest of all rifles', others.every((k) => meas[k].ttk !== null && meas[k].ttk < meas.sks.ttk), meas);
  }

  // ---------- 4. pictures ----------
  if (!process.env.NOSHOTS) {
    await ev(() => { const P = PL.ent; P.arms = makeArms(['sks']); PL.adsWant = false; PL.pitch = -0.05;
      window.__keep = setInterval(() => { PL.ent.health = 100; }, 50); for (const e of entities) if (!e.isPlayer) { e.off = true; } });
    await page.waitForTimeout(6000);
    await page.screenshot({ path: SHOTS + '/efc-sks-first-person.png', timeout: 300000 });
    console.log('first person: ' + SHOTS + '/efc-sks-first-person.png');
    const has = await ev(() => efcHas('thumb:get'));
    if (has) {
      await ev(() => efcCall('thumb:get', 'w_sks', 'big'));
      await page.waitForFunction(() => !!efcCall('thumb:get', 'w_sks', 'big'), null, { timeout: 600000, polling: 1000 });
      const url = await ev(() => efcCall('thumb:get', 'w_sks', 'big'));
      fs.writeFileSync(SHOTS + '/efc-sks-side.png', Buffer.from(url.split(',')[1], 'base64'));
      console.log('side view (thumb:get big): ' + SHOTS + '/efc-sks-side.png');
    } else console.log('thumb:get not present: no side view');
  }
  check('no page errors', errors.length === 0, errors.slice(0, 5));
} catch (e) {
  console.error(e); fails++;
} finally {
  await browser.close();
}
console.log(fails ? fails + ' FAILED' : 'sks ok');
process.exit(fails ? 1 : 0);
