/* A9 attachment items use the same game keys for stats, first-person models and network snapshots. */
const EFC_A9_WEAPONS = ['stg44', 'ak47'];
const EFC_MOD_WEAPONS = [...EFC_A9_WEAPONS, ...EFC_PARTISAN_WEAPON_MODELS.keys()];
const EFC_MOD_SLOTS = { optic: 'Optic', muzzle: 'Muzzle', under: 'Underbarrel', side: 'Side rail', mag: 'Magazine' };
const EFC_MOD_FINISHES = { stock: 'Factory finish', foret: 'Forest', urbain: 'Urban', desert: 'Desert' };
const EFC_MOD_FIELD = ['optic', 'side'];

const EFC_MOD_PARTS = Object.fromEntries([
  ['red', 'Micro red dot', 0.13, 980, [1, 1], 'reddot'],
  ['holo', 'Holographic sight', 0.32, 2400, [1, 1], 'holo'],
  ['acog', '4× scope', 0.46, 4400, [2, 1], 'scope'],
  ['sil', 'Sound suppressor', 0.54, 4300, [2, 1], 'supp'],
  ['agrip', 'Angled foregrip', 0.11, 780, [1, 1], 'angled'],
  ['vgrip', 'Vertical grip', 0.15, 970, [1, 1], 'vertical'],
  ['bipod', 'Folding bipod', 0.32, 2100, [2, 1], 'bipod'],
  ['laser', 'Compact aiming laser', 0.21, 3100, [1, 1], 'peq15'],
  ['laser_old', 'Older-pattern aiming laser', 0.25, 1950, [1, 1], 'peq2'],
  ['scout', 'Rail light', 0.11, 850, [1, 1], 'scout'],
  ['stg40', 'StG 44 extended magazine', 0.61, 1500, [1, 2], 'kurz40', ['stg44']],
  ['xmag', 'AK extended magazine', 0.51, 1450, [1, 2], 'ak45', ['ak47']],
].map(([key, name, w, value, size, bench, weapons = EFC_A9_WEAPONS]) => {
  const id = 'part_' + key;
  return [id, { id, name, kind: 'attachment', w, value, size, part: { key, bench, weapons } }];
}).concat(EFC_PARTISAN_ITEM_PARTS));

// Reuse the normal game model and stat paths for the additional catalogue entries.
ATT.laser_old = { ...ATT.laser, id: 'laser_old', name: 'Older-pattern aiming laser', mods: { ...ATT.laser.mods, hip: 0.78 } };
ATT.scout = { ...ATT.laser, id: 'scout', name: 'Rail light', mods: { ads: 1.02 } };
ATT.stg40 = { ...ATT.xmag, id: 'stg40', models: ['stg44'], name: 'StG 44 extended magazine', mods: { ...ATT.xmag.mods, magx: 1.6 } };
ATT_BUILD.laser_old = ATT_BUILD.laser;
ATT_BUILD.scout = ({ g, M, info }) => {
  const s = info.mount.side;
  cz(g, M.dark, s.x - 0.014, s.y, s.z, 0.012, 0.09);
  cz(g, M.metal, s.x - 0.014, s.y, s.z - 0.042, 0.017, 0.023);
};
WEAPONS.stg44.slots = [...new Set([...WEAPONS.stg44.slots, ...Object.keys(EFC_MOD_SLOTS)])];
WEAPONS.stg44.noAtt = ['comp', 'brake', 'fmag', 'xmag'];
ATT_BUILD.stg40 = (c) => { c.info.magExt = 1.6; };

function efcModBase(item) {
  const wkey = typeof item?.id === 'string' && item.id.startsWith('w_') && item.id.slice(2);
  return EFC_MOD_WEAPONS.includes(wkey) ? WEAPONS[wkey] : null;
}
function efcModFit(item, id) {
  const base = efcModBase(item), part = typeof id === 'string' && Object.hasOwn(EFC_MOD_PARTS, id) && EFC_MOD_PARTS[id].part;
  return base && part && part.weapons.includes(base.id) && attFits(base, part.key) ? ATT[part.key].slot : null;
}
function efcModNorm(item, raw) {
  const base = efcModBase(item);
  if (!base || item.free || !raw || typeof raw !== 'object') return null;
  const ids = Array.isArray(raw.parts) ? raw.parts.slice(0, base.slots.length) : [];
  const parts = attNormalize(base, ids.filter(id => efcModFit(item, id)).map(id => EFC_MOD_PARTS[id].part.key)).map(key => 'part_' + key);
  const finish = typeof raw.finish === 'string' && Object.hasOwn(EFC_MOD_FINISHES, raw.finish) ? raw.finish : 'stock';
  return parts.length || finish !== 'stock' ? { parts, finish } : null;
}
function efcModSlots(item) {
  const base = efcModBase(item);
  if (!base || item.free) return [];
  const mounted = efcModNorm(item, item.mods)?.parts || [];
  const slots = Object.entries(EFC_PARTISAN_SLOT_LABELS).filter(([slot]) =>
    (EFC_A9_WEAPONS.includes(base.id) && Object.hasOwn(EFC_MOD_SLOTS, slot)) ||
    EFC_PARTISAN_ITEM_PARTS.some(([, def]) => def.part.weapons.includes(base.id) && ATT[def.part.key].slot === slot));
  return slots.map(([slot, label]) => {
    const id = mounted.find(id => efcModFit(item, id) === slot);
    return { slot, label, item: id ? { id, n: 1 } : null, field: EFC_MOD_FIELD.includes(slot) };
  });
}
function efcModDef(item) {
  const base = efcModBase(item);
  if (!base) return null;
  const mods = efcModNorm(item, item.mods);
  return mods ? weaponDef(base.id, mods.parts.map(id => EFC_MOD_PARTS[id].part.key), mods.finish === 'stock' ? null : mods.finish) : base;
}
function efcModApply(item, parts, finish) {
  if (!Array.isArray(parts) || !Object.hasOwn(EFC_MOD_FINISHES, finish)) return null;
  const mods = efcModNorm(item, { parts, finish });
  if ((mods?.parts.length || 0) !== parts.length) return null;
  const changed = { ...item };
  if (mods) changed.mods = mods;
  else delete changed.mods;
  const capacity = efcModDef(changed).mag;
  if (Number.isFinite(changed.mag) && changed.mag > capacity) {
    changed.res = (changed.res || 0) + changed.mag - capacity;
    changed.mag = capacity;
  }
  return changed;
}
function efcModTotals(item, key) {
  return (efcModNorm(item, item.mods)?.parts || []).reduce((total, id) => total + EFC_MOD_PARTS[id][key], 0);
}
efcProvide('weaponmods:parts', () => Object.values(EFC_MOD_PARTS));
efcProvide('weaponmods:partTotal', efcModTotals);
efcProvide('weaponmods:fit', efcModFit);
efcProvide('weaponmods:slots', efcModSlots);
efcProvide('weaponmods:normalize', efcModNorm);
efcProvide('weaponmods:definition', efcModDef);
efcProvide('weaponmods:finishOptions', () => ({ ...EFC_MOD_FINISHES }));
