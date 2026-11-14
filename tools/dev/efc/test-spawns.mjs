// P1 spawns test: for every map, its derived raid data (Warden number, raidable or not and why) must match EFC.raidable; on each raidable
// map, raid starts with the player idle for 30 game seconds: zero damage taken, no Warden within 40 m at t = 0, living Wardens never above
// the map's number. Claudov: STARTS raid starts per insert (insert forced); other raidable maps: STARTS raid starts. Then one 200 s raid per
// raidable map in which a Warden is killed and comes back as a reinforcement, the count never above the number. One-shot rule checked once.
// NODE_PATH=/opt/node22/lib/node_modules node tools/dev/efc/test-spawns.mjs ; MAPS=claudov,simoun STARTS=10 IDLE=30 LONG=200
import { openGame } from './harness.mjs';
const STARTS = +(process.env.STARTS || 10), IDLE = +(process.env.IDLE || 30), LONG = +(process.env.LONG || 200);
const { browser, page, errors } = await openGame({ settings: { map: 'claudov', mode: 'raid' } });
const fails = [], ok = (cond, msg, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg + (info !== undefined ? ' ' + JSON.stringify(info) : '')); if (!cond) fails.push(msg); };
const all = await page.evaluate(() => MAPS.filter((m) => m.ok).map((m) => m.id));
const maps = process.env.MAPS ? process.env.MAPS.split(',') : ['claudov'].concat(all.filter((id) => id !== 'claudov'));
const summary = [];
// one raid start: returns what the checks need (stepped in slices so a long evaluate does not look like a hang)
async function start(force) {
  return page.evaluate((force) => {
    if (force === null) delete EFC.cfg.insertForce; else EFC.cfg.insertForce = force;
    if (MATCH.state !== 'menu') endMatch();
    Settings.mode = 'raid'; LOCK.fallback = true; startMatch({});
    const me = PL.ent, ws = entities.filter((e) => e.squad === 'w' && e.alive && !e.isPlayer);
    window.TS = { n: EFC.wd.n, max: ws.length, hurt: 0, h0: me.health, at: [me.pos.x, me.pos.z] };
    const near = ws.length ? Math.min(...ws.map((w) => hyp(w.pos.x - me.pos.x, w.pos.z - me.pos.z))) : 999;
    const ins = efcCall('raid:inserts');
    return { n: EFC.wd.n, alive: ws.length, near: +near.toFixed(1), ins: ins.used.map((u) => u.i), mode: MATCH.mode };
  }, force);
}
async function idle(secs) {
  for (let t = 0; t < secs; t += 10) {
    await page.evaluate((s) => {
      const me = PL.ent;
      for (let i = 0; i < s * 30 && MATCH.state === 'playing'; i++) {
        matchTick(1 / 30, false);
        TS.max = Math.max(TS.max, entities.filter((e) => e.squad === 'w' && e.alive && !e.isPlayer).length);
        if (me.health < TS.h0 || !me.alive) TS.hurt = Math.max(TS.hurt, TS.h0 - Math.max(0, me.health)) || 1;
      }
    }, Math.min(10, secs - t));
  }
  return page.evaluate(() => ({ max: TS.max, hurt: TS.hurt, n: TS.n, alive: PL.ent.alive, state: MATCH.state }));
}

for (const id of maps) {
  const t0 = Date.now();
  const st = await page.evaluate(async (id) => {
    if (MATCH.state !== 'menu') { endMatch(); toMenu('main'); }
    Settings.map = id; await mapEnsure(id);
    const md = efcCall('map:data'), def = MAP_DEFS[id];
    const raidable = !!md && md.inserts.length > 0 && md.raidable !== false;
    // static insert rules, as applied to this map (derived maps: at the relaxed distances they were chosen with)
    const o = md && md.rule ? { post: md.rule.post, extract: md.rule.extract } : {}, bad = [];
    if (md) md.inserts.forEach((p, i) => { const w = efcInsertWhy(p, md, o); if (w) bad.push(i + ': ' + w); });
    if (md) for (let i = 0; i < md.inserts.length; i++) for (let j = i + 1; j < md.inserts.length; j++) {
      const a = md.inserts[i], b = md.inserts[j]; if (lineClear(efcEyeAt(a.x, a.z), efcEyeAt(b.x, b.z))) bad.push(`inserts ${i} and ${j} see each other`);
    }
    return { id, loaded: MAPL.id, n: efcWardenNumber(1), n4: efcWardenNumber(4), inserts: md ? md.inserts.length : 0, posts: md ? md.guards.length : 0,
      raidable, table: def.efc ? true : !!EFC.raidable[id], hand: !!def.efc, offered: efcCall('map:raidable', id), why: md ? md.why || 'hand-made raid data' : 'no map data', bad, rule: md && md.rule };
  }, id);
  ok(st.loaded === id, `${id}: map loaded`, st.loaded);
  // the table may be stricter than the derived data (a map can have hidden inserts and still fail the play checks below), never looser
  ok(!st.table || st.raidable, `${id}: a map offered for raids has hidden inserts`, { table: st.table, derived: st.raidable });
  ok(st.bad.length === 0, `${id}: inserts obey the hidden-insert rules`, st.bad);
  if (st.hand) ok(st.raidable, `${id}: must be raidable`);
  const line = { map: id, wardens: st.n, with4squads: st.n4, posts: st.posts, inserts: st.inserts, raidable: st.raidable, why: st.why };
  line.offered = st.table;
  if (!st.raidable || (!st.table && !process.env.ALL)) { summary.push(line); console.log('SUMMARY ' + JSON.stringify(line)); continue; } // ALL=1 also plays the maps that are not offered
  const forces = id === 'claudov' ? [...Array(st.inserts).keys()].flatMap((i) => Array(STARTS).fill(i)) : Array(STARTS).fill(null);
  const res = { starts: 0, minNear: 999, hurt: 0, over: 0, used: {} };
  for (const f of forces) {
    const s = await start(f);
    const r = await idle(IDLE);
    res.starts++; res.minNear = Math.min(res.minNear, s.near); res.used[s.ins[0]] = (res.used[s.ins[0]] || 0) + 1;
    if (r.hurt) res.hurt++;
    if (r.max > s.n || s.alive > s.n) res.over++;
    if (s.near < 40 || r.hurt || r.max > s.n || s.mode !== 'raid') console.log('  start', JSON.stringify({ f, s, r }));
    if (f !== null && s.ins[0] !== f) fails.push(`${id}: forced insert ${f} not used (${s.ins[0]})`);
  }
  ok(res.minNear >= 40, `${id}: no Warden within 40 m at t = 0 in ${res.starts} starts`, res.minNear);
  ok(res.hurt === 0, `${id}: no damage while idle ${IDLE} s in ${res.starts} starts`, res.hurt);
  ok(res.over === 0, `${id}: living Wardens never above ${st.n}`, res.over);
  // a long raid with a Warden death and its reinforcement
  await start(id === 'claudov' ? 0 : null);
  await page.evaluate(() => { TS.died = null; TS.back = -1; });
  const long = { killed: false };
  for (let t = 0; t < LONG; t += 10) {
    const r = await page.evaluate((t) => {
      const me = PL.ent;
      for (let i = 0; i < 300 && MATCH.state === 'playing'; i++) {
        me.health = 100; matchTick(1 / 30, false);
        if (t >= 10 && !TS.died) { const w = entities.find((e) => e.squad === 'w' && e.alive && !e.isPlayer); if (w) { applyDamage(w, 1000, me, 'test', true, new V3(0, 0, -1)); TS.died = w; TS.diedT = MATCH.time; } }
        if (TS.died && TS.back < 0 && TS.died.alive) TS.back = MATCH.time - TS.diedT;
        TS.max = Math.max(TS.max, entities.filter((e) => e.squad === 'w' && e.alive && !e.isPlayer).length);
      }
      return { t: Math.round(MATCH.time), max: TS.max, n: TS.n, back: TS.back, died: !!TS.died, state: MATCH.state };
    }, t);
    Object.assign(long, r);
  }
  ok(long.died && long.back > 0, `${id}: a Warden died and was reinforced within the ${LONG} s raid`, { back: +(+long.back).toFixed(1) });
  ok(long.max <= long.n, `${id}: living Wardens never above ${long.n} in the ${LONG} s raid`, long.max);
  Object.assign(line, { starts: res.starts, minNearAtStart: +res.minNear.toFixed(1), hurtStarts: res.hurt, maxAlive: Math.max(long.max), inserts_used: res.used, secs: Math.round((Date.now() - t0) / 1000) });
  summary.push(line);
  console.log('SUMMARY ' + JSON.stringify(line));
}
// one-shot rule (requirement 7), on the last raid
const os = await page.evaluate(() => {
  const me = PL.ent, ws = entities.filter((e) => e.squad === 'w' && !e.isPlayer), reg = ws.find((e) => !e.efcElite), el = ws.find((e) => e.efcElite);
  MATCH.time += 1; me.health = 100;
  const body = efcFilter('damage', 150, me, reg, 'test', false);
  MATCH.time += 1; me.health = 100; const head = efcFilter('damage', 150, me, reg, 'test', true);
  MATCH.time += 1; me.health = 100; const elite = el ? efcFilter('damage', 150, me, el, 'test', false) : 150;
  MATCH.time += 1; me.health = 60; const hurt = efcFilter('damage', 150, me, reg, 'test', false);
  me.health = 100; return { body, head, elite, hurt };
});
ok(os.body === 100 - 5 && os.head === 150 && os.elite === 150 && os.hurt === 150, 'one-shot rule: body hit capped to leave 5, headshot, elite and a hurt victim unchanged', os);
await browser.close();
console.log('--- one line per map ---');
for (const l of summary) console.log(`${l.map}: ${l.wardens} Wardens (${l.with4squads} with 4 squads), ${l.posts} posts, ${l.raidable ? 'raidable' : 'NOT raidable'}: ${l.why}` + (l.starts ? `; ${l.starts} starts, nearest Warden at start ${l.minNearAtStart} m, damage in ${l.hurtStarts}, most alive ${l.maxAlive}` : ''));
if (errors.length) ok(false, 'no page errors', errors.slice(0, 10));
console.log(fails.length ? `test-spawns: ${fails.length} FAILED` : 'test-spawns: all passed');
process.exit(fails.length ? 1 : 0);
