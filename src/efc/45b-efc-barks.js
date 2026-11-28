/* C16 raid barks. The host owns voice choice and the event clock. */
const EFC_BARKS = {
  spot: { lead: 0.6, cooldown: 3, priority: 2, range: 45, captions: ['Contact!', 'I see someone!'] },
  lost: { lead: 0.6, cooldown: 5, priority: 1, range: 45, captions: ['Lost them.', 'I have no visual.'] },
  flank_left: { lead: 0.8, cooldown: 6, priority: 2, range: 45, captions: ['Going left!', 'I’ll take the left.'] },
  flank_right: { lead: 0.8, cooldown: 6, priority: 2, range: 45, captions: ['Going right!', 'I’ll take the right.'] },
  frag: { lead: 0.8, cooldown: 4, priority: 4, range: 45, captions: ['Throwing a frag!', 'Throwing a grenade!'] },
  flash: { lead: 0.8, cooldown: 4, priority: 4, range: 45, captions: ['Throwing a flash!', 'Watch your eyes!'] },
  smoke: { lead: 0.8, cooldown: 4, priority: 4, range: 45, captions: ['Throwing smoke!', 'Putting down smoke!'] },
  suppress: { lead: 0.6, cooldown: 5, priority: 2, range: 45, captions: ['Keeping them down!', 'Covering fire!'] },
  reload: { lead: 0.6, cooldown: 5, priority: 2, range: 45, captions: ['Reloading!', 'Changing magazines!'] },
  move_up: { lead: 0.6, cooldown: 5, priority: 2, range: 45, captions: ['Moving up!', 'Pushing forward!'] },
  fall_back: { lead: 0.6, cooldown: 5, priority: 2, range: 45, captions: ['Falling back!', 'Pulling back!'] },
  help: { lead: 0.6, cooldown: 7, priority: 3, range: 45, captions: ['Need help!', 'I need backup!'] },
  man_down: { lead: 0.6, cooldown: 5, priority: 3, range: 45, captions: ['Man down!', 'We lost one!'] },
  search: { lead: 0.6, cooldown: 7, priority: 1, range: 45, captions: ['Checking the area.', 'I’ll look around.'] },
  all_clear: { lead: 0.6, cooldown: 8, priority: 1, range: 45, captions: ['All clear.', 'Nothing here.'] },
};
const EFC_BARK_BOT_COOLDOWN = 4;
const EFC_BARK_WARNING_PRIORITY = 4;
let efcBarkSpeakers = new WeakMap();
const efcBarkKinds = new Map();

efcOn('raid:begin', () => {
  efcBarkSpeakers = new WeakMap();
  efcBarkKinds.clear();
});

function efcBarkEligible(bot) {
  return efcRaidLive() && efcIsHost() && bot?.alive && !bot.off && !bot.out && !efcIsHumanEnt(bot) && !bot.isRemote;
}

function efcBarkAudible(bot, range) {
  return entities.some((entity) => efcIsHumanEnt(entity) && entity.alive && !entity.off && !entity.out &&
    entity.pos.distanceToSquared(bot.pos) <= range ** 2);
}

function efcBark(bot, kind, data = {}) {
  if (!efcBarkEligible(bot) || !Object.hasOwn(EFC_BARKS, kind)) return null;
  const rule = EFC_BARKS[kind];
  if (!efcBarkAudible(bot, rule.range)) return null;

  const now = MATCH.time;
  const last = efcBarkSpeakers.get(bot);
  const lastKind = efcBarkKinds.get(kind) ?? -Infinity;
  if (!data.actionWarning && rule.priority < EFC_BARK_WARNING_PRIORITY &&
      (now - lastKind < rule.cooldown ||
       (last && now - last.at < EFC_BARK_BOT_COOLDOWN && rule.priority <= last.priority))) return null;

  const rng = data.rng ?? Math.random;
  const line = rule.captions[Math.floor(rng() * rule.captions.length)];
  const voice = bot.efcBarkVoice ?? (bot.squad === 's' ? 's' : 'w');
  const bark = { id: bot.id, kind, line, voice, pos: bot.pos.toArray(), at: now };
  efcBarkSpeakers.set(bot, { at: now, priority: rule.priority });
  efcBarkKinds.set(kind, now);
  efcEmit('bark', bark);
  return bark;
}

/* Actions are advanced by raid simulation time, so pausing cannot consume their warning. */
const efcBarkActions = new Map();
let efcBarkBursts = new WeakMap();

function efcBarkAction(bot, kind, action, valid = () => true, slot = kind) {
  let actions = efcBarkActions.get(bot);
  if (actions?.has(slot)) return false;
  if (!efcBarkEligible(bot) || !efcBarkAudible(bot, EFC_BARKS[kind].range)) return action();
  if (!actions) efcBarkActions.set(bot, actions = new Map());
  const bark = efcBark(bot, kind, { actionWarning: kind === 'reload' });
  actions.set(slot, { kind, action, valid, life: bot.spawnAt, at: bark ? bark.at + EFC_BARKS[kind].lead : null });
  return false;
}

function efcBarkActionTick() {
  if (!efcIsHost()) { efcBarkActions.clear(); return; }
  for (const [bot, actions] of efcBarkActions) {
    for (const [slot, pending] of actions) {
      if (!efcBarkEligible(bot) || bot.spawnAt !== pending.life || !pending.valid()) {
        actions.delete(slot);
        continue;
      }
      if (pending.at === null && efcBarkAudible(bot, EFC_BARKS[pending.kind].range)) {
        const bark = efcBark(bot, pending.kind);
        if (bark) pending.at = bark.at + EFC_BARKS[pending.kind].lead;
        continue;
      }
      if (pending.at !== null && MATCH.time < pending.at) continue;
      actions.delete(slot);
      pending.action();
    }
    if (!actions.size) efcBarkActions.delete(bot);
  }
}

function efcBarkFireReady(bot) {
  const kind = 'suppress';
  if (!efcBarkEligible(bot) || !efcBarkAudible(bot, EFC_BARKS[kind].range)) return true;
  const now = MATCH.time;
  const burst = efcBarkBursts.get(bot);
  if (burst && burst.life === bot.spawnAt) {
    if (now < burst.ready) return false;
    if (now - burst.lastShot <= 1.25) { burst.lastShot = now; return true; }
  }
  // A firefight can involve several speakers. Keep the warning lead for each
  // new burst without making one hostile wait for another's cooldown.
  const bark = efcBark(bot, kind, { actionWarning: true });
  if (!bark) return false;
  const ready = bark.at + EFC_BARKS[kind].lead;
  efcBarkBursts.set(bot, { life: bot.spawnAt, ready, lastShot: ready });
  return false;
}

function efcBarkActionReset() {
  efcBarkActions.clear();
  efcBarkBursts = new WeakMap();
}

efcProvide('bark:before', efcBarkAction);
efcOn('tick', efcBarkActionTick);
efcOn('raid:begin', efcBarkActionReset);
efcOn('raid:over', efcBarkActionReset);
efcOn('match:left', efcBarkActionReset);
