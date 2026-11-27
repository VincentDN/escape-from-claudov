import assert from 'node:assert/strict';
import { openGame, startSolo, simRun } from './harness.mjs';

const { browser, page, errors } = await openGame();
try {
  await startSolo(page);
  await simRun(page, 0.2);
  const result = await page.evaluate(() => {
    const model = PL.ent.model, mesh = efcSelfLegsMesh;
    const original = model.lod.lo.geometry;
    const vertices = Array.from({ length: 24 }, (_, i) =>
      mesh.geometry.index.getX(Math.floor(i * mesh.geometry.index.count / 24)));
    const worldVertex = (skin, index) => {
      const rest = new V3().fromBufferAttribute(skin.geometry.attributes.position, index);
      return skin.boneTransform(index, rest).applyMatrix4(skin.matrixWorld);
    };
    const samplePose = () => {
      scene.updateMatrixWorld(true);
      return vertices.map((index) => worldVertex(mesh, index));
    };
    const standing = samplePose();
    PL.crouchToggle = true;
    for (let i = 0; i < 24; i++) matchTick(1 / 60, true);
    const crouched = samplePose();
    const maxPoseChange = Math.max(...standing.map((vertex, i) => vertex.distanceTo(crouched[i])));
    const maxPoseError = Math.max(...crouched.map((vertex, i) =>
      vertex.distanceTo(worldVertex(model.lod.lo, vertices[i]).add(mesh.position))));
    const bodyHidden = !model.root.visible;
    const playing = mesh.visible;
    const offset = (pitch, crouch) => {
      camera.rotation.x = pitch;
      PL.ent.crouchAmt = crouch;
      efcSelfLegsTick(PL.ent);
      return mesh.position.length();
    };
    const offsets = [offset(0, 0), offset(-Math.PI / 3, 0), offset(0, 1), offset(-Math.PI / 2, 1)];
    VM.root.visible = false;
    efcSelfLegsTick(PL.ent);
    const outsideFirstPerson = mesh.visible;
    VM.root.visible = true;
    efcSelfLegsTick(PL.ent);
    const backInFirstPerson = mesh.visible;
    killEnt(PL.ent, PL.ent, NET_WSPECIAL.fall, false);
    return {
      triangles: mesh.geometry.index.count / 3,
      originalTriangles: original.index.count / 3,
      sameSkeleton: mesh.skeleton === model.lod.lo.skeleton,
      sameMesh: mesh === efcSelfLegsBuild(model, model.lod.skin),
      screenLayer: mesh.layers.mask === MASK_SCREEN,
      castsShadow: mesh.castShadow,
      playing, outsideFirstPerson, backInFirstPerson,
      dead: mesh.visible,
      maxPoseChange, maxPoseError, bodyHidden, offsets,
    };
  });
  assert.ok(result.triangles > 0 && result.triangles < result.originalTriangles);
  assert.equal(result.sameSkeleton, true);
  assert.equal(result.sameMesh, true);
  assert.equal(result.screenLayer, true);
  assert.equal(result.castsShadow, false);
  assert.equal(result.playing, true);
  assert.equal(result.outsideFirstPerson, false);
  assert.equal(result.backInFirstPerson, true);
  assert.equal(result.dead, false);
  assert.equal(result.bodyHidden, true);
  assert.ok(result.maxPoseChange > 0.05, 'legs follow crouching');
  assert.ok(result.maxPoseError < 0.00001, 'legs match the hidden soldier in world space');
  assert.deepEqual(result.offsets.map((value) => +value.toFixed(3)), [0.14, 0.22, 0.10, 0.18]);
  assert.deepEqual(errors, []);
  console.log('first-person legs follow the hidden soldier pose and hide outside the live first-person view');
} finally {
  await browser.close();
}
