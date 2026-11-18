/* Claudov's scavengers spend two slots from the existing host-simulated raid bot budget. */
const EFC_SCAV_NAMES = ['Scavenger Dara', 'Scavenger Lenn'];

efcProvide('scav:count', budget => MAPL.id === 'claudov' && budget >= 7 ? 2 : 0);
efcOn('scav:assign', bots => {
  bots.forEach((bot, i) => {
    bot.squad = 's';
    bot.name = EFC_SCAV_NAMES[i];
    bot.efcScav = { i, next: 0, visited: '', phase: 'search', target: null, seenAt: -Infinity, post: null, item: '', retry: new Map(), sample: null, stuck: 0 };
  });
});
efcProvide('scav:spawn', bot => {
  if (bot.squad !== 's') return undefined;
  const { i } = bot.efcScav;
  const x = -21 + i * 2, z = 46;
  const id = navNode(x, gy0(x, z), z);
  const pos = id < 0 ? new V3(x, gy0(x, z), z) : new V3(NAV.nx[id], NAV.ny[id], NAV.nz[id]);
  pos.yaw = Math.PI;
  bot.weapon = WEAPONS.m9;
  if (bot.model.gunKey !== bot.weapon.key) setSoldierGun(bot.model, bot.weapon.key);
  bot.skin = 'shotgun';
  soldierLook(bot.model, bot.skin, skinRel(bot));
  return pos;
});
efcOn('scav:spawned', bot => {
  if (bot.squad !== 's') return;
  bot.nadeOn = false;
  bot.dmgMul = 0.45;
});

function efcScavengerNearest(bot, candidates) {
  return candidates.reduce((best, p) => !best || hyp(p.x - bot.pos.x, p.z - bot.pos.z) < hyp(best.x - bot.pos.x, best.z - bot.pos.z) ? p : best, null);
}

efcProvide('scav:update', (bot, dt, now) => {
  if (bot.squad !== 's' || !efcIsHost()) return false;
  const s = bot.efcScav, input = bot.input;
  if (now >= s.next) {
    s.next = now + 0.55;
    const stuck = s.sample && bot.path && bot.pathI < bot.path.length && s.sample.distanceToSquared(bot.pos) < 0.025;
    s.stuck = stuck ? s.stuck + 1 : 0;
    s.sample = bot.pos.clone();
    if (s.stuck >= 3) {
      if (s.item) s.retry.set(s.item, now + 12);
      s.item = ''; s.stuck = 0; bot.path = null; bot.goal = null;
    }
    const eye = entEye(bot, new V3()), at = new V3();
    const threats = entities.filter(e => efcIsHuman(e) && e.alive && !e.out && e.pos.distanceTo(bot.pos) <= 24 &&
      lineClear(eye, entChest(e, at)));
    const threat = threats.reduce((best, e) => !best || e.pos.distanceToSquared(bot.pos) < best.pos.distanceToSquared(bot.pos) ? e : best, null);
    if (threat) { s.target = threat; s.seenAt = now; }
    else if (now - s.seenAt > 8 || !s.target?.alive || s.target.out) s.target = null;
    if (s.target) {
      s.item = '';
      s.post = efcScavengerNearest(bot, efcCall('warden:posts') || []);
      s.phase = 'flee';
      if (s.post && hyp(bot.pos.x - s.post.x, bot.pos.z - s.post.z) <= s.post.r + 3) {
        efcEmit('scav:alert', s.post.i, s.target, now);
        s.phase = 'cornered';
      }
      if (s.phase === 'flee' && s.post && (!bot.goal || hyp(bot.goal.x - s.post.x, bot.goal.z - s.post.z) > 2)) {
        setPath(bot, new V3(s.post.x, s.post.y, s.post.z));
      }
      if (s.phase === 'flee' && (!bot.path?.length || s.target.pos.distanceTo(bot.pos) < 4)) s.phase = 'cornered';
    } else {
      s.phase = 'search'; s.post = null;
      const candidates = (efcCall('world:list') || []).filter(c => c.items.length && c.id !== s.visited &&
        (s.retry.get(c.id) || 0) <= now && ['crate', 'locker', 'bag'].includes(c.kind));
      const unclaimed = candidates.filter(c => !entities.some(other => other !== bot && other.alive && other.squad === 's' && other.efcScav?.item === c.id));
      const item = efcScavengerNearest(bot, unclaimed.length ? unclaimed : candidates);
      if (item && efcCall('world:scavenge', item.id, bot)) {
        s.visited = item.id; s.item = ''; bot.path = null; bot.goal = null;
      } else if (item) {
        s.item = item.id;
        if (!bot.goal || hyp(bot.goal.x - item.x, bot.goal.z - item.z) > 1 || !bot.path?.length) {
          setPath(bot, new V3(item.x, item.y, item.z));
          if (!bot.path?.length) { s.retry.set(item.id, now + 12); s.item = ''; }
        }
      }

    }
  }
  const dir = s.phase === 'cornered' ? null : pathDir(bot);
  const aim = s.phase === 'cornered' && s.target?.alive ? entChest(s.target, new V3()).sub(entEye(bot, new V3())) : null;
  if (aim) {
    bot.yaw = Math.atan2(-aim.x, -aim.z);
    bot.pitch = Math.atan2(aim.y, hyp(aim.x, aim.z));
  } else if (dir) {
    bot.yaw = Math.atan2(-dir[0], -dir[1]);
    bot.pitch = 0;
  }
  bot.lookYaw = bot.yaw;
  input.mx = 0; input.mz = dir ? (s.phase === 'flee' ? 1 : 0.55) : 0;
  const leg = dir && bot.path?.[bot.pathI];
  input.sprint = !!dir && s.phase === 'flee' && !leg?.drop;
  input.jump = !!(leg?.jump && bot.onGround && bot.pathI > 0 && botLeapNow(bot, bot.path[bot.pathI - 1], leg));
  input.fire = false;
  const clear = aim && (() => {
    const hit = rayEntities(entEye(bot, new V3()), aim.clone().normalize(), aim.length() + 0.2, bot);
    return hit?.ent === s.target && lineClear(entEye(bot, new V3()), entChest(s.target, new V3()));
  })();
  input.firePressed = !!clear && bot.arms.fireCd <= 0 && now - (s.shot ?? -99) > 0.65;
  if (input.firePressed) s.shot = now;
  input.reload = armsW(bot).mag === 0;
  input.ads = !!aim;
  ctlMove(bot, dt);
  ctlWeapon(bot, dt, now);
  animSoldier(bot, dt);
  return true;
});
