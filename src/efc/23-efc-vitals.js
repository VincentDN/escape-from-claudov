/* Escape From Claudov vitals: armour damage reduction for the local player (filter 'damage') and timed healing with med items
   ('med:use', 'med:state'). Inventory use spends the item up front. Hold-to-heal spends it on completion. */

const EFC_HEALTH_MAX = 100;
let efcMedCur = null;

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
  if (efcMedCur.stack) efcBandageHide();
  efcMedCur = null;
  if (msg && typeof hudMsg === 'function') hudMsg(msg, 'enemy', 1.5);
}
function efcMedUse(bagIdx, hold = false) {
  if (efcCall('omni:inFlight') || efcMedCur || !EFC.inv || !Array.isArray(EFC.inv.bag)) return false;
  const it = EFC.inv.bag[bagIdx], d = it && efcItemDef(it.id);
  if (!d || d.kind !== 'med' || typeof PL === 'undefined' || !PL.ent || !PL.ent.alive) return false;
  if (PL.ent.health >= EFC_HEALTH_MAX) return false;
  if (!hold && !efcInvRemove(EFC.inv, bagIdx, 1)) return false;
  efcMedCur = { id: d.id, heal: d.med.heal, time: d.med.time, t: 0, stack: hold ? it : null };
  if (!hold) efcEmit('inv:changed');
  return true;
}

function efcMedHoldAllowed() {
  return MATCH.state === 'playing' && pointerActive() && !CHAT.open && !efcCall('ui:busy') &&
    !efcUiOverlayOpen() && !playHold() && !KS.map.open && !busy() &&
    !PL.reload && !PL.knifeBtn && !PL.held && !PL.queued && !PL.runShot;
}

function efcMedHolding() { return !!efcMedCur?.stack; }

function efcMedCancelHold() { if (efcMedHolding()) efcMedCancel(); }

function efcMedKey(e, down) {
  if (!efcRaidMode() || keyCanon(e.code) !== 'KeyH') return false;
  if (CHAT.open && down) return false;
  if (down && MATCH.state === 'playing') e.preventDefault();
  if (!down) {
    efcMedCancelHold();
  } else if (!e.repeat && efcMedHoldAllowed()) {
    const bagIdx = EFC.inv?.bag.findIndex((it) => efcItemDef(it.id)?.kind === 'med');
    if (efcMedUse(bagIdx, true)) {
      PL.adsWant = false;
      efcWeaponCheckCancel();
    }
  }
  return true;
}

function efcMedTick(dt) {
  if (!efcMedCur) return;
  if (typeof PL === 'undefined' || !PL.ent || !PL.ent.alive) { efcMedCancel(); return; }
  if (efcCall('omni:inFlight')) {
    efcMedCancelHold();
    return;
  }
  const stack = efcMedCur.stack;
  const bagIdx = stack ? EFC.inv?.bag.indexOf(stack) : -1;
  if (stack && (!(bagIdx >= 0) || !efcMedHoldAllowed())) { efcMedCancel(); return; }
  efcMedCur.t += dt > 0 ? dt : 0;
  if (efcMedCur.t < efcMedCur.time) return;
  if (stack && !efcInvRemove(EFC.inv, bagIdx, 1)) { efcMedCancel(); return; }
  PL.ent.health = Math.min(EFC_HEALTH_MAX, PL.ent.health + efcMedCur.heal);
  efcMedCancel();
  if (stack) efcEmit('inv:changed');
}

efcProvide('med:use', efcMedUse);
efcProvide('med:state', () => (efcMedCur ? { t: efcMedCur.t, time: efcMedCur.time, name: efcItemDef(efcMedCur.id).name } : null));
efcOn('tick', efcMedTick);
efcOn('raid:begin', () => efcMedCancel());
efcOn('raid:over', () => efcMedCancel());
efcOn('died', (victim) => { if (efcIsLocal(victim)) efcMedCancel(); });
