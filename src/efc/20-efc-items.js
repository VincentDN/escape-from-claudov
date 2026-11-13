/* Escape From Claudov item catalogue: every item a raid can hold (ItemDef shape in docs/contracts/CONTRACT.md).
   Weapons are derived from the engine WEAPONS table (one item 'w_<wkey>' each); the rest is our own port-town kit.
   Services: 'item:def'(id) -> ItemDef or undefined, 'item:all'() -> ItemDef[]. */

/* Engine weapon category -> ammunition family (AA-12 is fam 'rifle' for attachments but fires shells, hence cat, not fam) */
const EFC_AMMO_BY_CAT = { ar: 'rifle', smg: 'smg', sniper: 'sniper', shotgun: 'shotgun', pistol: 'pistol' };
/* Weight (kg) and base value per category; a weapon's value scales with its engine damage rating */
const EFC_WEAPON_BASE = { ar: [3.4, 4200], smg: [2.4, 3200], sniper: [5.8, 6000], shotgun: [3.6, 2800], pistol: [0.9, 1100] };

const EFC_ITEM_LIST = [
  // ammunition: n counts rounds
  { id: 'ammo_rifle', name: 'Rifle rounds', kind: 'ammo', w: 0.012, value: 8, stack: 60, ammo: { fam: 'rifle' } },
  { id: 'ammo_smg', name: 'SMG rounds', kind: 'ammo', w: 0.008, value: 5, stack: 90, ammo: { fam: 'smg' } },
  { id: 'ammo_sniper', name: 'Marksman rounds', kind: 'ammo', w: 0.03, value: 30, stack: 20, ammo: { fam: 'sniper' } },
  { id: 'ammo_shotgun', name: 'Buckshot shells', kind: 'ammo', w: 0.04, value: 10, stack: 24, ammo: { fam: 'shotgun' } },
  { id: 'ammo_pistol', name: 'Pistol rounds', kind: 'ammo', w: 0.01, value: 4, stack: 60, ammo: { fam: 'pistol' } },
  // armour: cut is the share of non-head damage removed
  { id: 'armor_t1', name: 'Padded work vest', kind: 'armor', w: 3, value: 2500, armor: { tier: 1, cut: 0.2 } },
  { id: 'armor_t2', name: 'Stevedore plate carrier', kind: 'armor', w: 6, value: 9000, armor: { tier: 2, cut: 0.35 } },
  { id: 'armor_t3', name: 'Harbour guard cuirass', kind: 'armor', w: 9, value: 22000, armor: { tier: 3, cut: 0.5 } },
  // backpacks: cap is kg added to the carry limit
  { id: 'pack_s', name: 'Canvas satchel', kind: 'pack', w: 0.6, value: 1500, pack: { cap: 8 } },
  { id: 'pack_m', name: 'Oilskin rucksack', kind: 'pack', w: 1.2, value: 5500, pack: { cap: 14 } },
  { id: 'pack_l', name: 'Rigger frame pack', kind: 'pack', w: 2, value: 13000, pack: { cap: 22 } },
  // medical
  { id: 'med_bandage', name: 'Field dressing', kind: 'med', w: 0.1, value: 300, stack: 5, med: { heal: 25, time: 2 } },
  { id: 'med_kit', name: 'Trauma kit', kind: 'med', w: 0.6, value: 2400, med: { heal: 70, time: 4.5 } },
  // valuables of a sealed industrial port town
  { id: 'loot_tobacco', name: 'Tin of pipe tobacco', kind: 'loot', w: 0.2, value: 450, stack: 5 },
  { id: 'loot_wrench', name: 'Socket wrench roll', kind: 'loot', w: 1.4, value: 800 },
  { id: 'loot_bearing', name: 'Crane slewing bearing', kind: 'loot', w: 2.2, value: 1100 },
  { id: 'loot_gauge', name: 'Boiler pressure gauge', kind: 'loot', w: 0.9, value: 1300 },
  { id: 'loot_coil', name: 'Copper winding coil', kind: 'loot', w: 2.5, value: 1900 },
  { id: 'loot_valves', name: 'Boxed radio valves', kind: 'loot', w: 0.5, value: 1700 },
  { id: 'loot_board', name: 'Signal relay board', kind: 'loot', w: 0.3, value: 2600 },
  { id: 'loot_ledger', name: 'Bonded warehouse ledger', kind: 'loot', w: 0.4, value: 2300 },
  { id: 'loot_stamp', name: 'Customs seal press', kind: 'loot', w: 0.8, value: 3100 },
  { id: 'loot_keys', name: "Harbour master's key ring", kind: 'loot', w: 0.2, value: 4200 },
  { id: 'loot_sextant', name: 'Brass sextant', kind: 'loot', w: 1.5, value: 7500 },
  { id: 'loot_chrono', name: "Ship's chronometer", kind: 'loot', w: 1.1, value: 11000 },
  { id: 'loot_dispatch', name: 'Sealed admiralty dispatch', kind: 'loot', w: 0.3, value: 16000 },
];

/* Builds the weapon items from the engine table (called once at load; WEAPONS is defined by the engine before src/efc) */
function efcWeaponItems() {
  const out = [];
  if (typeof WEAPONS === 'undefined') return out;
  for (const wkey of Object.keys(WEAPONS)) {
    const W = WEAPONS[wkey], cat = EFC_AMMO_BY_CAT[W.cat] ? W.cat : 'ar', base = EFC_WEAPON_BASE[cat];
    const dmg = W.stats && Number.isFinite(W.stats.dmg) ? W.stats.dmg : 0.5;
    const w = wkey === 'm82' ? 12.9 : base[0];
    out.push({
      id: 'w_' + wkey, name: W.name || wkey, kind: 'weapon', w, value: Math.round((base[1] * (0.7 + dmg * 0.6)) / 50) * 50,
      weapon: { wkey, fam: EFC_AMMO_BY_CAT[cat], slot: cat === 'pistol' ? 'sidearm' : 'primary' },
    });
  }
  return out;
}

const EFC_ITEMS = {};
for (const d of efcWeaponItems().concat(EFC_ITEM_LIST)) EFC_ITEMS[d.id] = d;

function efcItemDef(id) { return typeof id === 'string' && Object.prototype.hasOwnProperty.call(EFC_ITEMS, id) ? EFC_ITEMS[id] : undefined; }
function efcStackMax(id) { const d = efcItemDef(id); return d && d.stack > 1 ? d.stack : 1; }

/* Copy of a valid item with a clean count, and mag/res filled for weapons (full magazine, half the reserve). null when invalid. */
function efcItemNorm(item) {
  if (!item || typeof item !== 'object') return null;
  const d = efcItemDef(item.id); if (!d) return null;
  const out = { id: d.id, n: Math.max(1, Math.floor(Number.isFinite(+item.n) ? +item.n : 1)) };
  if (d.stack > 1) out.n = Math.min(out.n, 1e6); else out.n = 1;
  if (d.kind === 'weapon') {
    const W = typeof WEAPONS !== 'undefined' ? WEAPONS[d.weapon.wkey] : null, mag = W ? W.mag : 0, res = W ? Math.floor(W.reserve / 2) : 0;
    out.mag = Number.isFinite(+item.mag) && item.mag !== null ? Math.max(0, Math.min(mag || 999, Math.floor(+item.mag))) : mag;
    out.res = Number.isFinite(+item.res) && item.res !== null ? Math.max(0, Math.floor(+item.res)) : res;
  }
  if (item.free) out.free = true;
  return out;
}
/* Fills a weapon item's missing mag/res in place (used on live slot items) */
function efcWeaponFill(item) {
  if (!item) return item;
  const n = efcItemNorm(item); if (n && n.mag !== undefined) { item.mag = n.mag; item.res = n.res; }
  return item;
}

efcProvide('item:def', (id) => efcItemDef(id));
efcProvide('item:all', () => Object.values(EFC_ITEMS));
