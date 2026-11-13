/* Escape From Claudov vitals: armour damage reduction for the local player (filter 'damage') and timed healing with med items
   ('med:use', 'med:state'). A heal is applied when its timer ends; taking damage meanwhile cancels it and the item is lost. */

const EFC_HEALTH_MAX = 100;
let efcMedCur = null; // { id, heal, time, t } while a heal is running

function efcIsLocal(e) { return typeof PL !== 'undefined' && !!PL && !!e && e === PL.ent; }
/* Damage after armour: non-headshot damage is reduced by the armour's cut */
function efcArmorDamage(dmg, inv, head) {
  const a = inv && inv.slots && inv.slots.armor, d = a && efcItemDef(a.id);
  if (!d || !d.armor || head || !(dmg > 0)) return dmg;
  return dmg * (1 - d.armor.cut);
}
efcOn('damage', (dmg, victim, attacker, weapon, head) => {
  if (!efcIsLocal(victim)) return undefined;
  const out = efcArmorDamage(dmg, EFC.inv, head);
  if (out > 0 && efcMedCur) efcMedCancel('Treatment interrupted');
  return out;
});

function efcMedCancel(msg) {
  if (!efcMedCur) return;
  efcMedCur = null;
  if (msg && typeof hudMsg === 'function') hudMsg(msg, 'enemy', 1.5);
}
/* Starts a heal from EFC.inv.bag[bagIdx]; consumes one item. False when busy, dead, at full health or not a med item. */
function efcMedUse(bagIdx) {
  if (efcMedCur || !EFC.inv || !Array.isArray(EFC.inv.bag)) return false;
  const it = EFC.inv.bag[bagIdx], d = it && efcItemDef(it.id);
  if (!d || d.kind !== 'med' || typeof PL === 'undefined' || !PL.ent || !PL.ent.alive) return false;
  if (PL.ent.health >= EFC_HEALTH_MAX) return false;
  if (!efcInvRemove(EFC.inv, bagIdx, 1)) return false;
  efcMedCur = { id: d.id, heal: d.med.heal, time: d.med.time, t: 0 };
  efcEmit('inv:changed');
  return true;
}
function efcMedTick(dt) {
  if (!efcMedCur) return;
  if (typeof PL === 'undefined' || !PL.ent || !PL.ent.alive) { efcMedCur = null; return; }
  efcMedCur.t += dt > 0 ? dt : 0;
  if (efcMedCur.t < efcMedCur.time) return;
  PL.ent.health = Math.min(EFC_HEALTH_MAX, PL.ent.health + efcMedCur.heal);
  efcMedCur = null;
}

efcProvide('med:use', efcMedUse);
efcProvide('med:state', () => (efcMedCur ? { t: efcMedCur.t, time: efcMedCur.time } : null));
efcOn('tick', efcMedTick);
efcOn('raid:begin', () => { efcMedCur = null; });
efcOn('raid:over', () => { efcMedCur = null; });
efcOn('died', (victim) => { if (efcIsLocal(victim)) efcMedCur = null; });
