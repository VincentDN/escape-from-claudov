// ITEMS package tests: catalogue, inventory, stash, loot and vitals in a node vm with stubs, then one check in the real game page.
// node tools/dev/efc/test-items.mjs        (NO_BROWSER=1 skips the game-page check)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const FILES = ['00-efc-core.js', '20-efc-items.js', '21-efc-inventory.js', '22-efc-stash.js', '23-efc-vitals.js', '24-efc-loot-tables.js'];
let fails = 0, passes = 0;
const ok = (c, msg) => { if (c) passes++; else { fails++; console.error('FAIL ' + msg); } };
const near = (a, b) => Math.abs(a - b) < 1e-9;

const W = (cat, mag, reserve, name) => ({ name, cat, fam: cat === 'ar' ? 'rifle' : cat, mag, reserve, stats: { dmg: 0.5 } });
function makeCtx(store) {
  const ls = store || new Map();
  const ctx = {
    console, JSON, Math, Object, Array, Number, Set, Map,
    localStorage: { getItem: (k) => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: (k) => ls.delete(k) },
    WEAPONS: { m4: W('ar', 30, 150, 'M4A1'), mp5: W('smg', 30, 180, 'MP5'), l96: W('sniper', 5, 25, 'L96A1'), m1014: W('shotgun', 8, 32, 'M1014'),
      m9: W('pistol', 15, 60, 'M9'), ak47: W('ar', 30, 120, 'AK-47'), usp: W('pistol', 12, 60, 'USP .45'), aa12: Object.assign(W('shotgun', 8, 48, 'AA-12'), { fam: 'rifle' }) },
    MATCH: { mode: 'raid', state: 'playing', online: false },
    PL: { ent: { health: 100, alive: true } },
    msgs: [], puts: [],
  };
  ctx.hudMsg = (t) => ctx.msgs.push(t);
  vm.createContext(ctx);
  const src = FILES.map((f) => fs.readFileSync(path.join(REPO, 'src/efc', f), 'utf8')).join('\n')
    + '\nglobalThis.EFC = EFC; globalThis.call = efcCall; globalThis.emit = efcEmit; globalThis.filter = efcFilter; globalThis.provide = efcProvide; globalThis.rngOf = efcRng;';
  vm.runInContext(src, ctx, { filename: 'efc-items-bundle.js' });
  ctx.provide('world:put', (id, item) => ctx.puts.push([id, item]));
  return { ctx, ls };
}

/* ---------- catalogue ---------- */
{
  const { ctx } = makeCtx(), all = ctx.call('item:all');
  ok(all.length === Object.keys(ctx.WEAPONS).length + 26, 'catalogue size ' + all.length); // 18 engine weapons + 26 = 44 in the game
  ok(new Set(all.map((d) => d.id)).size === all.length, 'unique ids');
  for (const k of Object.keys(ctx.WEAPONS)) ok(ctx.call('item:def', 'w_' + k) && ctx.call('item:def', 'w_' + k).name === ctx.WEAPONS[k].name, 'weapon item w_' + k);
  ok(ctx.call('item:def', 'w_aa12').weapon.fam === 'shotgun', 'AA-12 fires shotgun shells');
  ok(all.filter((d) => d.kind === 'armor').map((d) => d.armor.cut).join() === '0.2,0.35,0.5', 'armour cuts');
  ok(all.filter((d) => d.kind === 'pack').map((d) => d.pack.cap).join() === '8,14,22', 'pack caps');
  ok(ctx.call('item:def', 'med_bandage').med.heal === 25 && ctx.call('item:def', 'med_kit').med.time === 4.5, 'med items');
  ok(all.filter((d) => d.kind === 'loot').length >= 12, 'valuables');
  ok(['rifle', 'smg', 'sniper', 'shotgun', 'pistol'].every((f) => all.some((d) => d.kind === 'ammo' && d.ammo.fam === f && d.stack > 1)), 'ammo per family, stackable');
  ok(all.every((d) => d.w > 0 && d.value > 0 && d.name), 'weights, values and names');
}

/* ---------- inventory ---------- */
{
  const { ctx } = makeCtx(), C = ctx.call;
  const inv = C('inv:new');
  ok(C('inv:cap', inv) === 8 && C('inv:weight', inv) === 0, 'empty inventory');
  // stacking
  ok(C('inv:add', inv, { id: 'ammo_rifle', n: 50 }) && C('inv:add', inv, { id: 'ammo_rifle', n: 30 }), 'add ammo');
  ok(inv.bag.length === 2 && inv.bag[0].n === 60 && inv.bag[1].n === 20, 'stacks fill to 60 then split');
  ok(C('inv:add', inv, { id: 'ammo_rifle', n: 10 }) && inv.bag.length === 2 && inv.bag[1].n === 30, 'stack first');
  // no shared references
  const src = { id: 'loot_wrench', n: 1 }; C('inv:add', inv, src); src.n = 99;
  ok(inv.bag[inv.bag.length - 1].n === 1, 'item copied on add');
  // auto-equip
  ok(C('inv:add', inv, { id: 'w_m4', n: 1 }) && inv.slots.primary.id === 'w_m4' && inv.slots.primary.mag === 30 && inv.slots.primary.res === 75, 'rifle to primary with default mag/res');
  ok(C('inv:add', inv, { id: 'w_m9', n: 1 }) && inv.slots.sidearm.id === 'w_m9', 'pistol to sidearm');
  ok(C('inv:add', inv, { id: 'armor_t2', n: 1 }) && inv.slots.armor.id === 'armor_t2', 'armour auto-equipped');
  ok(C('inv:add', inv, { id: 'w_ak47', n: 1 }) && inv.bag.some((i) => i.id === 'w_ak47'), 'second rifle to bag');
  // weight limit (bag base 8 kg)
  const w0 = C('inv:weight', inv);
  ok(!C('inv:add', inv, { id: 'armor_t3', n: 1 }) && near(C('inv:weight', inv), w0), 'over the limit refused, nothing changed');
  ok(!C('inv:add', inv, { id: 'nope', n: 1 }), 'unknown item refused');
  ok(C('inv:add', inv, { id: 'pack_l', n: 1 }) && C('inv:cap', inv) === 30, 'pack equipped raises the cap');
  ok(C('inv:add', inv, { id: 'armor_t3', n: 1 }), 'now it fits');
  // equip swap
  const ai = inv.bag.findIndex((i) => i.id === 'w_ak47');
  ok(C('inv:equip', inv, ai) && inv.slots.primary.id === 'w_ak47' && inv.bag[ai].id === 'w_m4', 'equip swaps into the same bag index');
  ok(!C('inv:equip', inv, 0), 'ammo cannot be equipped');
  // unequip and the pack rule
  ok(!C('inv:unequip', inv, 'pack'), 'pack removal refused when the bag would be over the limit');
  const t3 = inv.bag.findIndex((i) => i.id === 'armor_t3');
  ok(C('inv:remove', inv, t3).id === 'armor_t3', 'remove whole entry');
  ok(C('inv:unequip', inv, 'armor') && !inv.slots.armor && inv.bag.some((i) => i.id === 'armor_t2'), 'unequip armour to bag');
  // remove part of a stack
  const part = C('inv:remove', inv, 0, 15);
  ok(part.n === 15 && inv.bag[0].n === 45, 'remove part of a stack');
  ok(C('inv:remove', inv, 99) === null && C('inv:remove', inv, 0, 0) === null, 'bad remove gives null');
  // value, all, weapons
  ok(C('inv:all', inv).length === 3 + inv.bag.length, 'inv:all includes slots');
  ok(C('inv:value', inv) > 0, 'value');
  ok(JSON.stringify(C('inv:weapons', inv)) === '["ak47","m9"]', 'inv:weapons ' + JSON.stringify(C('inv:weapons', inv)));
  const wi = C('inv:weaponItems', inv); ok(wi[0] === inv.slots.primary && wi[1].id === 'w_m9', 'weaponItems are the live slot items');
  const e2 = C('inv:new'); C('inv:add', e2, { id: 'w_usp', n: 1 });
  ok(JSON.stringify(C('inv:weapons', e2)) === '["usp"]' && C('inv:weaponItems', e2)[0] === null, 'empty primary omitted');
  // equip into an empty slot and an unequip over the limit
  const e3 = C('inv:new'); e3.slots.armor = { id: 'armor_t3', n: 1 };
  ok(!C('inv:unequip', e3, 'armor'), 'unequip over the limit refused');
  // loot:give
  ctx.EFC.inv = C('inv:new'); let changed = 0; ctx.EFC.hooks['inv:changed'] = [() => changed++];
  ctx.emit('loot:give', { id: 'loot_chrono', n: 1 }, 'c1');
  ok(ctx.EFC.inv.bag[0].id === 'loot_chrono' && changed === 1, 'loot:give adds');
  ctx.emit('loot:give', { id: 'armor_t3', n: 1 }, 'c1'); // auto-equips (slot empty)
  ctx.emit('loot:give', { id: 'armor_t3', n: 1 }, 'c2'); // 9 kg: does not fit
  ok(ctx.puts.length === 1 && ctx.puts[0][0] === 'c2' && ctx.msgs.length === 1 && changed === 3, 'loot:give puts back when full and tells the player');
}

/* ---------- stash ---------- */
{
  const { ctx, ls } = makeCtx(), C = ctx.call;
  const st = C('stash:get');
  const ws = (l) => l.filter((i) => i.id.startsWith('w_'));
  ok(ws(st.items).length + ws(C('inv:all', st.loadout)).length === 4, 'starter: four weapons');
  ok(st.loadout.slots.primary && st.loadout.slots.sidearm && st.loadout.slots.armor.id === 'armor_t1' && st.loadout.slots.pack.id === 'pack_s', 'starter loadout equipped');
  ok(st.items.some((i) => i.id === 'med_kit') && C('inv:all', st.loadout).some((i) => i.id === 'med_bandage'), 'starter meds');
  st.items.length = 0; ok(C('stash:get').items.length > 0, 'stash:get returns a copy');
  // moves
  ok(C('stash:toStash', 'armor') && !C('stash:get').loadout.slots.armor, 'slot to stash');
  const ai = C('stash:get').items.findIndex((i) => i.id === 'armor_t1');
  ok(C('stash:toLoadout', ai) && C('stash:get').loadout.slots.armor.id === 'armor_t1', 'stash to loadout equips');
  ok(JSON.parse(ls.get('efc_stash_v1')).loadout.slots.armor.id === 'armor_t1', 'saved after each move');
  ok(!C('stash:toLoadout', 999) && !C('stash:toStash', 'nope'), 'bad moves refused');
  // kit / commit: extracted keeps everything
  const kit = C('raid:kit');
  ok(kit.slots.primary && C('inv:all', C('stash:get').loadout).length === 0, 'kit taken out of the stash');
  ok(JSON.parse(ls.get('efc_stash_v1')).loadout.bag.length === 0, 'kit removal saved');
  kit.slots.primary.mag = 3; C('inv:add', kit, { id: 'loot_dispatch', n: 1 });
  const before = C('stash:get').items.length;
  C('raid:commit', 'extracted', kit);
  const after = C('stash:get');
  ok(after.items.some((i) => i.id === 'loot_dispatch') && after.items.some((i) => i.id === 'w_mp5' && i.mag === 3) && after.items.length > before, 'extracted: items banked with their rounds');
  ok(C('inv:all', after.loadout).length === 0, 'loadout empty after commit');
  // dead loses everything
  const i2 = after.items.findIndex((i) => i.id === 'w_ak47'); C('stash:toLoadout', i2);
  const n2 = C('stash:get').items.length, kit2 = C('raid:kit');
  ok(kit2.slots.primary.id === 'w_ak47', 'kit carries the chosen rifle');
  C('raid:commit', 'dead', kit2);
  ok(C('stash:get').items.length === n2 && !C('stash:get').items.some((i) => i.id === 'w_ak47'), 'dead: kit lost');
  // free pistol: stash with no weapon
  const empty = new Map([['efc_stash_v1', JSON.stringify({ v: 1, items: [{ id: 'loot_wrench', n: 1 }], loadout: { slots: {}, bag: [] } })]]);
  const B = makeCtx(empty).ctx;
  ok(B.call('stash:get').fallback === true, 'fallback flagged when no weapon is owned');
  const fk = B.call('raid:kit');
  ok(fk.slots.sidearm && fk.slots.sidearm.free === true && B.call('inv:weapons', fk).length === 1, 'free pistol added to an unarmed kit');
  B.call('raid:commit', 'extracted', fk);
  ok(!B.call('stash:get').items.some((i) => i.free || i.id.startsWith('w_')), 'free pistol never banked');
  ok(B.call('raid:kit').slots.sidearm.free === true, 'player can still play again');
  // a bag weapon is equipped rather than adding the free pistol
  const bagW = new Map([['efc_stash_v1', JSON.stringify({ v: 1, items: [], loadout: { slots: {}, bag: [{ id: 'w_mp5', n: 1 }] } })]]);
  const bk = makeCtx(bagW).ctx.call('raid:kit');
  ok(bk.slots.primary && bk.slots.primary.id === 'w_mp5' && !bk.slots.sidearm, 'bag weapon equipped for the raid');
  // corrupt storage
  for (const bad of ['{not json', 'null', '[]', '{"v":2}', '{"v":1,"items":"x"}', JSON.stringify({ v: 1, items: [null, 5, { id: 'zzz' }, { id: 'ammo_smg', n: 'many' }], loadout: { slots: { primary: { id: 'w_m9' }, armor: 7 }, bag: 'x' } })]) {
    let threw = false, s;
    try { s = makeCtx(new Map([['efc_stash_v1', bad]])).ctx.call('stash:get'); } catch (e) { threw = true; }
    ok(!threw && s && Array.isArray(s.items) && s.loadout && Array.isArray(s.loadout.bag), 'corrupt storage recovered: ' + bad.slice(0, 30));
    if (bad.includes('zzz')) ok(s.items.length === 1 && s.items[0].n === 1 && !s.loadout.slots.primary, 'invalid entries dropped, pistol not kept in primary');
  }
  const T = makeCtx(); T.ctx.localStorage.getItem = () => { throw new Error('denied'); }; T.ctx.localStorage.setItem = () => { throw new Error('denied'); };
  let threw = false; try { T.ctx.call('stash:get'); T.ctx.call('raid:kit'); } catch (e) { threw = true; } ok(!threw, 'storage that throws');
}

/* ---------- loot ---------- */
{
  const { ctx } = makeCtx(), C = ctx.call;
  const tables = ['crate', 'locker', 'bag', 'weapons', 'medical', 'warden', 'warden_elite'];
  let allValid = true, armourT3 = 0, n = 0;
  const counts = {};
  for (const t of tables) for (let s = 1; s <= 300; s++) {
    const items = C('loot:roll', t, ctx.rngOf(s));
    for (const it of items) {
      const d = C('item:def', it.id); n++;
      if (!d || !(it.n >= 1) || it.n > (d.stack || 1) || (d.kind === 'weapon' && !(it.mag >= 1 && it.res >= 0))) { allValid = false; console.error('bad', t, it); }
      counts[it.id] = (counts[it.id] || 0) + 1; if (it.id === 'armor_t3') armourT3++;
    }
    if (t.startsWith('warden')) ok(items.some((i) => i.id.startsWith('w_')), t + ' carries a weapon');
  }
  ok(allValid && n > 1000, 'loot rolls give valid items (' + n + ')');
  ok(JSON.stringify(C('loot:roll', 'crate', ctx.rngOf(42))) === JSON.stringify(C('loot:roll', 'crate', ctx.rngOf(42))), 'deterministic for a seeded rng');
  ok(JSON.stringify(C('loot:roll', 'warden_elite', ctx.rngOf(7))) === JSON.stringify(C('loot:roll', 'warden_elite', ctx.rngOf(7))), 'warden deterministic');
  ok((counts.ammo_rifle || 0) > armourT3 * 5 && (counts.med_bandage || 0) > (counts.loot_dispatch || 0) * 5, 'common ammo and bandages, rare tier 3 and top valuables');
  ok(C('loot:roll', 'nope').length === 0 && Array.isArray(C('loot:roll', 'crate')), 'unknown table empty, default rng works');
  const val = (t) => { let v = 0; for (let s = 1; s <= 200; s++) v += C('loot:roll', t, ctx.rngOf(s)).reduce((a, i) => a + C('item:def', i.id).value * i.n, 0); return v; };
  ok(val('warden_elite') > val('warden') * 1.5, 'elites carry better');
}

/* ---------- vitals ---------- */
{
  const { ctx } = makeCtx(), C = ctx.call, P = ctx.PL.ent;
  ctx.EFC.inv = C('inv:new');
  ok(ctx.filter('damage', 40, P, null, null, false) === 40, 'no armour: full damage');
  C('inv:add', ctx.EFC.inv, { id: 'armor_t2', n: 1 });
  ok(near(ctx.filter('damage', 40, P, null, null, false), 26), 'tier 2 cuts 35 %');
  ok(ctx.filter('damage', 40, P, null, null, true) === 40, 'headshots ignore armour');
  ok(ctx.filter('damage', 40, { other: 1 }, null, null, false) === 40, 'other victims untouched');
  ctx.EFC.inv.slots.armor = { id: 'armor_t3', n: 1 };
  ok(near(ctx.filter('damage', 100, P, null, null, false), 50), 'tier 3 halves damage');
  // healing
  C('inv:add', ctx.EFC.inv, { id: 'med_bandage', n: 2 }); C('inv:add', ctx.EFC.inv, { id: 'med_kit', n: 1 });
  ok(!C('med:use', 0), 'no heal at full health');
  P.health = 40;
  ok(C('med:use', 0) && ctx.EFC.inv.bag[0].n === 1, 'bandage consumed');
  ok(!C('med:use', 1), 'one heal at a time');
  ctx.emit('tick', 1); ok(P.health === 40 && near(C('med:state').t, 1) && C('med:state').time === 2, 'heal pending');
  ctx.emit('tick', 1.01); ok(P.health === 65 && C('med:state') === null, 'bandage heals 25 when the timer ends');
  ok(C('med:use', 1) && ctx.EFC.inv.bag.length === 1, 'medkit consumed');
  ctx.emit('tick', 2); ctx.filter('damage', 10, P, null, null, true);
  ok(C('med:state') === null, 'damage cancels the heal');
  ctx.emit('tick', 5); ok(P.health === 65, 'cancelled heal lost');
  ok(C('med:use', 0) && (ctx.emit('tick', 4.6), P.health === 90), 'bandage caps at 100');
  ok(!C('med:use', 5), 'bad index refused');
}

console.log(`vm tests: ${passes} passed, ${fails} failed`);

/* ---------- real game page: engine weapons and makeArms ---------- */
if (!process.env.NO_BROWSER) {
  const { openGame } = await import('./harness.mjs');
  const { browser, page, errors } = await openGame({ noMap: true });
  const r = await page.evaluate(() => {
    const out = { missing: [], nWeapons: Object.keys(WEAPONS).length, items: 0, arms: [], throwErr: null };
    const ws = efcCall('item:all').filter((d) => d.kind === 'weapon'); out.items = ws.length;
    for (const d of ws) if (!WEAPONS[d.weapon.wkey] || d.id !== 'w_' + d.weapon.wkey) out.missing.push(d.id);
    for (const k of Object.keys(WEAPONS)) if (!efcCall('item:def', 'w_' + k)) out.missing.push('no item for ' + k);
    try {
      for (const pair of [['w_ak47', 'w_m9'], ['w_l96', null], [null, 'w_deagle'], [null, null], ['w_aa12', 'w_glock18']]) {
        const inv = efcCall('inv:new'); for (const id of pair) if (id) efcCall('inv:add', inv, { id, n: 1 });
        const ids = efcCall('inv:weapons', inv), A = makeArms(ids);
        out.arms.push(ids.join('+') + ':' + A.slots.map((s) => s.def.id + '/' + s.mag + '/' + s.reserve).join(','));
      }
      const kit = efcCall('raid:kit'); out.kit = efcCall('inv:weapons', kit); makeArms(out.kit);
      efcCall('raid:commit', 'extracted', kit);
    } catch (e) { out.throwErr = String(e && e.stack || e); }
    return out;
  });
  await browser.close();
  console.log(JSON.stringify(r));
  ok(r.missing.length === 0 && r.items === r.nWeapons, 'every w_<wkey> maps to an engine weapon and back');
  ok(!r.throwErr && r.arms.length === 5, 'makeArms accepts inv:weapons ' + (r.throwErr || ''));
  ok(errors.length === 0, 'no page errors ' + errors.slice(0, 3).join(' | '));
  console.log(`after game page: ${passes} passed, ${fails} failed`);
}
if (fails) process.exit(1);
console.log('items ok');
