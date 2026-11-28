/* Partisan's mounted models and their authored per-rifle compatibility. */
const EFC_PARTISAN_SLOT_LABELS = {
  optic: 'Optic', muzzle: 'Muzzle', under: 'Underbarrel', side: 'Side rail', mag: 'Magazine',
  rail: 'Rail', buis: 'Back-up sight', handguard: 'Handguard', grip: 'Grip', stock: 'Stock',
  trigger: 'Trigger', charging: 'Charging handle', sling: 'Sling',
};
const EFC_PARTISAN_SPARE_MESHES = new Map();
const EFC_PARTISAN_ITEM_PARTS = [];
function efcPartisanPartSlot(slot) {
  return ({ magazine: 'mag', foregrip: 'under' })[slot] || slot;
}
function efcPartisanPartMesh(part) {
  let geometry = EFC_PARTISAN_SPARE_MESHES.get(part.id);
  if (!geometry) {
    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(
      Float32Array.from(new Int16Array(efcPartisanBytes(part.positions)), value => value / 10000), 3));
    geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(efcPartisanBytes(part.indices)), 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    geometry.userData.efcPartisanLow = efcPartisanLowGeometry;
    EFC_PARTISAN_SPARE_MESHES.set(part.id, geometry);
  }
  return geometry;
}
function efcPartisanEffects(part) {
  const { slot, option } = part;
  if (slot === 'optic') return { ads: option === 'scope' ? 1.12 : 1.03, zoom: option === 'scope' ? 1.5 : 1.1, adsAcc: 0.92 };
  if (slot === 'muzzle') return option === 'can' ? { silent: true, flash: 0.15, ads: 1.05 } : { vrec: 0.88, hrec: 1.03 };
  if (slot === 'foregrip') return option === 'bipod' ? { bipod: true, ads: 1.05 } : { vrec: 0.92, ads: 1.03 };
  if (slot === 'side' && option !== 'light') return { laser: true, hip: 0.83 };
  if (slot === 'magazine') return { reload: 1.08 };
  if (slot === 'stock' || slot === 'grip') return { hrec: 0.94, ads: 1.02 };
  if (slot === 'charging' || slot === 'trigger') return { reload: 0.96 };
  return { ads: 1.02 };
}
for (const [slot, label] of Object.entries(EFC_PARTISAN_SLOT_LABELS)) {
  if (ATT_SLOTS.includes(slot)) continue;
  ATT_SLOTS.push(slot);
  ATT_SLOT_NAMES[slot] = label;
  ATT_GROUP_SLOTS[slot] = [slot];
  ATT_GROUPS.push(slot);
  ATT_GROUP_NAMES[slot] = label;
  ATT_GROUP[slot] = slot;
}
for (const part of Object.values(EFC_PARTISAN_PARTS)) {
  const id = part.id, slot = efcPartisanPartSlot(part.slot);
  const models = EFC_PARTISAN_PROFILES.filter(([, source]) => part.models.includes(source)).map(([key]) => key);
  if (part.models.includes(EFC_PARTISAN_NEURO)) models.push('stg44');
  if (!models.length) continue;
  for (const model of models) if (!WEAPONS[model].slots.includes(slot)) WEAPONS[model].slots.push(slot);
  ATT[id] = { id, slot, name: part.name, lvl: 1, fam: ['rifle', 'smg', 'sniper'], models,
    partisan: part, mods: efcPartisanEffects(part), rounds: part.rounds };
  ATT_BUILD[id] = ({ g, info, M }) => {
    const geometry = efcPartisanPartMesh(part), point = info.efcPartisanMount?.[part.slot];
    if (slot === 'mag') {
      info.buildMag = parent => parent.add(new THREE.Mesh(geometry, M.dark));
      if (point) info.magHome.set(...point);
      return;
    }
    const mesh = new THREE.Mesh(geometry, M.dark);
    if (point) mesh.position.set(...point);
    else {
      const mount = info.mount[slot];
      mesh.position.set(mount?.x || 0, mount?.y || info.sightY, mount?.z || 0);
    }
    g.add(mesh);
    if (slot === 'optic') {
      geometry.computeBoundingBox();
      const box = geometry.boundingBox, center = box.getCenter(new V3()).add(mesh.position);
      info.sightX = center.x; info.sightY = center.y;
      info.adsZ = mesh.position.z + box.max.z + 0.19;
    }
  };
  const large = ['muzzle', 'stock', 'handguard', 'optic'].includes(slot);
  EFC_PARTISAN_ITEM_PARTS.push(['part_' + id, {
    id: 'part_' + id, name: part.name, kind: 'attachment', w: part.weight,
    value: Math.round(650 + part.weight * 1500), size: large ? [2, 1] : slot === 'mag' ? [1, 2] : [1, 1],
    part: { key: id, bench: part.option, weapons: models },
  }]);
}
