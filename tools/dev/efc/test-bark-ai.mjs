import assert from 'node:assert/strict';
import { openGame, startSolo } from './harness.mjs';

const { browser, page, errors } = await openGame({ settings: { map: 'claudov', mode: 'raid' } });
try {
  await page.evaluate(async () => {
    Settings.map = 'claudov';
    Settings.mode = 'raid';
    Settings.difficulty = 1;
    await mapEnsure(Settings.map);
  });
  await startSolo(page);
  await page.waitForFunction(() => MATCH.state === 'playing' &&
    entities.some((entity) => entity.squad === 'w' && entity.alive && efcWardenPost(entity)) &&
    entities.some((entity) => entity.squad === 's' && entity.alive),
    null, { timeout: 90000, polling: 250 }).catch(async (error) => {
      const state = await page.evaluate(() => ({
        map: MAPL.id, mode: MATCH.mode, difficulty: Settings.difficulty,
        phase: MATCH.state, squads: entities.filter((entity) => entity.alive).map((entity) => entity.squad),
      }));
      throw new Error('Claudov raid speakers did not spawn: ' + JSON.stringify(state), { cause: error });
    });
  const timing = await page.evaluate(() => {
    GPUX.halt = true;
    const player = PL.ent;
    const warden = entities.find((entity) => entity.squad === 'w' && entity.alive && efcWardenPost(entity));
    const scavenger = entities.find((entity) => entity.squad === 's' && entity.alive);
    if (!warden || !scavenger) throw new Error('The Claudov raid needs one Warden and one Scavenger');
    warden.pos.copy(player.pos).x += 4;
    scavenger.pos.copy(player.pos).z += 4;
    const events = [], results = {};
    efcOn('bark', (bark) => events.push(bark));
    let time = 10;
    const test = (kind, trigger, acted, speaker = warden, advance = efcBarkActionTick) => {
      efcBarkActionReset();
      MATCH.time = time += 10;
      events.length = 0;
      trigger();
      const bark = events.find((event) => event.kind === kind && event.id === speaker.id);
      if (!bark || acted()) throw new Error(`${kind}: missing warning or immediate action`);
      MATCH.time = bark.at + EFC_BARKS[kind].lead - 0.01;
      advance();
      if (acted()) throw new Error(`${kind}: action happened early`);
      MATCH.time += 0.011;
      advance();
      if (!acted()) throw new Error(`${kind}: action did not happen after its lead`);
      results[kind + (speaker === scavenger ? '_scavenger' : '')] = { lead: MATCH.time - bark.at, voice: bark.voice };
    };

    const post = efcWardenPost(warden);
    const before = post.alertT;
    test('spot', () => efcWardenAlert(warden, player, MATCH.time), () => post.alertT !== before);

    warden.visible = false;
    warden.tactic = 'hunt';
    warden.lastKnown.copy(player.pos);
    test('search', () => botSearchStart(warden), () => warden.tactic === 'search');

    const oldClear = botNadeClear, oldSpawn = spawnNade;
    let thrown;
    try {
      botNadeClear = () => true;
      spawnNade = (actor, origin, velocity, fuse, kind) => { thrown = kind; };
      warden.onGround = true;
      warden.nades = 3;
      for (const kind of ['frag', 'flash', 'smoke']) {
        thrown = null;
        warden.nadeType = kind;
        test(kind, () => botThrowNade(warden, player.pos), () => thrown === kind);
      }
    } finally {
      botNadeClear = oldClear;
      spawnNade = oldSpawn;
    }

    const arms = warden.arms, weapon = armsW(warden);
    warden.busy = warden.sprinting = false;
    arms.reload = null;
    arms.boltT = arms.switching = arms.sprintW = 0;
    arms.autoReload = 0.01;
    weapon.mag = 0;
    weapon.reserve = Math.max(1, weapon.reserve);
    test('reload', () => ctlWeapon(warden, 1 / 30, MATCH.time), () => !!arms.reload);

    const oldShoot = ctlShoot;
    let fired = false;
    try {
      ctlShoot = () => { fired = true; };
      arms.reload = null;
      arms.fireCd = 0;
      weapon.mag = 2;
      const fire = () => {
        warden.input.fire = warden.input.firePressed = true;
        ctlWeapon(warden, 1 / 30, MATCH.time);
      };
      test('suppress', fire, () => fired, warden, fire);
    } finally {
      ctlShoot = oldShoot;
      warden.input.fire = warden.input.firePressed = false;
    }

    const second = entities.find((entity) => entity !== warden && entity.squad === 'w' && entity.alive);
    if (!second) throw new Error('The firing regression needs two Wardens');
    second.pos.copy(player.pos).x -= 4;
    const pair = [warden, second], shotRay = fireRay;
    MATCH.time = time += 10;
    efcBarkActionReset();
    efcBark(warden, 'spot');
    efcBark(second, 'move_up');
    const counts = pair.map((bot) => bot.arms.shots);
    for (const bot of pair) {
      bot.busy = bot.sprinting = false;
      Object.assign(bot.arms, { reload: null, fireCd: 0, sprintW: 0, switching: 0, boltT: 0 });
      armsW(bot).mag = 2;
    }
    const pullTriggers = () => {
      for (const bot of pair) {
        bot.input.fire = bot.input.firePressed = true;
        ctlWeapon(bot, 1 / 60, MATCH.time);
      }
    };
    try {
      fireRay = () => false;
      pullTriggers();
      const warnings = events.filter((event) => event.kind === 'suppress' && event.at === MATCH.time);
      if (warnings.length !== 2 || pair.some((bot, i) => bot.arms.shots !== counts[i])) {
        throw new Error('Both Wardens must warn before their first shots');
      }
      MATCH.time += EFC_BARKS.suppress.lead + 0.001;
      pullTriggers();
      if (pair.some((bot, i) => bot.arms.shots !== counts[i] + 1 || armsW(bot).mag !== 1)) {
        throw new Error('Both Wardens must fire and spend a round after the same warning window');
      }
    } finally {
      fireRay = shotRay;
      for (const bot of pair) bot.input.fire = bot.input.firePressed = false;
    }

    const oldLine = lineClear;
    try {
      lineClear = () => true;
      const state = scavenger.efcScav;
      state.next = 0;
      state.target = null;
      test('spot', () => efcCall('scav:update', scavenger, 1 / 30, MATCH.time), () => state.target === player, scavenger);
    } finally {
      lineClear = oldLine;
    }
    return results;
  });
  assert.deepEqual(Object.keys(timing), ['spot', 'search', 'frag', 'flash', 'smoke', 'reload', 'suppress', 'spot_scavenger']);
  for (const [key, value] of Object.entries(timing)) {
    assert.ok(value.lead >= 0.6, key);
    assert.equal(value.voice, key.endsWith('_scavenger') ? 's' : 'w');
  }
  assert.deepEqual(errors, []);
  console.log('Warden and Scavenger action hooks honored bark lead time');
} finally {
  await browser.close();
}
