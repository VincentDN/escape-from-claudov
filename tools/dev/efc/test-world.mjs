// WORLD package test: host-owned containers, services, take/put rules, validation, snapshot round trip, raid gate on ground weapons.
// node tools/dev/efc/test-world.mjs ; SHOT=/tmp/efc-world.png also renders and saves one screenshot of containers near the player.
import { openGame, startSolo, simRun } from './harness.mjs';
const { browser, page, errors } = await openGame({ settings: { map: 'simoun', mode: 'tdm' }, w: 960, h: 540 });
await startSolo(page);
await simRun(page, 1, 'PL.ent.health = 100;');
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'ok   ' : 'FAIL ') + m); };

const r = await page.evaluate(() => {
  const out = {}, changed = [], given = [];
  MATCH.mode = 'raid';
  EFC.cfg.lootSeed = 1234;
  // fake ITEMS provider: two different items per container, counts from the seeded rng
  efcProvide('loot:roll', (t, rng) => [{ id: 'it_' + t, n: 1 + Math.floor(rng() * 3) }, { id: 'scrap', n: 1 + Math.floor(rng() * 5) }]);
  efcOn('world:changed', (id) => changed.push(id));
  efcOn('loot:give', (it, id) => given.push({ it, id }));
  const md = efcCall('map:data'), L = () => efcCall('world:list'), J = (o) => JSON.stringify(o);
  efcEmit('raid:begin');
  const list = L();
  out.mapN = md.containers.length; out.n = list.length; out.changedN = changed.length;
  out.ground = list.every((c) => isFinite(c.y) && Math.abs(c.y - groundHeight(c.x, c.z, gy0(c.x, c.z) + 0.3)) < 1e-6 && c.y - gy0(c.x, c.z) < 1);
  out.inBounds = list.every((c) => c.x >= MAP.x0 - 1 && c.x <= MAP.x1 + 1 && c.z >= MAP.z0 - 1 && c.z <= MAP.z1 + 1);
  out.meshes = scene.children.filter((m) => /^efc-container-/.test(m.name)).length;
  out.static = scene.children.filter((m) => /^efc-container-/.test(m.name)).every((m) => m.matrixAutoUpdate === false);
  const first = J(list);
  efcEmit('raid:begin');
  out.reproducible = J(L()) === first;
  out.uniqueIds = new Set(L().map((c) => c.id)).size === L().length;

  // near
  const c0 = L()[0], P = PL.ent;
  P.pos.set(c0.x + 1, c0.y, c0.z);
  out.near = efcCall('world:near', P.pos, EFC.cfg.interactR) === c0;
  out.nearNone = efcCall('world:near', { x: c0.x + 50, y: c0.y, z: c0.z + 50 }, 0.5) === null;

  // take: exactly once, list updated
  const before = c0.items.length, firstItem = c0.items[0].id;
  changed.length = 0;
  efcCall('world:take', c0.id, 0);
  out.take1 = given.length === 1 && given[0].it.id === firstItem && given[0].id === c0.id && L().find((c) => c.id === c0.id).items.length === before - 1;
  out.takeChanged = changed.includes(c0.id);
  // two players racing for the same item: both ask for idx 0 holding item 'a'
  const rid = efcCall('world:spawn', 'crate', { x: P.pos.x, y: P.pos.y, z: P.pos.z + 1, yaw: 0 }, [{ id: 'a', n: 1 }, { id: 'b', n: 1 }], '');
  const g0 = given.length;
  NET.remotes.set('p2', { pos: new THREE.Vector3(P.pos.x, P.pos.y, P.pos.z + 1.5), alive: true });
  EFC.netHost['w:take']({ id: rid, idx: 0, item: 'a' }, 'local');
  EFC.netHost['w:take']({ id: rid, idx: 0, item: 'a' }, 'p2');
  const rc = L().find((c) => c.id === rid);
  out.race = given.length === g0 + 1 && rc.items.length === 1 && rc.items[0].id === 'b';
  // guest take (no network offline: the host side still updates the container, the give goes nowhere)
  EFC.netHost['w:take']({ id: rid, idx: 0, item: 'b' }, 'p2');
  out.guestTake = L().find((c) => c.id === rid).items.length === 0 && given.length === g0 + 1;
  out.crateStays = !!L().find((c) => c.id === rid);
  out.emptyLook = scene.getObjectByName('efc-container-' + rid).userData.efcOpen === true;
  // an unknown guest, a garbage request
  EFC.netHost['w:take']({ id: c0.id, idx: 0, item: L().find((c) => c.id === c0.id).items[0].id }, 'nobody');
  EFC.netHost['w:take']({ id: c0.id, idx: 'x' }, 'local');
  out.unknownRefused = L().find((c) => c.id === c0.id).items.length === before - 1;
  NET.remotes.delete('p2');
  // too far
  const c1 = L()[1], n1 = c1.items.length, g1 = given.length;
  P.pos.set(c1.x + EFC.cfg.interactR + 2.5, c1.y, c1.z);
  efcCall('world:take', c1.id, 0);
  out.farRefused = given.length === g1 && L().find((c) => c.id === c1.id).items.length === n1;

  // put: away from containers -> a new drop at the player's feet; take it back -> the drop disappears
  P.pos.set(c1.x + 8, gy0(c1.x + 8, c1.z), c1.z);
  const nBefore = L().length;
  efcCall('world:put', null, { id: 'pistol', n: 1, mag: 7, res: 21 });
  const drop = L().find((c) => c.kind === 'drop');
  out.putDrop = L().length === nBefore + 1 && drop && drop.items[0].mag === 7 && Math.hypot(drop.x - P.pos.x, drop.z - P.pos.z) < 1;
  efcCall('world:take', drop.id, 0);
  out.dropGone = !L().find((c) => c.id === drop.id) && given[given.length - 1].it.id === 'pistol';
  // put into a container near the player
  P.pos.set(c1.x + 1, c1.y, c1.z);
  efcCall('world:put', c1.id, { id: 'scrap', n: 2 });
  out.putInto = L().find((c) => c.id === c1.id).items.length === n1 + 1;
  efcCall('world:put', c1.id, { id: 5, n: -1 }); // garbage item: ignored
  out.putGarbage = L().find((c) => c.id === c1.id).items.length === n1 + 1 && L().length === nBefore;

  // world:body: garbage refused, valid accepted
  const nb = L().length, bad = [
    null, { pos: { x: NaN, y: 0, z: 0 }, items: [] }, { pos: { x: 1e6, y: 0, z: 0 }, items: [] }, { pos: { x: 0, y: 0, z: 0 }, items: 'x' },
    { pos: { x: 0, y: 0, z: 0 }, items: [{ id: 'a', n: 1.5 }] }, { pos: { x: 0, y: 0, z: 0 }, items: [{ id: 3, n: 1 }] },
    { pos: { x: 0, y: 0, z: 0 }, items: Array.from({ length: 41 }, () => ({ id: 'a', n: 1 })) }, { pos: { x: 0, y: 0, z: 0 }, items: [{ id: 'a', n: 1, mag: 'x' }] },
  ];
  for (const d of bad) EFC.netHost['w:body'](JSON.parse(JSON.stringify(d)), 'p2');
  out.bodyGarbage = L().length === nb;
  efcCall('world:body', { x: P.pos.x, y: P.pos.y, z: P.pos.z }, [{ id: 'rifle', n: 1, mag: 30, res: 90 }], 'A very long player name over the limit');
  const body = L().find((c) => c.kind === 'body');
  out.body = L().length === nb + 1 && body && body.name.length === 24 && body.items[0].res === 90;
  out.spawnGuest = efcCall('world:spawn', 'crate', { x: 0, y: 0, z: 0 }, [], '') !== null; // offline we are the host

  // snapshot round trip: a fresh simulated client rebuilds the same state from the JSON of 'w:all', then 'w:upd' and 'w:del'
  const snap = JSON.parse(JSON.stringify(efcWorldSnapshot())), want = J(L());
  efcWorldClear();
  out.cleared = L().length === 0 && scene.children.filter((m) => /^efc-container-/.test(m.name)).length === 0;
  EFC.netClient['w:all'](snap);
  out.roundTrip = J(L()) === want && scene.children.filter((m) => /^efc-container-/.test(m.name)).length === L().length;
  EFC.netClient['w:upd'](JSON.parse(J({ id: body.id, items: [] })));
  EFC.netClient['w:del'](JSON.parse(J({ id: c1.id })));
  out.updDel = L().find((c) => c.id === body.id).items.length === 0 && !L().find((c) => c.id === c1.id);

  // host migration: this machine was a guest and becomes the host -> keeps its copy, new ids never collide
  EFC_W.wasHost = false; EFC_W.next = 1;
  const keep = J(L());
  efcEmit('tick', 1 / 30);
  const nid = efcCall('world:spawn', 'drop', { x: P.pos.x, y: P.pos.y, z: P.pos.z }, [{ id: 'a', n: 1 }], '');
  out.migration = EFC_W.wasHost === true && J(L().filter((c) => c.id !== nid)) === keep && L().filter((c) => c.id === nid).length === 1;

  // raid:over keeps the world; match:left clears it
  efcEmit('raid:over', { result: 'dead' });
  out.overKeeps = L().length > 0;
  efcEmit('match:left');
  out.leftClears = L().length === 0;

  // ground weapons off in raid, unchanged in other modes
  const def = WEAPONS[Object.keys(WEAPONS)[0]], q = new THREE.Quaternion(), v = new THREE.Vector3();
  out.dropRaid = dropWeapon(def, 5, 5, P.pos.clone(), q, v) === null;
  updateDrops(1 / 30);
  out.dropRaidList = DROP.list.length === 0 && DROP.cur === null;
  MATCH.mode = 'tdm';
  out.dropTdm = dropWeapon(def, 5, 5, P.pos.clone(), q, v) !== null;
  clearDrops();
  MATCH.mode = 'raid';
  return out;
});
for (const [k, v] of Object.entries(r)) if (typeof v === 'boolean') ok(v, k); else console.log('     ' + k + ' = ' + v);
ok(r.n > 0 && r.n === r.mapN, 'one container per map entry (' + r.n + '/' + r.mapN + ')');
ok(r.meshes === r.n, 'one mesh per container');

// a few game seconds in raid mode with the world live: no page errors
const ran = await simRun(page, 3, 'PL.ent.health = 100;');
ok(ran >= 2.9, 'logic runs in raid mode');

if (process.env.SHOT) {
  await page.evaluate(() => {
    efcEmit('raid:begin');
    const P = PL.ent, yaw = P.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), sx = Math.cos(yaw), sz = -Math.sin(yaw);
    const kinds = [['crate', 1], ['locker', 1], ['bag', 1], ['body', 1], ['drop', 1], ['crate', 0]];
    kinds.forEach(([k, full], i) => {
      const x = P.pos.x + fx * 4 + sx * (i - 2.5) * 1.3, z = P.pos.z + fz * 4 + sz * (i - 2.5) * 1.3;
      efcCall('world:spawn', k, { x, y: groundHeight(x, z, gy0(x, z) + 0.3), z, yaw: yaw + 0.3 }, full ? [{ id: 'a', n: 1 }] : [], '');
    });
    PL.pitch = -0.35;
  });
  await page.waitForTimeout(8000);
  await page.screenshot({ path: process.env.SHOT });
  console.log('screenshot ' + process.env.SHOT);
}
await browser.close();
if (errors.length) { console.error(errors.slice(0, 20).join('\n')); fails.push('page errors'); }
console.log(fails.length ? 'test-world FAILED: ' + fails.join(', ') : 'test-world ok');
process.exit(fails.length ? 1 : 0);
