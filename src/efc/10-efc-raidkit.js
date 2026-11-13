/* Raid weapons: the local player's engine weapons are built from EFC.inv (services 'inv:weapons', 'inv:weaponItems' of the items package),
   magazine and reserve kept in sync with the weapon items (Item.mag, Item.res), reserve topped up from ammo in the bag, service 'ammo:give'. */
const EFC_KIT = { items: [], ref: [null, null], t: 0 }; // items: the weapon item of each engine slot ; ref: [primary, sidearm] items at the last build

function efcRaidKitReset() { EFC_KIT.items = []; EFC_KIT.ref = [null, null]; EFC_KIT.t = 0; }
function efcRaidWeaponItems() {
  const w = EFC.inv ? efcCall('inv:weaponItems', EFC.inv) : null;
  return Array.isArray(w) ? [w[0] || null, w[1] || null] : [null, null];
}
/* giveLoadout in a raid: the makeArms argument from the inventory, or null (engine class loadout) when there is none or it is empty */
function efcRaidArms() {
  if (!EFC.inv) return null;
  const w = efcCall('inv:weapons', EFC.inv);
  return Array.isArray(w) && w.length ? w : null;
}
/* After makeArms in giveLoadout: item rounds into the engine weapons ('inv:weapons' lists primary then sidearm, empty slots left out) */
function efcRaidArmsApplied() {
  const ref = efcRaidWeaponItems(), items = ref.filter(Boolean), slots = PL.ent.arms.slots;
  EFC_KIT.ref = ref; EFC_KIT.items = slots.map((s, i) => items[i] || null);
  slots.forEach((s, i) => {
    const it = EFC_KIT.items[i]; if (!it) return;
    if (typeof it.mag === 'number' && isFinite(it.mag)) s.mag = Math.max(0, Math.min(s.def.mag, Math.round(it.mag)));
    if (typeof it.res === 'number' && isFinite(it.res)) s.reserve = Math.max(0, Math.round(it.res));
  });
  efcRaidKitSync();
  efcEmit('loadout');
}
/* Engine weapons into their items (before any rebuild, on death, extraction and at raid end) */
function efcRaidKitSync() {
  const slots = PL.ent.arms && PL.ent.arms.slots;
  if (!slots) return;
  EFC_KIT.items.forEach((it, i) => { if (it && slots[i]) { it.mag = slots[i].mag; it.res = slots[i].reserve; } });
}
/* Rebuild the player's weapons from EFC.inv, keeping grenades (giveLoadout would refill them from the class) */
function efcRaidRearm() {
  efcRaidKitSync();
  const n = PL.nades, t = PL.nadeType;
  giveLoadout();
  PL.nades = n; PL.nadeType = t;
}
efcOn('inv:changed', () => {
  if (!efcRaidLive() || !EFC.inv || EFC_RAID.state !== 'live' || !PL.ent.alive) return;
  const cur = efcRaidWeaponItems();
  if (cur[0] !== EFC_KIT.ref[0] || cur[1] !== EFC_KIT.ref[1]) efcRaidRearm();
});

/* Rounds of family fam added to the reserve of equipped weapons, up to the engine's maximum; returns what did not fit */
function efcAmmoGive(fam, n) {
  n = Math.max(0, Math.floor(+n || 0));
  const slots = PL.ent.arms && PL.ent.arms.slots;
  if (!slots || !efcRaidMode()) return n;
  for (const s of slots) {
    if (!n || s.def.fam !== fam) continue;
    const add = Math.min(n, Math.max(0, s.def.reserve - s.reserve));
    s.reserve += add; n -= add;
  }
  efcRaidKitSync();
  return n;
}
efcProvide('ammo:give', efcAmmoGive);

/* Once a second while alive in a raid: top up reserves from ammo items in the bag of the matching family */
function efcRaidKitTick(dt) {
  if ((EFC_KIT.t += dt) < 1) return;
  EFC_KIT.t = 0;
  const inv = EFC.inv, slots = PL.ent.arms && PL.ent.arms.slots;
  if (!inv || !Array.isArray(inv.bag) || !slots) return;
  let moved = false;
  for (const s of slots) {
    let room = s.def.reserve - s.reserve;
    for (let i = inv.bag.length - 1; i >= 0 && room > 0; i--) {
      const it = inv.bag[i], d = it && efcCall('item:def', it.id);
      if (!d || d.kind !== 'ammo' || !d.ammo || d.ammo.fam !== s.def.fam) continue;
      const take = Math.min(room, it.n || 0); if (take <= 0) continue;
      const got = efcCall('inv:remove', inv, i, take);
      if (!got) continue;
      const k = typeof got.n === 'number' ? got.n : take;
      s.reserve += k; room -= k; moved = true;
    }
  }
  if (moved) { efcRaidKitSync(); efcEmit('inv:changed'); }
}
