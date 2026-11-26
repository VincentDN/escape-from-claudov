/* Escape From Claudov weapon handling and inventory foley (package P2, docs/audio-events.md).
   Handling: the engine's sfxMech(kind, delay, pos, fam) asks efcHandlingPlay first; it plays recorded Partisan takes (pack
   'handling', banks hf_<category>, six takes each) layered per event, with a small random pitch and gain spread and heavier
   weapons pitched lower. It returns false when the pack is not loaded (or for kinds it does not handle), and the engine then
   plays what it played before (its own foley pack, else synthesis), so a missing pack changes nothing.
   Inventory and looting: from events only (loot:give, inv:changed, the UI's busy state or a 'ui:panel' event). */
const EFC_SND = {
  on: true, // false: the engine's previous sounds (the audition page compares both)
  log: null, // array: every played layer is recorded { kind, id, t } (tests)
  prevInv: null, busy: false, panelEv: false, last: {}, invLast: -1, // invLast: when the last inventory cue played (shared gap)
};

/* Weapon mass (kg, roughly the real weapon unloaded) by engine weapon id; bots only give their family */
const EFC_SND_KG = { m4: 3.1, mp5: 2.5, l96: 6.5, m1014: 3.8, m9: 0.95, ak47: 3.5, scarh: 3.6, famas: 3.6, mp7: 1.9, ump45: 2.3, vector: 2.7,
  svd: 4.3, m82: 13, rem870: 3.6, aa12: 5.2, usp: 0.75, glock18: 0.65, deagle: 1.8, sks: 3.9 };
const EFC_SND_FAM_KG = { pistol: 0.9, smg: 2.4, rifle: 3.4, shotgun: 3.7, sniper: 5.8 };
/* Playback rate from mass: 1 kg plays at 1.08, an M4 at about 0.98, an L96 at 0.91, the Barrett at 0.86 */
function efcSndWeightRate(kg) { return Math.min(1.12, Math.max(0.82, 1.08 * Math.pow(Math.max(0.3, kg || 3.4), -0.09))); }

/* Layers per event: [bank, offset s, gain, rate factor]. Categories follow Partisan's mech.js: click = latch or catch, clunk = a part
   seating, hit = a palm or a set-down, handle = grabbing the weapon, slide = a part sliding, long = a full charging cycle,
   ratchet = a rattle of loose parts. The decisive transient of click, clunk and hit takes sits 6 ms into the take, so it lands
   on the choreography's event time (src/06d-reload.js). */
const EFC_HANDLING = {
  magout: [['hf_click', 0, 0.9, 1], ['hf_handle', 0.05, 0.5, 1]],
  magin: [['hf_clunk', 0, 1, 1], ['hf_click', 0.03, 0.55, 1.05]],
  slap: [['hf_hit', 0, 0.75, 1]],
  charge: [['hf_long', 0, 0.9, 1]], // rifle, SMG, shotgun: the charging handle (Partisan: charge -> long)
  charge_pistol: [['hf_click', 0, 0.8, 1.15], ['hf_clunk', 0.025, 0.7, 1.15]], // slide release
  charge_sniper: [['hf_clunk', 0, 0.9, 0.95], ['hf_click', 0.06, 0.5, 1]], // bolt pushed home and turned down
  bolt: [['hf_click', 0, 0.6, 1], ['hf_slide', 0.03, 0.85, 1]], // bolt lifted and pulled back
  pump: [['hf_slide', 0, 0.8, 1.05], ['hf_clunk', 0.13, 0.85, 1]],
  shell: [['hf_click', 0, 0.85, 0.9], ['hf_hit', 0.015, 0.35, 1.1]],
  draw: [['hf_handle', 0, 0.85, 1], ['hf_click', 0.09, 0.35, 1.05]],
  stow: [['hf_handle', 0, 0.7, 0.95], ['hf_hit', 0.07, 0.3, 1]], // holster (weapon switch, killstreak, mecha)
  inspect: [['hf_handle', 0, 0.6, 1], ['hf_ratchet', 0.08, 0.25, 1]],
  ads_in: [['hf_handle', 0, 0.45, 1.06]],
  ads_out: [['hf_handle', 0, 0.32, 0.94]],
  empty: [['hf_click', 0, 0.75, 1.2]], // dry fire
  pickup: [['hf_handle', 0, 0.8, 1], ['hf_clunk', 0.06, 0.45, 1]],
  // inventory and looting (Partisan's inventory foley uses the same bank)
  inv_open: [['hf_handle', 0, 0.6, 0.9], ['hf_slide', 0.05, 0.25, 0.85]],
  inv_close: [['hf_hit', 0, 0.4, 0.9]],
  inv_take: [['hf_handle', 0, 0.7, 1.05]],
  inv_equip: [['hf_clunk', 0, 0.7, 1], ['hf_click', 0.04, 0.5, 1.05]],
  inv_unequip: [['hf_click', 0, 0.5, 1], ['hf_handle', 0.03, 0.5, 0.95]],
  inv_drop: [['hf_clunk', 0, 0.7, 0.85]],
  inv_rotate: [['hf_slide', 0, 0.55, 1.05]],
  inv_refuse: [['hf_click', 0, 0.50, 0.78]],
  inv_split: [['hf_handle', 0, 0.55, 1.1], ['hf_click', 0.04, 0.32, 1.1]],
  inv_mount: [['hf_slide', 0, 0.45, 1.03], ['hf_click', 0.045, 0.7, 1.04]],
  inv_unmount: [['hf_click', 0, 0.55, 0.98], ['hf_slide', 0.04, 0.4, 0.95]],
  inv_search: [['hf_handle', 0, 0.5, 0.9], ['hf_ratchet', 0.08, 0.35, 1]],
  inv_med: [['hf_handle', 0, 0.6, 1.1], ['hf_handle', 0.22, 0.45, 0.95]],
};
/* Event dose, the engine's MECH_GAIN for the kinds it has (the takes are levelled like the engine's foley pack) */
const EFC_SND_GAIN = { inspect: 0.4, ads_in: 0.24, ads_out: 0.24, inv_open: 0.5, inv_close: 0.45, inv_take: 0.5, inv_equip: 0.5, inv_unequip: 0.45,
  inv_drop: 0.5, inv_med: 0.45 };
/* Kinds left to the engine: knife, grenade and magazine-on-the-ground sounds are not weapon handling */
const EFC_SND_KEEP = new Set(['knife', 'pin', 'spoon', 'throw', 'windup', 'magdrop']);

/* Resolves an engine sfxMech kind to an EFC_HANDLING key, from the weapon in hand (player) or the family given (bots) */
function efcHandlingKey(kind, fam, pos) {
  if (EFC_SND_KEEP.has(kind)) return null;
  if (!pos && typeof VM !== 'undefined') {
    if (kind === 'draw' && VM.action === 'inspect') return 'inspect';
    if (kind === 'ads') return typeof PL !== 'undefined' && PL.ads ? 'ads_out' : 'ads_in'; // called before PL.ads takes the new state
  }
  if (kind === 'ads') return 'ads_in';
  if (kind === 'charge') return fam === 'pistol' ? 'charge_pistol' : fam === 'sniper' ? 'charge_sniper' : 'charge';
  return EFC_HANDLING[kind] ? kind : null;
}
/* The weapon whose foley plays: { fam, kg } */
function efcSndWeapon(pos, fam) {
  if (!pos && !fam && typeof VM !== 'undefined' && VM.curDef) return { fam: VM.curDef.fam, kg: EFC_SND_KG[VM.curDef.id] || EFC_SND_FAM_KG[VM.curDef.fam] };
  const f = fam || 'rifle';
  return { fam: f, kg: EFC_SND_FAM_KG[f] || 3.4 };
}
/* True when every bank of the layers is loaded */
function efcHandlingReady(key) { const L = EFC_HANDLING[key]; return !!L && L.every((l) => sfxHas(l[0])); }

/* Plays the layers of key at time t (AudioContext seconds) into out. o: { rate, gain } multiply the whole event. */
function efcHandlingLayers(key, out, t, o) {
  const L = EFC_HANDLING[key], base = (EFC_SND_GAIN[key] !== undefined ? EFC_SND_GAIN[key] : (typeof MECH_GAIN !== 'undefined' && MECH_GAIN[key.replace(/_.*/, '')]) || 0.5);
  const rate = o.rate * rand(0.96, 1.04), g = base * (o.gain || 1) * Math.pow(10, rand(-1.5, 1.5) / 20);
  for (const [id, off, lg, lr] of L) {
    const v = sfxPlay(id, out, t + off / rate, { gain: g * lg, rate: rate * lr });
    if (v && EFC_SND.log) EFC_SND.log.push({ kind: key, id, t: t + off / rate, e: v.e, rate: rate * lr });
  }
}
/* Called first by the engine's sfxMech. True when it played the event. */
function efcHandlingPlay(kind, delay, pos, fam) {
  if (!EFC_SND.on || typeof AU === 'undefined' || !AU.ready) return false;
  const W = efcSndWeapon(pos, fam), key = efcHandlingKey(kind, W.fam, pos);
  if (!key || !efcHandlingReady(key)) return false;
  const out = pos ? auOut(pos, 0.1, 1, 1.1, 3) : auOut(null, 0.05, 1);
  efcHandlingLayers(key, out, AU.ctx.currentTime + (delay || 0), { rate: efcSndWeightRate(W.kg) });
  return true;
}
/* Inventory and looting sound (respects the effects volume and mute: it goes through the game's mix like every effect) */
function efcInvSound(key, rate = 1) {
  if (!EFC_SND.on || typeof AU === 'undefined' || !AU.ready || !efcHandlingReady(key)) return false;
  const t = AU.ctx.currentTime;
  if (t - (EFC_SND.last[key] || -1) < 0.05) return false; // 'take all' and quick clicks
  // one gap shared by every inventory cue, so a fast drag never stacks pick, rotate and place; a refusal is always heard
  if (key !== 'inv_refuse' && t - EFC_SND.invLast < 0.07) return false;
  EFC_SND.last[key] = t; EFC_SND.invLast = t;
  efcHandlingLayers(key, auOut(null, 0.02, 1), t, { rate });
  return true;
}
efcOn('ui:inventory-gesture', (kind, item) => {
  const def = item && efcCall('item:def', item.id);
  const key = { pick: def?.kind === 'weapon' ? 'pickup' : 'inv_take', place: 'inv_drop', rotate: 'inv_rotate',
    refuse: 'inv_refuse', split: 'inv_split', equip: 'inv_equip', mount: 'inv_mount', unmount: 'inv_unmount' }[kind];
  if (key) efcInvSound(key, efcSndWeightRate(def ? def.w * (item.n || 1) : 1));
});

/* ---------- Inventory diff: what the last inv:changed did ---------- */
function efcSndInvSnap(inv) {
  if (!inv || !Array.isArray(inv.bag)) return null;
  const bag = new Map(); let total = 0;
  for (const it of inv.bag) if (it && it.id) { const n = it.n || 1; bag.set(it.id, (bag.get(it.id) || 0) + n); total += n; }
  const slots = {};
  for (const [k, it] of Object.entries(inv.slots || {})) slots[k] = it && it.id ? it.id : null;
  return { inv, bag, total, slots };
}
/* The sound of the change from a to b (null when nothing to hear: an item came in, or the inventory was replaced) */
function efcSndInvDiff(a, b) {
  if (!a || !b || a.inv !== b.inv) return null;
  let gained = false, lost = false;
  for (const k of new Set(Object.keys(a.slots).concat(Object.keys(b.slots)))) {
    if (b.slots[k] && b.slots[k] !== a.slots[k]) gained = true;
    else if (a.slots[k] && !b.slots[k]) lost = true;
  }
  if (gained) return 'inv_equip';
  if (lost) return b.total > a.total ? 'inv_unequip' : 'inv_drop';
  if (b.total < a.total) {
    for (const [id, n] of a.bag) {
      if ((b.bag.get(id) || 0) < n) { const d = typeof efcItemDef === 'function' ? efcItemDef(id) : null; return d && d.kind === 'med' ? 'inv_med' : 'inv_drop'; }
    }
    return 'inv_drop';
  }
  return null;
}
efcOn('inv:changed', () => {
  const s = efcSndInvSnap(EFC.inv), k = efcSndInvDiff(EFC_SND.prevInv, s);
  EFC_SND.prevInv = s;
  if (k) efcInvSound(k);
});
efcOn('loot:give', () => { efcInvSound('inv_take'); });
efcOn('raid:begin', () => { EFC_SND.prevInv = efcSndInvSnap(EFC.inv); EFC_SND.busy = false; });
/* Panel open and close: the UI's 'ui:panel'(open, kind, containerId) event when it emits one, else its busy state polled each step */
efcOn('ui:panel', (open, kind) => {
  EFC_SND.panelEv = true;
  efcInvSound(open ? (kind === 'loot' ? 'inv_search' : 'inv_open') : 'inv_close');
});
efcOn('tick', () => {
  if (!EFC_SND.panelEv) {
    const busy = !!efcCall('ui:busy');
    if (busy !== EFC_SND.busy) efcInvSound(busy ? 'inv_open' : 'inv_close');
    EFC_SND.busy = busy;
  }
});

// Runs once when the local player's controller accepts a weapon switch.
function efcSndHolster() {
  if (typeof sfxMech === 'function') sfxMech('stow');
}
