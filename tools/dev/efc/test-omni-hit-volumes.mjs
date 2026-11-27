import assert from 'node:assert/strict';
import { openGame, simRun, startSolo } from './harness.mjs';

const { page, browser, errors } = await openGame({ settings: { map: 'claudov', mode: 'raid' } });
try {
  await startSolo(page);
  await simRun(page, 0.95, 'KEYS.ControlLeft = true; PL.ent.health = 100;');
  const results = await page.evaluate(() => {
    const player = PL.ent;
    if (efcOmniState(player) !== 'prone') throw new Error('The hold must enter prone');
    const eyeHeight = entEye(player, new V3()).y - player.pos.y;
    const foes = entities.filter((entity) => entity.alive && !entity.isPlayer && entity.model && !allied(entity, player));
    const warden = foes.find((entity) => /warden/i.test(entity.name || ''));
    if (!warden) throw new Error('Missing Warden in raid: ' + foes.map((entity) => entity.name).join(', '));

    const original = entities.slice(), playerPosition = player.pos.clone();
    const wardenPosition = warden.pos.clone(), wardenVelocity = warden.vel.clone();
    const yaw = player.yaw, turn = player.efcProneTurn;
    const shots = [], aim = [];
    const rayPart = (origin, target) => {
      const direction = target.clone().sub(origin).normalize();
      const hit = rayEntities(origin, direction, origin.distanceTo(target) + 0.2, warden);
      return hit?.ent === player ? hit.part : null;
    };

    try {
      entities.splice(0, entities.length, player, warden);
      player.pos.set(0, 0, 0);
      KEYS.ControlLeft = KEYS.LeanL = KEYS.LeanR = false;
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        player.yaw = angle;
        player.efcProneTurn = null;
        efcOmniProneTurn(player, true, 0);
        player.yaw += Math.PI / 4; // Looking away must not immediately turn the body.
        efcOmniProneTurn(player, true, 0);

        const sideX = Math.cos(angle), sideZ = -Math.sin(angle);
        const fromSide = (forward, height) => {
          const target = new V3(-Math.sin(angle) * forward, height, -Math.cos(angle) * forward);
          const origin = target.clone().add(new V3(sideX * 3, 0, sideZ * 3));
          return rayPart(origin, target);
        };
        const prone = efcOmniState(player);
        const proneHead = fromSide(0.65, 0.30);
        const proneBody = fromSide(0.32, 0.24);
        const proneAboveHead = fromSide(0.65, 0.40);
        const oldHead = fromSide(0, 1.63);
        const lowLeg = fromSide(-0.65, 0.14);

        player.yaw = angle + Math.PI;
        efcOmniProneTurn(player, true, 0);
        const supine = efcOmniState(player);
        const supineHead = fromSide(0.65, 0.22);
        const supineBody = fromSide(0.32, 0.25);
        // This line brushes the upper edge of just the face-down head sphere.
        const supineAboveHead = fromSide(0.65, 0.40);

        KEYS.LeanR = true;
        efcOmniProneTurn(player, true, 0);
        const side = efcOmniState(player);
        const sideHead = fromSide(0.65, 0.22);
        KEYS.LeanR = false;
        shots.push({ prone, proneHead, proneBody, proneAboveHead, oldHead, lowLeg, supine, supineHead, supineBody, supineAboveHead, side, sideHead });

        warden.pos.set(sideX * 4, 0, sideZ * 4);
        warden.vel.set(0, 0, 0);
        poseSoldier(warden, 0);
        const eye = entEye(warden, new V3());
        player.yaw = angle;
        efcOmniProneTurn(player, true, 0);
        aim.push({ stance: efcOmniState(player), head: rayPart(eye, entHead(player, new V3())), chest: rayPart(eye, entChest(player, new V3())) });
      }
      const remote = { ...player, isPlayer: false, isRemote: true, remoteBot: false, model: null };
      const remoteHuman = hitSpheres(remote) === 5 && HS[0].c.y < 0.5;
      const remoteEyeHeight = entEye(remote, new V3()).y;
      remote.remoteBot = true;
      hitSpheres(remote);
      const remoteBot = HS[0].c.y;
      return { eyeHeight, shots, aim, remoteHuman, remoteEyeHeight, remoteBot };
    } finally {
      entities.splice(0, entities.length, ...original);
      player.pos.copy(playerPosition);
      player.yaw = yaw;
      player.efcProneTurn = turn;
      warden.pos.copy(wardenPosition);
      warden.vel.copy(wardenVelocity);
      KEYS.LeanR = false;
    }
  });
  assert.ok(results.eyeHeight > 0.33 && results.eyeHeight < 0.39, 'local prone eye follows the camera');
  const expected = {
    prone: 'prone', proneHead: 'head', proneBody: 'body', proneAboveHead: 'head', oldHead: null, lowLeg: 'legs',
    supine: 'supine', supineHead: 'head', supineBody: 'body', supineAboveHead: null,
    side: 'side', sideHead: 'head',
  };
  for (const shot of results.shots) assert.deepEqual(shot, expected);
  for (const aim of results.aim) assert.deepEqual(aim, { stance: 'prone', head: 'head', chest: 'body' });
  assert.equal(results.remoteHuman, true, 'remote human uses the prone profile');
  assert.equal(results.remoteEyeHeight, 0.35, 'remote prone eye uses the stance height');
  assert.ok(results.remoteBot > 1, 'remote bot keeps the legacy hit volumes');
  assert.deepEqual(errors, []);
  console.log('Prone, supine and side hit volumes and Warden aim passed in eight directions');
} finally {
  await browser.close();
}
