// NETLOBBY test: two clients (host and guest pages, fakepeer) through a raid lobby, a raid match and a team deathmatch lobby.
// node tools/dev/efc/test-net.mjs   (needs a build: python3 build.py). Exits non-zero on failure.
import { openPair, createLobby, joinLobby, launch, waitInMatch, stepBoth, settle } from './net2.mjs';

const MAP = process.env.MAP || 'simoun', KEEP = 'PL.ent.health = 100;';
// MODES.raid comes from the RAID package; when it is missing in this worktree, a minimal stand-in (test page only)
const RAID_STANDIN = `window.EFC_RAID_STANDIN = () => { if (!MODES.raid) { MODES.raid = Object.assign({}, MODES.tdm, { name: 'Raid', btn: 'Raid', sub: 'Raid', key: 'limit' }); return true; } return false; };`;
let fails = 0;
const ok = (cond, msg, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg + (extra !== undefined ? ' ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
const t0 = Date.now(), wall = () => Math.round((Date.now() - t0) / 1000) + 's';

const rig = await openPair({ map: MAP, init: RAID_STANDIN });
const { host, guest } = rig, both = [host, guest];
try {
  const standin = await host.evaluate(() => window.EFC_RAID_STANDIN()); await guest.evaluate(() => window.EFC_RAID_STANDIN());
  console.log(`pages ready (${wall()}), MODES.raid ${standin ? 'stand-in' : 'from RAID'}`);

  // (a) raid lobby, join by code, squads
  const code = await createLobby(host, { map: MAP });
  const h0 = await host.evaluate(() => ({ mode: NET.cfg.mode, time: NET.cfg.time, me: NET.me, t: NET.players.get(NET.me).t }));
  ok(h0.mode === 'raid', '(a) a new lobby defaults to raid', h0);
  ok(h0.time === (await host.evaluate(() => EFC.cfg.raidMinutes)), '(a) raid length from EFC.cfg.raidMinutes', h0.time);
  await joinLobby(guest, code);
  await settle(400);
  const gid = await guest.evaluate(() => NET.me);
  const la = await host.evaluate((gid) => ({ ids: [...NET.players.keys()], g: NET.players.get(gid) && NET.players.get(gid).t }), gid);
  const lg = await guest.evaluate(() => ({ ids: [...NET.players.keys()], cfg: NET.cfg }));
  ok(la.ids.length === 2 && la.ids.includes(gid), '(a) host lists both players', la.ids);
  ok(lg.ids.length === 2 && lg.ids.includes(h0.me), '(a) guest lists both players', lg.ids);
  ok(lg.cfg.mode === 'raid', '(a) guest sees a raid lobby');
  ok(la.g === 0, '(a) new player goes to the first squad with room (squad 1)', la.g);
  // the guest cycles its own squad, the host cycles the guest's
  await guest.evaluate(() => netTeamSwap(NET.me)); await settle(400);
  ok((await host.evaluate((gid) => NET.players.get(gid).t, gid)) === 1, '(a) guest moves itself to squad 2');
  await host.evaluate((gid) => netTeamSwap(gid), gid); await settle(400);
  ok((await guest.evaluate(() => NET.players.get(NET.me).t)) === 2, '(a) host moves the guest to squad 3, guest sees it');
  // squad rules on a filled roster (helpers, with a temporary player list)
  const rules = await host.evaluate(() => {
    const keep = new Map(NET.players), fake = (id, t) => NET.players.set(id, { id, t });
    NET.players.clear(); fake('a', 0); fake('b', 0); fake('c', 0); fake('d', 1); fake('e', 1); fake('f', 1); fake('g', 2);
    const r = { first: efcNetFirstSquad(efcNetCounts()), skipFull: efcNetNextTeam(2, 'g'), wrap: efcNetNextTeam(3, 'x') };
    fake('h', 2); fake('i', 2); fake('j', 3); fake('k', 3); fake('l', 3); r.allFull = efcNetNextTeam(0, 'a'); // every other squad full: stays
    NET.players.clear(); for (const [k, v] of keep) NET.players.set(k, v);
    const st = netStage(); r.cols = st.cols.map((c) => c.head.replace(/<[^>]+>/g, ''));
    return r;
  });
  ok(rules.first === 2, '(a) first squad with room skips full squads', rules.first);
  ok(rules.skipFull === 3 && rules.wrap === 2, '(a) cycling skips full squads and wraps', rules);
  ok(rules.allFull === 0, '(a) no squad with room: the player stays', rules.allFull);
  ok(rules.cols.length === 4 && rules.cols.every((h, i) => /^Squad [1-4]/.test(h)), '(a) lobby shows Squad 1..4 columns', rules.cols);
  await guest.evaluate(() => netTeamSwap(NET.me)); await settle(400); // squad 3 -> squad 4
  await guest.evaluate(() => netTeamSwap(NET.me)); await settle(400); // squad 4 -> squad 1 (host there, room left)
  await guest.evaluate(() => netTeamSwap(NET.me)); await settle(400); // squad 1 -> squad 2
  ok((await host.evaluate((gid) => NET.players.get(gid).t, gid)) === 1, '(a) guest back in squad 2 after a full cycle');
  // kill limit and length are fixed in a raid
  await host.evaluate(() => { netSetupSet('limit', 20); netSetupSet('time', 5); });
  const cf = await host.evaluate(() => NET.cfg);
  ok(cf.time === 20 && cf.limit === 9999, '(a) raid ignores the kill-limit and length settings', cf);

  // (b) launch: both play the raid, each sees the other's soldier as remote with the right squad
  await launch(host);
  await Promise.all([waitInMatch(host), waitInMatch(guest)]);
  console.log(`in match (${wall()})`);
  await stepBoth(both, 2, KEEP);
  const sb = async (p, otherId) => p.evaluate((oid) => {
    const r = NET.remotes.get(oid);
    const bots = entities.filter((e) => e.netBot || e.remoteBot);
    return { state: MATCH.state, mode: MATCH.mode, cfgMode: NET.cfg.mode, mySquad: PL.ent.squad, myTeam: PL.ent.team, remote: !!r && r.isRemote && entities.includes(r), rSquad: r && r.squad, rTeam: r && r.team,
      bots: bots.length, botsW: bots.every((e) => e.squad === 'w'), allBots: entities.filter((e) => !e.isPlayer && !e.isRemote).every((e) => e.netBot) };
  }, otherId);
  const bh = await sb(host, gid), bg = await sb(guest, h0.me);
  ok(bh.state === 'playing' && bh.cfgMode === 'raid' && bh.mode === 'raid', '(b) host playing a raid', bh);
  ok(bg.state === 'playing' && bg.cfgMode === 'raid' && bg.mode === 'raid', '(b) guest playing a raid', bg);
  ok(bh.mySquad === 0 && bg.mySquad === 1, '(b) PL.ent.squad is my lobby squad', [bh.mySquad, bg.mySquad]);
  ok(bh.myTeam === 0 && bg.myTeam === 0 && bh.rTeam === 0 && bg.rTeam === 0, '(b) every human keeps team 0');
  ok(bh.remote && bh.rSquad === 1, '(b) host sees the guest as remote in squad 2', bh);
  ok(bg.remote && bg.rSquad === 0, '(b) guest sees the host as remote in squad 1', bg);
  ok(bh.bots > 0 && bh.botsW && bh.allBots, '(b) all host bots active, squad w', bh);
  ok(bg.bots > 0 && bg.botsW, '(b) guest copies of host bots carry squad w', bg);
  const so = [await host.evaluate((gid) => [efcCall('squad:of', gid), efcCall('squad:of', NET.me)], gid), await guest.evaluate((hid) => [efcCall('squad:of', hid), efcCall('squad:of', NET.me)], h0.me)];
  ok(JSON.stringify(so) === '[[1,0],[0,1]]', "(b) service 'squad:of' gives lobby squads on both machines", so);

  // (c) bus round trip
  await host.evaluate(() => {
    window.T = { ping: [], pong: [], only: [] };
    efcNetOnHost('t:ping', (d, from) => { T.ping.push([d, from]); efcNetToAll('t:pong', 2); efcNetTo(from, 't:only', 3); });
    efcNetOnClient('t:pong', (d) => T.pong.push(d)); efcNetOnClient('t:only', (d) => T.only.push(d));
  });
  await guest.evaluate(() => { window.T = { pong: [], only: [] }; efcNetOnClient('t:pong', (d) => T.pong.push(d)); efcNetOnClient('t:only', (d) => T.only.push(d)); efcNetToHost('t:ping', 1); });
  await settle(300); await stepBoth(both, 0.4, KEEP); await settle(300);
  const ch = await host.evaluate(() => T), cg = await guest.evaluate(() => T);
  ok(ch.ping.length === 1 && ch.ping[0][0] === 1 && ch.ping[0][1] === gid, '(c) host handler got the guest ping with its id', ch.ping);
  ok(ch.pong.length === 1 && ch.pong[0] === 2 && cg.pong.length === 1 && cg.pong[0] === 2, '(c) efcNetToAll reaches host and guest', [ch.pong, cg.pong]);
  ok(cg.only.length === 1 && cg.only[0] === 3 && ch.only.length === 0, '(c) efcNetTo(guest) reaches only the guest', [ch.only, cg.only]);

  // (d) the guest moves, the host's copy follows
  const before = await host.evaluate((gid) => { const r = NET.remotes.get(gid); return [r.pos.x, r.pos.z]; }, gid);
  await guest.evaluate(() => { PL.ent.pos.x += 3; PL.ent.pos.z += 2; PL.ent.vel.set(0, 0, 0); });
  await stepBoth(both, 1, KEEP);
  const gp = await guest.evaluate(() => [PL.ent.pos.x, PL.ent.pos.z]);
  const hp = await host.evaluate((gid) => { const r = NET.remotes.get(gid); return [r.pos.x, r.pos.z]; }, gid);
  const moved = Math.hypot(hp[0] - before[0], hp[1] - before[1]), gap = Math.hypot(hp[0] - gp[0], hp[1] - gp[1]);
  ok(moved > 1.5 && gap < 1, '(d) host copy follows the guest', { moved: +moved.toFixed(2), gap: +gap.toFixed(2) });

  // (e) out flag: the guest's raid is over, the host's copy is gone within 2 s of game time
  await guest.evaluate(() => { PL.ent.out = true; });
  let gone = null;
  for (let s = 0; s < 10 && !gone; s++) {
    await stepBoth(both, 0.2, KEEP);
    const r = await host.evaluate((gid) => { const e = NET.remotes.get(gid); return e ? { alive: e.alive, vis: e.model.root.visible, out: !!e.out, t: MATCH.time } : null; }, gid);
    if (r && !r.alive && !r.vis && r.out) gone = { ...r, after: +((s + 1) * 0.2).toFixed(1) };
  }
  ok(!!gone, '(e) guest out: host copy not alive and hidden within 2 s', gone);
  await stepBoth(both, 1, KEEP);
  const still = await host.evaluate((gid) => { const e = NET.remotes.get(gid); return { alive: e.alive, vis: e.model.root.visible }; }, gid);
  ok(!still.alive && !still.vis, '(e) an out soldier stays gone', still);
  // a dead human is not revived on another machine: the host's copy of the guest, once dead, ignores "alive" again
  const rev = await host.evaluate((gid) => { const e = NET.remotes.get(gid); e.out = false; e.netDied = true; return efcNetMayRevive(e); }, gid);
  ok(rev === false, '(e) a dead human in a raid may not be revived');

  // end: the host ends the raid, the guest goes through matchFinish ('end' message)
  await host.evaluate(() => matchFinish());
  await settle(400); await stepBoth(both, 0.4);
  const eh = await host.evaluate(() => MATCH.state), eg = await guest.evaluate(() => ({ s: MATCH.state, tl: Math.round(MATCH.timeLeft) }));
  ok(eh === 'finish' && eg.s === 'finish' && eg.tl > 60, '(end) host ends the raid, guest finishes with it', [eh, eg]);

  // (f) back to the lobby, switch to team deathmatch, launch again
  await host.evaluate(() => toMenu()); await guest.evaluate(() => toMenu()); await settle(600);
  await host.evaluate(() => netSetupSet('mode', 'tdm')); await settle(400);
  const lt = await guest.evaluate(() => ({ phase: NET.phase, mode: NET.cfg.mode, t: [...NET.players.values()].map((p) => p.t) }));
  ok(lt.phase === 'lobby' && lt.mode === 'tdm' && lt.t.every((t) => t === 0 || t === 1), '(f) tdm lobby with two teams', lt);
  await launch(host);
  await Promise.all([waitInMatch(host), waitInMatch(guest)]);
  await stepBoth(both, 1.5, KEEP);
  const fh = await host.evaluate((gid) => ({ s: MATCH.state, m: MATCH.mode, r: !!NET.remotes.get(gid), bots: entities.filter((e) => e.netBot).length }), gid);
  const fg = await guest.evaluate((hid) => ({ s: MATCH.state, m: MATCH.mode, r: !!NET.remotes.get(hid) }), h0.me);
  ok(fh.s === 'playing' && fh.m === 'tdm' && fh.r && fg.s === 'playing' && fg.m === 'tdm' && fg.r, '(f) a tdm lobby still launches', [fh, fg]);
} catch (e) {
  fails++; console.log('FAIL exception: ' + (e && e.stack || e));
} finally {
  await rig.close();
}
if (rig.errors.length) { fails++; console.log('FAIL page errors:\n' + rig.errors.slice(0, 20).join('\n')); }
console.log(`${fails ? 'FAILED' : 'ALL PASSED'} (${wall()})`);
process.exit(fails ? 1 : 0);
