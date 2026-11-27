// LEAN test (P2c): eye shift in the open and against a wall, hit volumes that follow the lean (player and model soldiers), Warden sight of a
// leaning head round a corner, sprint cancel, toggle mode, and the host's copy of a leaning guest (two-client rig). Two screenshots.
// node tools/dev/efc/test-lean.mjs   (needs a build: python3 build.py). SHOTS=0 skips the screenshots, NET=0 the two-client part.
import { openGame, startSolo, simRun } from './harness.mjs';
import { openPair, createLobby, joinLobby, launch, waitInMatch, stepBoth } from './net2.mjs';

const MAP = process.env.MAP || 'claudov', OUT = process.env.OUT || '/tmp';
let fails = 0;
const ok = (cond, msg, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg + (extra !== undefined ? ' ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
const t0 = Date.now(), wall = () => Math.round((Date.now() - t0) / 1000) + 's';

// page helpers, installed once: an open spot, test walls (collision boxes, optionally drawn), freezing the other soldiers
const HELPERS = () => {
  window.LT = {
    walls: [],
    clear(x, y, z, dx, dz, d) { return !rayWorld(x, y, z, dx, 0, dz, d); },
    // a walkable spot with nothing within 2 m to either side and 18 m ahead (-z), at eye and chest height
    spot() {
      for (let i = 0; i < NAV.count; i += 7) {
        if (NAV.comp[i] !== NAV.mainComp) continue;
        const x = NAV.nx[i], z = NAV.nz[i], g = groundHeight(x, z, 20);
        if (!navClear(x, z, g)) continue;
        let good = true;
        for (const h of [1.0, 1.35, 1.6]) {
          const y = g + h;
          if (!this.clear(x, y, z, 1, 0, 2) || !this.clear(x, y, z, -1, 0, 2) || !this.clear(x, y, z, 0, -1, 18) || !this.clear(x, y, z, 0, 1, 1.5)) { good = false; break; }
          if (!this.clear(x + 0.4, y, z, 0, -1, 18)) { good = false; break; }
        }
        if (good) return { x, y: g, z };
      }
      return null;
    },
    wall(x0, x1, z0, z1, y0, y1, show) {
      const c = { x0, x1, y0, y1, z0, z1, m: 'concrete', ray: false }, i = COL.length; COL.push(c);
      const cells = [];
      for (let x = Math.floor(x0 / HCELL); x <= Math.floor(x1 / HCELL); x++) for (let z = Math.floor(z0 / HCELL); z <= Math.floor(z1 / HCELL); z++) {
        const k = x * 1000 + z; let a = HASH.get(k); if (!a) HASH.set(k, (a = [])); a.push(i); cells.push(k);
      }
      let mesh = null;
      if (show) {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 0.9 }));
        mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh);
      }
      this.walls.push({ i, cells, mesh }); return c;
    },
    unwall() {
      for (const w of this.walls) { for (const k of w.cells) { const a = HASH.get(k); a.splice(a.indexOf(w.i), 1); } COL[w.i] = { x0: 0, x1: 0, y0: -1e4, y1: -1e4, z0: 0, z1: 0, m: 'concrete', noRay: true }; if (w.mesh) scene.remove(w.mesh); }
      this.walls = [];
    },
    // the player at p facing -z, standing still, upright
    place(p) {
      const e = PL.ent; e.pos.set(p.x, p.y, p.z); e.vel.set(0, 0, 0); PL.yaw = e.yaw = 0; PL.pitch = e.pitch = 0;
      for (const k in KEYS) KEYS[k] = false; PL.crouchToggle = false; PL.adsWant = false; efcLeanReset(); Settings.leanToggle = false;
    },
    // other soldiers parked far away and harmless (the test drives one when it needs one)
    park() { let n = 0; for (const b of entities) if (b !== PL.ent) { b.pos.set(MAP.x0 + 2 + n++ * 1.5, groundHeight(MAP.x0 + 2, MAP.z0 + 2, 30), MAP.z0 + 2); b.vel.set(0, 0, 0); b.health = 100; b.blindT = 1e9; b.target = null; } PL.ent.health = 100; },
    each: 'PL.ent.health = 100; LT.park();',
    side(e, p) { return (p.x - e.pos.x) * Math.cos(e.yaw) - (p.z - e.pos.z) * Math.sin(e.yaw); }, // m to the right of e's view
  };
};

const { browser, page, errors } = await openGame({ settings: { map: MAP, mode: 'raid', limit: 9999, minutes: 60 }, w: 960, h: 540 });
try {
  await page.evaluate(HELPERS);
  await startSolo(page);
  await simRun(page, 1, 'PL.ent.health = 100;');
  const spot = await page.evaluate(() => LT.spot());
  ok(!!spot, 'found an open spot on ' + MAP, spot);
  const run = async (s, each = '') => { const r = await simRun(page, s, 'LT.park(); PL.ent.health = 100;' + each); if (r < s - 0.05) ok(false, 'match stopped', await page.evaluate(() => MATCH.state)); return r; };

  // (1) the eye in the open: standing, left, crouched, aiming
  await page.evaluate((p) => LT.place(p), spot); await run(0.3);
  const up = await page.evaluate(() => { const e = entEye(PL.ent, new V3()); return { eye: e.toArray(), cam: camera.position.toArray(), head: entHead(PL.ent, new V3()).toArray() }; });
  await run(0.1, 'KEYS.LeanR = true;');
  const half = await page.evaluate(() => PL.ent.leanX);
  await run(0.2, 'KEYS.LeanR = true;');
  const right = await page.evaluate(() => ({ x: PL.ent.leanX, side: LT.side(PL.ent, camera.position), eyeSide: LT.side(PL.ent, entEye(PL.ent, new V3())), roll: camera.rotation.z, gun: vmCamera.rotation.z, dy: camera.position.y }));
  ok(Math.abs(right.side - 0.35) < 0.02 && Math.abs(right.eyeSide - 0.35) < 0.02, '(1) leaning right moves the eye 0.35 m to the right in the open', right);
  ok(half > 0.05 && half < 0.34, '(1) the lean eases in (part way after 0.1 s, full by 0.3 s)', { half });
  ok(Math.abs(right.roll * 180 / Math.PI + 15) < 1.5 && right.gun > 0.05, '(1) camera rolls about 15 degrees, the weapon cants with it', { rollDeg: right.roll * 180 / Math.PI, gun: right.gun });
  await page.evaluate(() => { KEYS.LeanR = false; KEYS.LeanL = true; });
  await run(0.3);
  const left = await page.evaluate(() => LT.side(PL.ent, camera.position));
  ok(Math.abs(left + 0.35) < 0.02, '(1) leaning left moves the eye 0.35 m to the left', left);
  await run(0.6, 'KEYS.LeanL = false; PL.crouchToggle = true; KEYS.LeanR = true;');
  const crouch = await page.evaluate(() => ({ side: LT.side(PL.ent, camera.position), crouch: PL.ent.crouchAmt }));
  ok(crouch.crouch > 0.9 && Math.abs(crouch.side - 0.25) < 0.03, '(1) crouched, the lean is shorter (0.25 m)', crouch);
  await run(0.8, 'KEYS.ControlLeft = false; PL.crouchToggle = false; KEYS.LeanR = true; PL.adsWant = true;');
  const ads = await page.evaluate(() => ({ side: LT.side(PL.ent, camera.position), ads: VM.ads }));
  ok(ads.ads > 0.8 && Math.abs(ads.side - 0.35) < 0.03, '(1) works while aiming', ads);

  // (2) a wall 0.45 m to the right: the eye stops short of it, never inside
  await page.evaluate((p) => { LT.place(p); LT.wall(p.x + 0.45, p.x + 0.65, p.z - 1.5, p.z + 1.5, p.y, p.y + 3); }, spot); await run(0.2);
  await run(0.4, 'KEYS.LeanR = true;');
  const wl = await page.evaluate((p) => ({ x: PL.ent.leanX, camX: camera.position.x - p.x, sees: !!rayWorld(camera.position.x, camera.position.y, camera.position.z, 1, 0, 0, 0.12) }), spot);
  ok(wl.x > 0.15 && wl.x < 0.45 - 0.15 && wl.camX < 0.45 - 0.12 && !wl.sees, '(2) a wall shortens the lean: the eye stays clear of it', wl);
  await run(0.4, 'KEYS.LeanR = false; KEYS.LeanL = true;');
  const wl2 = await page.evaluate(() => PL.ent.leanX);
  ok(Math.abs(wl2 + 0.35) < 0.02, '(2) the other side is open: full lean left', wl2);
  await page.evaluate(() => LT.unwall());

  // (3) hit volumes follow the lean. Player (simple volumes): a ray at the upright head misses, one at the leaned head hits.
  const hits = await page.evaluate((p) => {
    LT.place(p);
    const foe = entities.find((b) => b !== PL.ent && !allied(b, PL.ent));
    const shoot = (target, aim) => { const o = new V3(aim.x, aim.y, aim.z - 10), d = new V3().subVectors(aim, o).normalize(); const h = rayEntities(o, d, 20, foe); return h && h.ent === target ? h.part : null; };
    for (let i = 0; i < 6; i++) matchTick(1 / 30, false);
    const h0 = entHead(PL.ent, new V3()), c0 = entChest(PL.ent, new V3());
    const r = { upright: shoot(PL.ent, h0) };
    for (let i = 0; i < 12; i++) { KEYS.LeanR = true; LT.park(); matchTick(1 / 30, false); }
    r.leanX = PL.ent.leanX; r.oldHead = shoot(PL.ent, h0); r.newHead = shoot(PL.ent, entHead(PL.ent, new V3())); r.headSide = LT.side(PL.ent, entHead(PL.ent, new V3()));
    r.chestSide = LT.side(PL.ent, entChest(PL.ent, new V3())); r.chest = shoot(PL.ent, entChest(PL.ent, new V3())); r.c0side = LT.side(PL.ent, c0);
    KEYS.LeanR = false;
    // a model soldier (how a remote player is posed and hit): a foe statue, leaned by hand
    const b = entities.find((x) => x !== PL.ent && !allied(x, PL.ent) && x.alive && x.model) || foe; r.mAlive = b.alive; b.pos.set(p.x, p.y, p.z); b.vel.set(0, 0, 0); b.yaw = b.lookYaw = 0; b.pitch = 0; b.crouch = false; b.crouchAmt = 0; b.leanX = 0;
    const pose = () => { for (let i = 0; i < 20; i++) { b.pos.set(p.x, p.y, p.z); b.vel.set(0, 0, 0); b.yaw = 0; animSoldier(b, 1 / 30); } };
    PL.ent.pos.x += 30; pose();
    const bh0 = entHead(b, new V3()), me = entities.find((e) => e !== b && !allied(e, b)) || PL.ent;
    const shootB = (aim) => { const o = new V3(aim.x, aim.y, aim.z - 10), d = new V3().subVectors(aim, o).normalize(); const h = rayEntities(o, d, 20, me); return h && h.ent === b ? h.part : null; };
    r.mUpright = shootB(bh0);
    b.leanX = 0.35; pose();
    r.mHeadSide = LT.side(b, entHead(b, new V3())); r.mOld = shootB(bh0); r.mNew = shootB(entHead(b, new V3())); r.mChestSide = LT.side(b, entChest(b, new V3()));
    b.leanX = 0; pose();
    return r;
  }, spot);
  ok(hits.upright === 'head', '(3) player: a shot at the upright head hits the head', hits.upright);
  ok(hits.oldHead === null && hits.newHead === 'head', '(3) player leaning: a shot at the upright head misses, one at the leaned head hits', hits);
  ok(hits.chest === 'body' && hits.chestSide > 0.25, '(3) player leaning: the chest point moves to the exposed shoulder and is a body hit', { chestSide: hits.chestSide, part: hits.chest });
  ok(hits.mUpright === 'head', '(3) model soldier: a shot at its upright head hits', hits.mUpright);
  ok(Math.abs(hits.mHeadSide - 0.35) < 0.08 && hits.mOld === null && hits.mNew === 'head', '(3) model soldier leaning: head 0.35 m aside, the upright head point misses, the leaned head hits', { side: hits.mHeadSide, old: hits.mOld, new: hits.mNew });

  // (4) a Warden ahead of a corner sees the leaned head and shoulder, not the body behind the wall
  const los = await page.evaluate((p) => {
    LT.place(p); LT.wall(p.x - 2, p.x + 0.15, p.z - 1.2, p.z - 0.8, p.y, p.y + 3);
    for (let i = 0; i < 6; i++) { LT.park(); matchTick(1 / 30, false); }
    const eye = new V3(p.x + 0.35, p.y + 1.6, p.z - 15), see = (pt) => lineClear(eye, pt);
    const r = { head0: see(entHead(PL.ent, new V3())), chest0: see(entChest(PL.ent, new V3())) };
    for (let i = 0; i < 12; i++) { KEYS.LeanR = true; LT.park(); matchTick(1 / 30, false); }
    r.leanX = PL.ent.leanX; r.head = see(entHead(PL.ent, new V3())); r.chest = see(entChest(PL.ent, new V3()));
    r.body = see(new V3(PL.ent.pos.x, PL.ent.pos.y + 1.06, PL.ent.pos.z)); r.hips = see(new V3(PL.ent.pos.x, PL.ent.pos.y + 0.9, PL.ent.pos.z));
    // the bot's own shot ray at the aim points (what botFire would trace)
    const foe = entities.find((b) => b !== PL.ent && !allied(b, PL.ent));
    const shot = (pt) => { const d = new V3().subVectors(pt, eye), L = d.length(); d.normalize(); const w = rayWorld(eye.x, eye.y, eye.z, d.x, d.y, d.z, L + 2), h = rayEntities(eye, d, L + 2, foe); return h && h.ent === PL.ent && (!w || w.t > h.t) ? h.part : null; };
    r.shotHead = shot(entHead(PL.ent, new V3())); r.shotChest = shot(entChest(PL.ent, new V3()));
    KEYS.LeanR = false; LT.unwall(); return r;
  }, spot);
  ok(!los.head0 && !los.chest0, '(4) upright behind the corner: the Warden sees neither head nor chest', los);
  ok(los.head && los.chest && !los.body && !los.hips, '(4) leaning out: head and shoulder in sight, the body behind the wall is not', los);
  ok(los.shotHead === 'head' && los.shotChest === 'body', '(4) leaning out: shots at the head and chest aim points land on the player, not the wall', los);

  // (5) sprinting cancels; toggle mode
  await page.evaluate((p) => LT.place(p), spot); await run(0.3, 'KEYS.LeanR = true;');
  await run(0.5, 'KEYS.LeanR = true; KEYS.KeyW = true; KEYS.ShiftLeft = true;');
  const spr = await page.evaluate(() => ({ x: PL.ent.leanX, sprinting: PL.sprinting }));
  ok(spr.sprinting && Math.abs(spr.x) < 0.01, '(5) sprinting cancels the lean', spr);
  await page.evaluate((p) => { LT.place(p); Settings.leanToggle = true; efcLeanPress(1); }, spot);
  await run(0.3);
  const tg1 = await page.evaluate(() => PL.ent.leanX);
  await page.evaluate(() => efcLeanPress(1)); await run(0.3);
  const tg2 = await page.evaluate(() => PL.ent.leanX);
  await page.evaluate(() => { efcLeanPress(-1); }); await run(0.3);
  const tg3 = await page.evaluate(() => PL.ent.leanX);
  await page.evaluate(() => efcLeanPress(1)); await run(0.3); // left -> right in one press
  const tg4 = await page.evaluate(() => PL.ent.leanX);
  await run(0.4, 'KEYS.KeyW = true; KEYS.ShiftLeft = true;'); await run(0.4);
  const tg5 = await page.evaluate(() => ({ x: PL.ent.leanX, tog: EFC_LEAN.tog }));
  ok(Math.abs(tg1 - 0.35) < 0.02 && Math.abs(tg2) < 0.01 && Math.abs(tg3 + 0.35) < 0.02 && Math.abs(tg4 - 0.35) < 0.02, '(5) toggle: a press leans without holding, another straightens, the other key switches side', { tg1, tg2, tg3, tg4 });
  ok(Math.abs(tg5.x) < 0.01 && tg5.tog === 0, '(5) toggle: sprinting clears the toggled lean and it stays cleared', tg5);
  // the keys as the player presses them (onKey via the bindings) and the settings row
  const keys = await page.evaluate((p) => {
    LT.place(p); Settings.leanToggle = false; const was = pointerActive; window.pointerActive = () => true;
    const ev = (code, type) => dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
    ev('KeyE', 'keydown'); for (let i = 0; i < 10; i++) { LT.park(); matchTick(1 / 30, false); }
    const held = PL.ent.leanX; ev('KeyE', 'keyup'); for (let i = 0; i < 10; i++) { LT.park(); matchTick(1 / 30, false); }
    const rel = PL.ent.leanX; window.pointerActive = was;
    return { held, rel, canon: ['KeyQ', 'KeyE', 'KeyZ', 'KeyV', 'KeyF'].map(keyCanon), labels: BIND_DEFS.map((d) => d[0] + '=' + bindOf(d[0])).join(' '), row: CTRL_ROWS.some((r) => r[1] === 'leanToggle') };
  }, spot);
  ok(Math.abs(keys.held - 0.35) < 0.02 && Math.abs(keys.rel) < 0.01, '(5) E held through the key bindings leans right, released straightens', keys);
  ok(keys.canon.join() === 'LeanL,LeanR,KeyQ,KeyE,KeyF' && keys.row, '(5) bindings: Q, E lean; Z weapon swap; V pick up; F knife; toggle row in Controls', keys.canon);
  console.log('bindings: ' + keys.labels);

  // (6) screenshots: first person leaning round a corner at a soldier; a soldier leaning, seen from outside
  if (process.env.SHOTS !== '0') {
    const shot1 = OUT + '/lean-first-person.png', shot2 = OUT + '/lean-third-person.png';
    await page.evaluate((p) => {
      LT.place(p); LT.wall(p.x - 3, p.x + 0.15, p.z - 1.3, p.z - 0.9, p.y, p.y + 2.6, true);
      const b = entities.find((x) => x !== PL.ent && !allied(x, PL.ent)); window.LT.foe = b;
      LT.each = '';
      for (let i = 0; i < 15; i++) { KEYS.LeanR = true; LT.park(); b.pos.set(p.x + 0.8, p.y, p.z - 12); b.yaw = b.lookYaw = Math.PI; b.vel.set(0, 0, 0); matchTick(1 / 30, false); }
      GPUX.halt = true; renderFrame(1 / 30);
    }, spot);
    await page.screenshot({ path: shot1 });
    await page.evaluate((p) => {
      const b = LT.foe; b.pos.set(p.x + 6, p.y, p.z - 4); b.vel.set(0, 0, 0); b.yaw = b.lookYaw = Math.PI / 2; b.pitch = 0; b.leanX = 0.35;
      for (let i = 0; i < 20; i++) { b.pos.set(p.x + 6, p.y, p.z - 4); b.yaw = Math.PI / 2; animSoldier(b, 1 / 30); }
      // camera in front of the soldier (it faces -x), a little to the side, looking at its chest
      camera.position.set(p.x + 3.4, p.y + 1.5, p.z - 4.6); camera.rotation.set(-0.05, -Math.PI / 2 - 0.15, 0); vmCamera.rotation.z = 0;
      VM.holder.visible = false; renderFrame(1 / 30);
    }, spot);
    await page.screenshot({ path: shot2 });
    console.log('screenshots: ' + shot1 + ' ' + shot2);
  }
} finally { await browser.close(); }
if (errors.length) { console.error(errors.slice(0, 10).join('\n')); fails++; }
console.log(`solo part done (${wall()})`);

// (7) online: the host's copy of a leaning guest leans within 0.3 s of game time
if (process.env.NET !== '0') {
  const rig = await openPair({ map: MAP });
  try {
    const code = await createLobby(rig.host, { map: MAP, mode: 'raid' });
    await joinLobby(rig.guest, code); await launch(rig.host);
    await Promise.all([waitInMatch(rig.host), waitInMatch(rig.guest)]);
    await stepBoth([rig.host, rig.guest], 1, 'PL.ent.health = 100;');
    const gid = await rig.guest.evaluate(() => NET.me);
    const before = await rig.host.evaluate((gid) => { const e = NET.remotes.get(gid); return e ? e.leanX || 0 : null; }, gid);
    // the guest leans; both pages stepped in two-tick slices (guest first): game time from the press until the guest's lean is complete
    // and the host copy is within 3 cm of it
    let tGame = 0, gx = 0, gPrev = -1, hx = 0, head = null;
    const tick = (p, n, lean) => p.evaluate(([n, lean]) => { for (let i = 0; i < n; i++) { KEYS.LeanR = lean; PL.ent.health = 100; matchTick(1 / 30, false); } }, [n, lean]);
    const hostCopy = () => rig.host.evaluate((gid) => { const e = NET.remotes.get(gid); if (!e) return null; const hd = entHead(e, new V3()); return { x: e.leanX || 0, headSide: (hd.x - e.pos.x) * Math.cos(e.yaw) - (hd.z - e.pos.z) * Math.sin(e.yaw) }; }, gid);
    for (let i = 0; i < 15; i++) {
      await tick(rig.guest, 2, true); await new Promise((r) => setTimeout(r, 15)); await tick(rig.host, 2, false);
      tGame += 2 / 30;
      gPrev = gx; gx = await rig.guest.evaluate(() => PL.ent.leanX);
      head = await hostCopy(); hx = head ? head.x : 0;
      if (gx > 0.1 && Math.abs(gx - gPrev) < 1e-4 && Math.abs(hx - gx) < 0.03) break;
    }
    ok(before === 0 && gx > 0.1, '(7) guest leans (host copy upright before)', { before, gx });
    ok(Math.abs(hx - gx) < 0.03 && tGame <= 0.3 + 1e-6, '(7) host copy of the guest leans within 0.3 s of game time', { tGame: +tGame.toFixed(2), gx, hx, head });
    let tBack = 0, back = 1;
    for (let i = 0; i < 15 && Math.abs(back) > 0.02; i++) {
      await tick(rig.guest, 2, false); await new Promise((r) => setTimeout(r, 15)); await tick(rig.host, 2, false);
      tGame += 2 / 30; tBack += 2 / 30; back = (await hostCopy()).x;
    }
    ok(Math.abs(back) < 0.02 && tBack <= 0.4, '(7) and straightens when the guest does', { back, tBack: +tBack.toFixed(2) });
    if (rig.errors.length) { console.error(rig.errors.slice(0, 10).join('\n')); fails++; }
  } finally { await rig.close(); }
}
console.log(fails ? `${fails} FAILED (${wall()})` : `all passed (${wall()})`);
process.exit(fails ? 1 : 0);
