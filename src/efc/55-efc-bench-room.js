/* Escape From Claudov main-menu bench (P4), part 1: the room. A port of Partisan Project's opening scene (intro/workbench.js and
   shared/bench-scene.js, three.js r169 modules) to this engine's r147 global THREE: a table under a work lamp, a pegboard wall, the
   props (screwdriver, file, rag, ammo tin, power strip with a lit switch), the lamp shade and bulb, and the old radio. Original low-poly
   geometry built in code, no model or texture file. Scene space as in Partisan: metres, table top at y = EFC_BENCH_TABLE.top, near edge
   at z = EFC_BENCH_TABLE.z[0], the camera behind the near edge looking +z (so world -x is screen right).
   Static meshes that share a material are merged (mergeGunParts, 06-weapons.js) to keep the draw calls low. */
const EFC_BENCH_TABLE = { top: 0.86, x: [-0.95, 0.95], z: [0.24, 1.04] };
const EFC_BENCH_LAMP = { pos: [0.42, 1.62, 0.78], target: [0.02, 0.86, 0.6] };

/* Material cache: Partisan's std(color, roughness, extra) helper, one material per distinct look */
function efcBenchStd(B, color, roughness = 0.85, extra = {}) {
  const key = color + '|' + roughness + '|' + JSON.stringify(Object.keys(extra).sort().map((k) => [k, extra[k] && extra[k].isTexture ? extra[k].uuid : extra[k]]));
  if (!B.mats[key]) { const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness }, extra)); m.envMapIntensity = 0.28; B.mats[key] = m; }
  return B.mats[key];
}

/* Repeatable wood grain on a canvas (Partisan's woodTexture, seeded) */
function efcBenchWood() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d'); let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.fillStyle = '#6b5238'; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 150; i++) {
    const y = rnd() * 256;
    g.strokeStyle = `rgba(${rnd() < 0.5 ? '40,26,14' : '150,118,82'},${0.08 + rnd() * 0.18})`; g.lineWidth = 0.5 + rnd() * 2;
    g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x / 70 + i) * 3); g.stroke();
  }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(20,14,8,${rnd() * 0.25})`; g.beginPath(); g.ellipse(rnd() * 512, rnd() * 256, 4 + rnd() * 30, 2 + rnd() * 10, 0, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* Partisan's studio light probe (tools/assets/generate-studio-hdr.py, CC0 by that project), recomputed here at 128 x 64 instead of
   loading its .hdr: four soft-edged softboxes on a dim cyclorama, converted to a PMREM for the metal's reflections */
function efcBenchEnv(B) {
  const W = 128, H = 64, d = new Uint16Array(W * H * 4), h = THREE.DataUtils.toHalfFloat, R = Math.PI / 180;
  const boxes = [[58, 32, 22, 15, 26, [1, 0.95, 0.88]], [-122, 22, 8, 26, 14, [0.85, 0.92, 1]], [150, 6, 30, 10, 3.5, [1, 1, 1]], [0, 82, 40, 6, 6, [1, 1, 1]]];
  const sm = (x) => { const t = Math.min(Math.max((1 - Math.abs(x)) / 0.18, 0), 1); return t * t * (3 - 2 * t); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const az = ((x + 0.5) / W - 0.5) * 2 * Math.PI, el = (0.5 - (y + 0.5) / H) * Math.PI, up = Math.sin(el);
    const base = up > 0 ? 0.05 + 0.22 * Math.pow(up, 1.5) : 0.045 + 0.02 * up, c = [base, base, base * 1.03];
    for (const [a, e, hw, hh, p, rgb] of boxes) {
      const da = ((az - a * R + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      const m = sm(da * Math.cos(el) / (hw * R)) * sm((el - e * R) / (hh * R)) * p;
      c[0] += m * rgb[0]; c[1] += m * rgb[1]; c[2] += m * rgb[2];
    }
    const o = ((H - 1 - y) * W + x) * 4; // DataTexture rows run bottom-up: the top of the image is the zenith
    d[o] = h(c[0]); d[o + 1] = h(c[1]); d[o + 2] = h(c[2]); d[o + 3] = h(1);
  }
  const t = new THREE.DataTexture(d, W, H, THREE.RGBAFormat, THREE.HalfFloatType);
  t.mapping = THREE.EquirectangularReflectionMapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(t).texture;
  pm.dispose(); t.dispose();
  B.env = env; B.scene.environment = env;
}

/* Collects a static mesh for merging: geometry with the transform baked in later, by material and shadow flag */
function efcBenchPart(B, geo, mat, pos, rot, cast = true, parent = null) {
  const o = new THREE.Object3D(); o.position.set(pos[0], pos[1], pos[2]);
  if (rot) o.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  (parent || B.scene).add(o); o.updateMatrixWorld(true);
  if (mat.map) { // textured parts keep their UVs: a mesh of their own
    const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; m.userData.efcBench = true;
    m.position.copy(o.position); m.rotation.copy(o.rotation); (parent || B.scene).add(m); (parent || B.scene).remove(o); return m;
  }
  const key = mat.uuid + (cast ? '+' : '-');
  (B.parts[key] || (B.parts[key] = { mat, cast, list: [] })).list.push({ geo, m: o.matrixWorld.clone() });
  (parent || B.scene).remove(o);
  B.geos.push(geo);
  return null;
}
/* Merges the collected parts: one mesh per material and shadow flag */
function efcBenchMergeParts(B) {
  for (const k in B.parts) {
    const P = B.parts[k], geo = mergeGunParts(P.list);
    const m = new THREE.Mesh(geo, P.mat); m.castShadow = P.cast; m.receiveShadow = true; m.userData.efcBench = true;
    B.scene.add(m); B.merged.push(geo);
  }
  for (const g of B.geos) g.dispose(); // the source pieces are copied into the merged buffers
  B.parts = {}; B.geos = [];
}

/* Room, table, lamp, props and radio (Partisan's buildBenchScene, minus the flag and the phone: 55-efc-bench-props.js) */
function efcBenchRoom(B) {
  const S = B.scene, T = EFC_BENCH_TABLE, L = EFC_BENCH_LAMP;
  S.fog = new THREE.Fog(0x07090a, 2.2, 5);
  // one warm work lamp, a cold fill, a dim light probe for the metal (Partisan's intensities, physically correct lights)
  S.add(new THREE.HemisphereLight(0x4a5a66, 0x120d08, 0.35));
  const lamp = new THREE.SpotLight(0xffc98a, 26, 4, 0.62, 0.55, 2);
  lamp.position.set(L.pos[0], L.pos[1], L.pos[2]); lamp.target.position.set(L.target[0], L.target[1], L.target[2]);
  lamp.castShadow = !NO_SHADOWS;
  const sz = Math.min(2048, (RQ.q && RQ.q.shadow) || 1024); lamp.shadow.mapSize.set(sz, sz);
  lamp.shadow.bias = -0.0004; lamp.shadow.normalBias = 0.01;
  S.add(lamp, lamp.target); B.lamp = lamp;
  const fill = new THREE.DirectionalLight(0x6f8fb0, 0.35); fill.position.set(-1.5, 2, -1); S.add(fill);

  const std = (c, r, x) => efcBenchStd(B, c, r, x), part = (g, m, p, r, cast) => efcBenchPart(B, g, m, p, r, cast);
  const W = T.x[1] - T.x[0], D = T.z[1] - T.z[0], CX = (T.x[0] + T.x[1]) / 2, CZ = (T.z[0] + T.z[1]) / 2;
  B.wood = efcBenchWood();
  part(new THREE.BoxGeometry(W, 0.05, D), std(0xffffff, 0.78, { map: B.wood }), [CX, T.top - 0.025, CZ]);
  for (const x of [T.x[0] + 0.06, T.x[1] - 0.06]) for (const z of [T.z[0] + 0.06, T.z[1] - 0.06]) part(new THREE.BoxGeometry(0.07, T.top - 0.05, 0.07), std(0x3b2c1f), [x, (T.top - 0.05) / 2, z]);
  part(new THREE.PlaneGeometry(8, 8).rotateX(-Math.PI / 2), std(0x1b1d1e, 0.95), [0, 0, 0], null, false); // floor
  part(new THREE.PlaneGeometry(6, 3), std(0x2b2f2c, 0.95), [0, 1.5, T.z[1] + 0.05], null, false); // back wall (as in Partisan: it faces away, so the room reads dark behind the pegboard)
  part(new THREE.BoxGeometry(1.4, 0.8, 0.015), std(0x4a3f30, 0.9), [0.1, 1.42, T.z[1] + 0.035], null, false); // pegboard

  // props: screwdriver, file, rag, ammo tin, power strip with a lit switch
  const tools = std(0x3a3f44, 0.45, { metalness: 0.7 });
  part(new THREE.CylinderGeometry(0.014, 0.016, 0.11, 8).rotateZ(Math.PI / 2), std(0x3f4b3a, 0.6), [0.18, T.top + 0.016, 0.96], [0, 0.25, 0]);
  part(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 6).rotateZ(Math.PI / 2).translate(0.115, 0, 0), tools, [0.18, T.top + 0.016, 0.96], [0, 0.25, 0]);
  part(new THREE.BoxGeometry(0.2, 0.008, 0.025), tools, [0.32, T.top + 0.004, 0.72], [0, -0.4, 0]);
  part(new THREE.IcosahedronGeometry(0.1, 1).scale(1.3, 0.28, 1), std(0x6d6a60, 0.98, { flatShading: true }), [0.6, T.top + 0.012, 0.95], [0, 0.6, 0]);
  part(new THREE.BoxGeometry(0.18, 0.1, 0.1), std(0x3e4a32, 0.7), [-0.68, T.top + 0.05, 0.62], [0, 0.3, 0]);
  part(new THREE.BoxGeometry(0.06, 0.035, 0.3), std(0x8e9092, 0.6), [0.8, T.top + 0.018, 0.5], [0, -0.15, 0]);
  part(new THREE.BoxGeometry(0.03, 0.012, 0.03), std(0xff2a1a, 0.4, { emissive: 0xff2a1a, emissiveIntensity: 2.5 }), [0.8, T.top + 0.04, 0.4], null, false);
  // the lamp itself: a shade and a glowing bulb above the bench
  part(new THREE.ConeGeometry(0.12, 0.14, 10, 1, true), std(0x3c4a3f, 0.6, { side: THREE.DoubleSide }), [L.pos[0], L.pos[1] + 0.05, L.pos[2]], null, false);
  if (!B.mats.bulb) B.mats.bulb = new THREE.MeshBasicMaterial({ color: 0xfff0d0, fog: false });
  part(new THREE.SphereGeometry(0.03, 8, 6), B.mats.bulb, L.pos, null, false);

  // the old radio at the back of the bench: wooden case, cloth grille, lit tuning dial, two knobs and a carry handle
  const radio = new THREE.Group(); radio.position.set(-0.26, T.top, 0.92); radio.rotation.y = 0.25; S.add(radio); radio.updateMatrixWorld(true);
  const rp = (g, m, p) => efcBenchPart(B, g, m, p, null, true, radio);
  const w = 0.34, h = 0.21, d = 0.13, wood = std(0x4a2e1a, 0.6, { flatShading: true });
  rp(new THREE.BoxGeometry(w, h, d), wood, [0, h / 2, 0]);
  rp(new THREE.BoxGeometry(w + 0.012, 0.014, d + 0.012), std(0x2e1c10, 0.6), [0, h - 0.004, 0]); // lid lip
  rp(new THREE.BoxGeometry(w * 0.52, h * 0.72, 0.004), std(0x8a7a5c, 0.95), [-w * 0.2, h * 0.47, -d / 2 - 0.001]); // grille cloth
  for (let i = 0; i < 5; i++) rp(new THREE.BoxGeometry(w * 0.52, 0.008, 0.006), wood, [-w * 0.2, h * 0.18 + i * h * 0.14, -d / 2 - 0.004]); // slats
  rp(new THREE.BoxGeometry(w * 0.3, h * 0.26, 0.006), std(0x1a1410, 0.5), [w * 0.29, h * 0.68, -d / 2 - 0.002]); // dial bezel
  rp(new THREE.BoxGeometry(0.003, h * 0.18, 0.002), std(0x9a2a1a, 0.5), [w * 0.25, h * 0.68, -d / 2 - 0.007]); // needle
  for (const x of [0.2, 0.38]) rp(new THREE.CylinderGeometry(0.017, 0.019, 0.018, 10).rotateX(Math.PI / 2), std(0x201a15, 0.4), [w * x + w * 0.03, h * 0.26, -d / 2 - 0.009]);
  rp(new THREE.TorusGeometry(0.07, 0.008, 5, 10, Math.PI), std(0x2a2522, 0.5, { metalness: 0.4 }), [0, h + 0.002, 0]); // handle
  // the lit dial flickers (valve glow): its own material, not merged with anything
  const dial = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.26, h * 0.2).rotateY(Math.PI), new THREE.MeshStandardMaterial({ color: 0xffd9a0, roughness: 0.5, emissive: 0xffa447, emissiveIntensity: 1.4 }));
  dial.position.set(w * 0.29, h * 0.68, -d / 2 - 0.0055); dial.userData.efcBench = true; radio.add(dial);
  B.dial = dial; B.radio = radio;
}
