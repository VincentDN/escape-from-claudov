import assert from 'node:assert/strict';
import { openGame, startSolo } from './harness.mjs';

const { browser, page, errors } = await openGame({ settings: { mode: 'raid', map: 'simoun' } });
async function checkWeapon(weapon) {
  const result = await page.evaluate((weapon) => {
    groundHeight = () => 30;
    ceilingAbove = () => Infinity;
    collideCircle = () => {};
    const entity = PL.ent;
    entity.pos.y = 30;
    for (const other of entities) {
      if (!other.isPlayer) other.off = true;
    }
    entity.arms = makeArms([weapon]);
    vmEquip(curW().def);

    const dt = 1 / 30;
    const key = (type, code, value) => window.dispatchEvent(new KeyboardEvent(type, {
      code, key: value, bubbles: true,
    }));
    const tick = (count = 1) => {
      for (let i = 0; i < count; i++) {
        entity.health = 100;
        matchTick(dt, false);
      }
    };
    const sample = () => {
      const model = VM.cur;
      const position = VM.holder.position.toArray();
      const rotation = VM.holder.rotation.toArray().slice(0, 3);
      const contactError = (hand, frame, grip) => hand.position.clone()
        .add(frame.off.clone().applyQuaternion(hand.quaternion)).distanceTo(grip);
      vmScene.updateMatrixWorld(true);
      vmCamera.updateMatrixWorld(true);
      const projectedCenter = VM.holder.localToWorld(model.gripL.clone().lerp(model.gripR, 0.5))
        .project(vmCamera).toArray();
      return {
        state: efcOmniState(entity), id: VM.curDef.id, position, rotation,
        pose: [...VM.efcLowPose], visible: VM.holder.visible, projectedCenter,
        gripErrors: [
          contactError(VM.arms.R.hand, HAND_FRAMES.R, model.gripR),
          contactError(VM.arms.L.hand, lHandFrame(model), model.gripL),
        ],
      };
    };
    const hold = (yaw) => {
      PL.yaw = yaw;
      tick(28);
      return sample();
    };
    const sides = (yaw) => {
      key('keydown', 'KeyQ', 'q');
      const left = hold(yaw);
      key('keyup', 'KeyQ', 'q');
      const leftRelease = hold(yaw);
      key('keydown', 'KeyE', 'e');
      const right = hold(yaw);
      key('keyup', 'KeyE', 'e');
      const rightRelease = hold(yaw);
      return { left, leftRelease, right, rightRelease };
    };

    const standing = hold(0);
    key('keydown', 'KeyC', 'c');
    tick(12);
    const firstEntry = sample();
    key('keyup', 'KeyC', 'c');
    const prone = hold(0);
    const beforeCrawl = entity.pos.clone();
    KEYS.KeyW = true;
    tick(15);
    const crawl = sample();
    const crawlDistance = entity.pos.distanceTo(beforeCrawl);
    KEYS.KeyW = false;
    tick(16);
    const frontSides = sides(0);
    const backRight = hold(Math.PI * 0.85);
    const backSides = sides(Math.PI * 0.85);
    const returnRight = hold(0);
    const backLeft = hold(-Math.PI * 0.85);
    const returnLeft = hold(0);

    KEYS.Space = true;
    tick();
    KEYS.Space = false;
    const firstRise = sample();
    const risen = hold(0);
    return {
      standing, firstEntry, prone, crawl, crawlDistance, frontSides, backRight, backSides,
      returnRight, backLeft, returnLeft, firstRise, risen,
    };
  }, weapon);

  const { standing, firstEntry, prone, crawl, crawlDistance, frontSides, backRight, backSides,
    returnRight, backLeft, returnLeft, firstRise, risen } = result;
  assert.equal(standing.state, 'stand');
  assert.equal(firstEntry.state, 'prone');
  assert.ok(firstEntry.pose[1] < 0 && firstEntry.pose[1] > prone.pose[1]);
  assert.ok(prone.position[1] < standing.position[1] - 0.025, JSON.stringify({ standing, prone }));
  assert.equal(crawl.state, 'prone');
  assert.ok(crawlDistance > 0.25);

  for (const back of [backRight, backLeft]) {
    assert.equal(back.state, 'supine');
    assert.ok(back.rotation[1] - prone.rotation[1] > 0.45);
  }
  for (const returned of [returnRight, returnLeft]) {
    assert.equal(returned.state, 'prone');
    assert.ok(Math.abs(returned.rotation[1] - prone.rotation[1]) < 0.015);
  }
  for (const [sample, base] of [[frontSides, prone], [backSides, backRight]]) {
    assert.equal(sample.left.state, 'side');
    assert.equal(sample.right.state, 'side');
    assert.ok(sample.left.rotation[2] < base.rotation[2] - 0.3);
    assert.ok(sample.right.rotation[2] > base.rotation[2] + 0.3);
    for (const released of [sample.leftRelease, sample.rightRelease]) {
      assert.equal(released.state, base.state);
      assert.ok(Math.abs(released.rotation[2] - base.rotation[2]) < 0.015);
    }
  }
  const views = [
    standing, prone, crawl, frontSides.left, frontSides.right, backRight, backLeft,
    backSides.left, backSides.right, risen,
  ];
  for (const view of views) {
    assert.equal(view.id, weapon);
    assert.ok(view.visible && view.projectedCenter.slice(0, 2).every((v) => Math.abs(v) < 1),
      JSON.stringify(view));
    assert.ok(view.gripErrors.every((v) => v < 0.05), JSON.stringify(view));
  }

  assert.equal(firstRise.state, 'stand');
  assert.ok(firstRise.pose[1] < 0 && firstRise.pose[1] > prone.pose[1]);
  assert.equal(risen.state, 'stand');
  assert.deepEqual(risen.pose, standing.pose);
}

try {
  await startSolo(page);
  for (const weapon of ['ak47', 'l96', 'rem870']) await checkWeapon(weapon);
  assert.deepEqual(errors, []);
  console.log('First-person prone, supine and side holds passed for AK-47, L96 and Remington 870');
} finally {
  await browser.close();
}
