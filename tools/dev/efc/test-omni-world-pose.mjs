import assert from 'node:assert/strict';
import { createLobby, joinLobby, launch, openPair, stepBoth, waitInMatch } from './net2.mjs';

const rig = await openPair({ map: 'claudov' });
try {
  const code = await createLobby(rig.host, { map: 'claudov', mode: 'raid' });
  await joinLobby(rig.guest, code);
  await launch(rig.host);
  await Promise.all([waitInMatch(rig.host), waitInMatch(rig.guest)]);
  await stepBoth([rig.host, rig.guest], 1, 'PL.ent.health = 100;');
  for (const [owner, observer] of [[rig.guest, rig.host], [rig.host, rig.guest]]) {
    const ownerId = await owner.evaluate(() => NET.me);
    const sample = (page, id) => page.evaluate((id) => {
      const e = id === null ? PL.ent : NET.remotes.get(id);
      const s = e?.model;
      if (!s?.gun) return null;
      poseSoldier(e, 0);
      const grip = s.grips.R.clone().applyQuaternion(s.gun.quaternion).add(s.gun.position);
      return {
        position: s.gun.position.clone().sub(e.pos).toArray(),
        orientation: s.gun.quaternion.toArray(),
        headHeight: s.J[J_HEAD].y - e.pos.y,
        neckLength: s.J[J_HEAD].distanceTo(s.J[J_CHE]),
        shoulderRoll: s.J[J_SHR].y - s.J[J_SHL].y,
        gripDistance: s.J[J_HAR].distanceTo(grip),
        state: efcOmniState(e), side: e.efcProneTurn?.side || 0,
      };
    }, id);
    const compare = async (name, side = 0) => {
      let local, remote;
      for (let i = 0; i < 12; i++) {
        await stepBoth([owner, observer], 0.2, 'PL.ent.health = 100;');
        [local, remote] = await Promise.all([sample(owner, null), sample(observer, ownerId)]);
        if (local?.state === name && remote?.state === name && local.side === side && remote.side === side &&
            (name === 'stand' || Math.abs(local.orientation.reduce((dot, value, k) => dot + value * remote.orientation[k], 0)) > 0.99)) break;
      }
      assert.equal(local?.state, name);
      assert.equal(remote?.state, name);
      assert.equal(local.side, side);
      assert.equal(remote.side, side);
      const dot = Math.abs(local.orientation.reduce((sum, value, i) => sum + value * remote.orientation[i], 0));
      if (name !== 'stand') assert.ok(dot > 0.99, 'weapon orientation matches in low stances');
      for (const sample of [local, remote]) {
        assert.ok(sample.position.every(Number.isFinite));
        if (name === 'stand') assert.ok(sample.headHeight > 1);
        else {
          assert.ok(sample.headHeight <= 0.35, 'body geometry stays low');
          assert.ok(sample.neckLength < 0.22, 'head stays attached to the torso');
          assert.ok(sample.gripDistance < 0.25, 'right hand reaches the weapon');
          if (side) assert.ok(sample.shoulderRoll * side > 0.25, 'supine side roll cants the shoulders');
          else assert.ok(Math.abs(sample.shoulderRoll) < 0.01, 'unrolled shoulders stay level');
        }
      }
      console.log(`PASS ${owner.efcName} -> ${observer.efcName}: ${name}/${side}`);
      return local.orientation;
    };
    await owner.evaluate(() => { KEYS.KeyC = true; });
    const prone = await compare('prone');
    await owner.evaluate(() => { KEYS.KeyC = false; PL.yaw = PL.ent.efcProneTurn.anchorYaw + Math.PI; });
    const supine = await compare('supine');
    await owner.evaluate(() => { KEYS.LeanL = true; });
    const left = await compare('side', -1);
    await owner.evaluate(() => { KEYS.LeanL = false; KEYS.LeanR = true; });
    const right = await compare('side', 1);
    for (const [a, b] of [[prone, supine], [supine, left], [left, right]]) {
      assert.ok(Math.abs(a.reduce((sum, v, i) => sum + v * b[i], 0)) < 0.995, 'each stance has a distinct hold');
    }
    await owner.evaluate(() => { KEYS.LeanR = false; KEYS.Space = true; });
    await compare('stand');
    await owner.evaluate(() => { KEYS.Space = false; });
  }
  assert.deepEqual(rig.errors, []);
  console.log('omni world poses ok');
} finally {
  await rig.close();
}
