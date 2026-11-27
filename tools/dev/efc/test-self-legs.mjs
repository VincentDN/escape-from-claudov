import assert from 'node:assert/strict';
import { openGame, startSolo, simRun } from './harness.mjs';

const { browser, page, errors } = await openGame();
try {
  await startSolo(page);
  await simRun(page, 0.2);
  const result = await page.evaluate(() => {
    const model = PL.ent.model, mesh = efcSelfLegsMesh;
    const original = model.lod.lo.geometry;
    return {
      triangles: mesh.geometry.index.count / 3,
      originalTriangles: original.index.count / 3,
      sameSkeleton: mesh.skeleton === model.lod.lo.skeleton,
      sameMesh: mesh === efcSelfLegsBuild(model, model.lod.skin),
      screenLayer: mesh.layers.mask === MASK_SCREEN,
      castsShadow: mesh.castShadow,
    };
  });
  assert.ok(result.triangles > 0 && result.triangles < result.originalTriangles);
  assert.equal(result.sameSkeleton, true);
  assert.equal(result.sameMesh, true);
  assert.equal(result.screenLayer, true);
  assert.equal(result.castsShadow, false);
  assert.deepEqual(errors, []);
  console.log('first-person legs mesh filters triangles and shares the soldier skeleton');
} finally {
  await browser.close();
}
