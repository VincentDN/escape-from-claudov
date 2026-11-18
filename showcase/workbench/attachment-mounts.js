// Neutral game-art mounts: low scope rings and a two-point sling fitted to the current weapon's anchors.
import * as T from 'three';
import {real, Z_FWD} from './attachment-model.js';

const scopeBody = real('scope-zf4.glb', {
  nodes: [
    'ZF-4_Scope_1_ZF-4_Scope_1_Material_1_0',
    'ZF-4_Scope_1_ZF-4_Scope_1_Material_2_0',
    'ZF-4_Scope_1_Glass_1',
    'ZF-4_Scope_1_Glass_1001',
    'ZF-4_Scope_1_Reticle_1',
  ],
  scale: 1.2,
  rotation: Z_FWD,
  anchor: ['c', 'c', 'c'],
  offset: [0, 0.042, 0],
});
export function buildScope({materials}) {
  const root = new T.Group(),
    body = scopeBody();
  root.add(body);
  for (const x of [-0.071, 0.071]) {
    const ring = new T.Mesh(new T.TorusGeometry(0.023, 0.003, 6, 12).rotateY(Math.PI / 2), materials['h-190']);
    ring.position.set(x, 0.042, 0);
    const foot = new T.Mesh(new T.BoxGeometry(0.024, 0.023, 0.026), materials['h-190']);
    foot.position.set(x, 0.0115, 0);
    root.add(ring, foot);
  }
  root.userData.loading = true;
  body.addEventListener('loaded', () => {
    root.userData.loading = false;
    root.dispatchEvent({type: 'loaded'});
  });
  return root;
}
export function buildSling({materials, slingEnd = [0.64, 0, 0]}) {
  const root = new T.Group(),
    points = [],
    end = new T.Vector3(...slingEnd);
  // Both ends land on the weapon; the strap stays on its near side, outside the magazine and grip.
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    points.push(
      end
        .clone()
        .multiplyScalar(t)
        .add(new T.Vector3(0, -Math.sin(Math.PI * t) * 0.11, 0)),
    );
  }
  const curve = new T.CatmullRomCurve3(points);
  root.add(new T.Mesh(new T.TubeGeometry(curve, 32, 0.005, 4, false), materials.polymer));
  for (const p of [new T.Vector3(), end]) {
    const buckle = new T.Mesh(new T.BoxGeometry(0.016, 0.018, 0.008), materials.stell);
    buckle.position.copy(p);
    root.add(buckle);
  }
  return root;
}
