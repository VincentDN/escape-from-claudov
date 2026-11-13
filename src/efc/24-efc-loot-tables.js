/* Escape From Claudov loot tables: 'loot:roll'(table, rng) -> Item[] for containers and Warden bodies. rng() returns 0..1
   (default Math.random); the host passes a seeded one (efcRng) so a raid's loot can be replayed. Rolled by the host only. */

/* Entry: [weight, item id, min count, max count] (counts matter for stackables only) */
const EFC_LOOT = {
  crate: { rolls: [2, 4], e: [
    [14, 'ammo_rifle', 15, 45], [12, 'ammo_smg', 20, 60], [6, 'ammo_shotgun', 6, 16], [5, 'ammo_sniper', 4, 10], [10, 'ammo_pistol', 12, 36],
    [10, 'loot_wrench'], [9, 'loot_bearing'], [7, 'loot_coil'], [6, 'loot_gauge'], [5, 'loot_valves'], [2, 'loot_sextant'], [1, 'loot_chrono'],
    [4, 'pack_s'], [2, 'pack_m'], [0.6, 'pack_l'], [3, 'armor_t1'], [1.2, 'armor_t2'], [0.3, 'armor_t3'] ] },
  locker: { rolls: [1, 3], e: [
    [12, 'loot_tobacco', 1, 3], [10, 'med_bandage', 1, 2], [3, 'med_kit'], [8, 'ammo_pistol', 10, 30], [5, 'ammo_smg', 15, 40],
    [7, 'loot_ledger'], [5, 'loot_board'], [4, 'loot_stamp'], [3, 'loot_keys'], [1.2, 'loot_chrono'], [0.6, 'loot_dispatch'],
    [3, 'armor_t1'], [1, 'armor_t2'], [0.25, 'armor_t3'], [3, 'pack_s'], [1, 'pack_m'] ] },
  bag: { rolls: [1, 2], e: [
    [14, 'med_bandage', 1, 3], [6, 'med_kit'], [10, 'loot_tobacco', 1, 4], [10, 'ammo_pistol', 10, 30], [6, 'ammo_rifle', 10, 30],
    [5, 'loot_valves'], [4, 'loot_ledger'], [2, 'loot_keys'], [0.5, 'loot_dispatch'] ] },
  medical: { rolls: [1, 3], e: [[20, 'med_bandage', 1, 4], [8, 'med_kit'], [2, 'loot_gauge']] },
  weapons: { rolls: [1, 3], e: [
    [8, 'W:smg'], [7, 'W:ar'], [4, 'W:shotgun'], [2, 'W:sniper'], [8, 'W:pistol'],
    [10, 'ammo_rifle', 20, 60], [10, 'ammo_smg', 30, 90], [5, 'ammo_shotgun', 8, 24], [4, 'ammo_sniper', 5, 15], [8, 'ammo_pistol', 15, 45],
    [3, 'armor_t1'], [1.5, 'armor_t2'], [0.4, 'armor_t3'] ] },
};

function efcRand(rng) { const x = +rng(); return Number.isFinite(x) ? Math.min(0.999999, Math.max(0, x)) : 0; }
function efcPick(rng, list) { return list[Math.floor(efcRand(rng) * list.length)]; }
function efcPickW(rng, entries) {
  let tot = 0; for (const e of entries) tot += e[0];
  let r = efcRand(rng) * tot;
  for (const e of entries) { r -= e[0]; if (r < 0) return e; }
  return entries[entries.length - 1];
}
/* Weapon item ids of the engine categories given ('ar', 'smg', ...) */
function efcWeaponIds(cats) {
  return Object.values(EFC_ITEMS).filter((d) => d.kind === 'weapon' && typeof WEAPONS !== 'undefined' && WEAPONS[d.weapon.wkey] && cats.includes(WEAPONS[d.weapon.wkey].cat)).map((d) => d.id);
}
/* A weapon item with part of its magazine and reserve (share: 0..1 of the full magazine / half reserve) */
function efcLootWeapon(rng, id, lo, hi) {
  const it = efcItemNorm({ id, n: 1 }); if (!it) return null;
  const k = lo + efcRand(rng) * (hi - lo);
  it.mag = Math.max(1, Math.round(it.mag * k)); it.res = Math.round(it.res * k * 0.5);
  return it;
}
function efcLootEntry(rng, e) {
  if (e[1].startsWith('W:')) { const ids = efcWeaponIds([e[1].slice(2)]); return ids.length ? efcLootWeapon(rng, efcPick(rng, ids), 0.2, 1) : null; }
  const lo = e[2] || 1, hi = e[3] || lo;
  return efcItemNorm({ id: e[1], n: lo + Math.floor(efcRand(rng) * (hi - lo + 1)) });
}
function efcAmmoFor(wid) { const d = efcItemDef(wid); return d && d.weapon ? 'ammo_' + d.weapon.fam : null; }
/* A Warden body: a weapon with partial ammo, some rounds for it, sometimes medicine, armour or a valuable. Elites carry better. */
function efcLootWarden(rng, elite) {
  const out = [], add = (it) => { if (it) efcStackInto(out, it); };
  const cats = elite ? (efcRand(rng) < 0.3 ? ['sniper'] : ['ar']) : (efcRand(rng) < 0.25 ? ['pistol'] : efcRand(rng) < 0.5 ? ['smg', 'shotgun'] : ['ar', 'smg']);
  const ids = efcWeaponIds(cats), wid = ids.length ? efcPick(rng, ids) : null;
  if (wid) {
    add(efcLootWeapon(rng, wid, elite ? 0.4 : 0.1, elite ? 1 : 0.7));
    const aid = efcAmmoFor(wid), k = elite ? 0.4 + efcRand(rng) * 0.6 : 0.1 + efcRand(rng) * 0.35; // share of one full stack
    add(efcItemNorm({ id: aid, n: Math.max(1, Math.round(efcStackMax(aid) * k)) }));
  }
  if (efcRand(rng) < (elite ? 0.6 : 0.25)) add(efcItemNorm({ id: elite && efcRand(rng) < 0.4 ? 'med_kit' : 'med_bandage', n: 1 }));
  if (efcRand(rng) < (elite ? 0.5 : 0.12)) add(efcItemNorm({ id: elite ? (efcRand(rng) < 0.3 ? 'armor_t3' : 'armor_t2') : 'armor_t1', n: 1 }));
  if (efcRand(rng) < (elite ? 0.5 : 0.15)) add(efcLootEntry(rng, efcPickW(rng, elite ? [[4, 'loot_keys'], [3, 'loot_sextant'], [2, 'loot_chrono'], [1, 'loot_dispatch']] : [[5, 'loot_tobacco', 1, 2], [3, 'loot_ledger'], [1, 'loot_keys']])));
  return out;
}
function efcLootRoll(table, rng) {
  if (typeof rng !== 'function') rng = Math.random;
  if (table === 'warden' || table === 'warden_elite') return efcLootWarden(rng, table === 'warden_elite');
  const T = EFC_LOOT[table]; if (!T) return [];
  const out = [], n = T.rolls[0] + Math.floor(efcRand(rng) * (T.rolls[1] - T.rolls[0] + 1));
  for (let i = 0; i < n; i++) { const it = efcLootEntry(rng, efcPickW(rng, T.e)); if (it) efcStackInto(out, it); }
  return out;
}

efcProvide('loot:roll', efcLootRoll);
