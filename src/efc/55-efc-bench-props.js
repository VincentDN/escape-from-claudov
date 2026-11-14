/* Escape From Claudov main-menu bench (P4), part 2: what lies on the bench. The engine's own AK-47 (buildWorldGun, 06-weapons.js) lying
   on its side as in Partisan's opener, the old phone face up with its lit two-tone LCD, and the Claude flag draped over the near edge:
   the word CLAUDE in the game's amber on a dark field with an emblem of our own (a ring round a peak over two waves, for the harbour
   town), drawn on a canvas. The cloth is a grid bent over the table edge on the CPU each frame (Partisan's drapeFlag). */
const EFC_BENCH_FLAG = { x: [-0.95, -0.25], flat: 0.3, height: 0.4, bend: 0.012, cols: 36, rows: 26 };
const EFC_BENCH_RIFLE = { x: 0.04, z: 0.47, yaw: -0.22 };
const EFC_BENCH_PHONE = { at: [-0.36, 0.64], w: 0.048, l: 0.113, t: 0.016, screen: { w: 0.034, h: 0.0195, y: 0.022 } };
const EFC_BENCH_LOG = ['> claudov.sys v0.4', '> harbour net . ok', '> radio 98.4 ok', '> stash .... ok', '> wardens: 11', '> squad: 3 alive', '> extract: north', '> cache: 2 rifles', '> mesh link . ok', '> awaiting input'];

/* The flag's canvas. The cloth maps it turned half a turn (texture flipY off, u along +x), so it is drawn rotated here to read upright */
function efcBenchFlagCanvas() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 292;
  const g = c.getContext('2d'), W = c.width, H = c.height;
  g.translate(W, H); g.rotate(Math.PI);
  g.fillStyle = '#16181b'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(246,196,69,.9)'; g.fillRect(0, 10, W, 6); g.fillRect(0, H - 16, W, 6); // amber hems
  // The camera sees the hoist end (canvas left) beside the rifle's stock: the word across the top, the emblem under it.
  // emblem: a ring, a peak inside it and two waves under the peak
  const ex = 175, ey = 112, r = 34;
  g.strokeStyle = '#f6c445'; g.lineWidth = 6; g.beginPath(); g.arc(ex, ey, r, 0, Math.PI * 2); g.stroke();
  g.lineJoin = 'round'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(ex - 21, ey + 4); g.lineTo(ex - 5, ey - 19); g.lineTo(ex + 3, ey - 8); g.lineTo(ex + 9, ey - 15); g.lineTo(ex + 22, ey + 4); g.stroke();
  for (const dy of [13, 23]) { g.beginPath(); for (let i = 0; i <= 8; i++) { const x = ex - 24 + i * 6, y = ey + dy + (i % 2 ? -2 : 2); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  g.fillStyle = '#f6c445'; g.textBaseline = 'middle'; g.textAlign = 'left'; g.font = '700 46px Impact, "Arial Narrow", sans-serif';
  g.fillText('CLAUDE', 140, 40);
  // light wear: a few darker blotches so the cloth does not look printed
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.12})`; g.beginPath(); g.ellipse(rnd() * W, rnd() * H, 8 + rnd() * 40, 4 + rnd() * 14, rnd() * 3, 0, Math.PI * 2); g.fill(); }
  return c;
}
function efcBenchFlag(B) {
  const F = EFC_BENCH_FLAG, geo = new THREE.PlaneGeometry(1, 1, F.cols, F.rows);
  const tex = new THREE.CanvasTexture(efcBenchFlagCanvas()); tex.flipY = false; tex.encoding = THREE.sRGBEncoding;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, side: THREE.DoubleSide }));
  m.material.envMapIntensity = 0.28; m.castShadow = m.receiveShadow = true; m.frustumCulled = false; m.userData.efcBench = true;
  B.scene.add(m); B.flag = m; B.flagTex = tex;
  efcBenchDrape(B, 0, false);
}
/* Most of the cloth lies flat on the table, it bends over the near edge and the rest hangs, swaying a little (not under reduced motion) */
function efcBenchDrape(B, time, move) {
  const F = EFC_BENCH_FLAG, T = EFC_BENCH_TABLE, geo = B.flag.geometry, p = geo.attributes.position, uv = geo.attributes.uv;
  const width = F.x[1] - F.x[0], edge = T.z[0], arc = (F.bend * Math.PI) / 2;
  for (let i = 0; i < p.count; i++) {
    const u = uv.getX(i), v = uv.getY(i), s = (1 - v) * F.height;
    let x = F.x[0] + u * width, y, z;
    if (s < F.flat) { y = T.top + 0.002; z = edge + F.flat - s; }
    else if (s < F.flat + arc) { const a = (s - F.flat) / F.bend; y = T.top + 0.002 - F.bend * (1 - Math.cos(a)); z = edge - F.bend * Math.sin(a); }
    else {
      const h = s - F.flat - arc, k = h / (F.height - F.flat);
      y = T.top + 0.002 - F.bend - h;
      const sway = move ? Math.sin(time * 1.1 + u * 5) * 0.008 * k + Math.sin(time * 0.7 + u * 11) * 0.003 * k : 0;
      z = edge - F.bend - Math.sin(u * Math.PI * 5) * 0.012 * k - 0.01 * k * k - sway;
      if (move) x += Math.sin(time * 0.9 + v * 4) * 0.004 * k;
    }
    p.setXYZ(i, x, y, z);
  }
  p.needsUpdate = true; geo.computeVertexNormals();
}

/* The engine's AK-47 on the bench: the detailed level of the world model only, with its own copies of the shared materials (the bench
   renders with tone mapping and sRGB output; the match keeps its programs). Muzzle toward +x, the top of the rifle away from the
   camera (+z), lying on its right side, as Partisan lays its rifle */
function efcBenchRifle(B) {
  const w = buildWorldGun('ak47'), g = w.group;
  for (const m of g.children.slice()) {
    if (m.userData.gunLod !== 'hi') { g.remove(m); continue; }
    m.visible = true; m.layers.set(0); m.castShadow = m.receiveShadow = true; m.userData.efcBench = true;
    m.material = m.material.clone(); m.material.envMapIntensity = 0.28;
    // its flat low-poly faces sit in the lamp's mirror direction and the specular lobe washes them out to beige: matte here, so the rifle
    // reads as dark steel and red-brown wood, as in a match
    m.material.roughness = 0.8; m.material.metalness *= 0.5; m.material.color.multiplyScalar(0.8); B.ownMats.push(m.material);
  }
  const inner = new THREE.Group(); inner.add(g);
  inner.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new V3(0, -1, 0), new V3(0, 0, 1), new V3(-1, 0, 0)));
  inner.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(inner), c = box.getCenter(new V3());
  inner.position.sub(c);
  const holder = new THREE.Group(); holder.add(inner); holder.userData.efcBench = true; holder.userData.efcRifle = true;
  B.scene.add(holder); B.rifle = holder; B.rifleHalf = (box.max.y - box.min.y) / 2; B.rifleLen = box.max.x - box.min.x;
  efcBenchPlaceRifle(B, 0, 0);
}
function efcBenchPlaceRifle(B, lx, ly) {
  const tilt = ly * 0.07, R = EFC_BENCH_RIFLE; // lift the far edge a touch with the mouse, as if checking the ejection port
  B.rifle.position.set(R.x, EFC_BENCH_TABLE.top + B.rifleHalf + Math.abs(tilt) * B.rifleHalf, R.z);
  B.rifle.rotation.set(tilt, R.yaw + lx * 0.08, 0, 'YXZ');
}

/* The phone, face up beside the rifle with its screen lit (a 113 x 48 x 22 mm candy-bar phone, as in Partisan) */
function efcBenchPhone(B) {
  const P = EFC_BENCH_PHONE, T = EFC_BENCH_TABLE, phone = new THREE.Group();
  phone.position.set(P.at[0], T.top, P.at[1]); phone.rotation.order = 'YXZ'; phone.rotation.set(-Math.PI / 2, Math.PI - 0.5, 0);
  B.scene.add(phone); phone.updateMatrixWorld(true);
  const sh = new THREE.Shape(), w = P.w / 2, h = P.l / 2, r = 0.012;
  sh.moveTo(-w + r, -h); sh.lineTo(w - r, -h); sh.quadraticCurveTo(w, -h, w, -h + r); sh.lineTo(w, h - r); sh.quadraticCurveTo(w, h, w - r, h);
  sh.lineTo(-w + r, h); sh.quadraticCurveTo(-w, h, -w, h - r); sh.lineTo(-w, -h + r); sh.quadraticCurveTo(-w, -h, -w + r, -h);
  const std = (c, ro) => efcBenchStd(B, c, ro), add = (g, m, x, y, z, cast = true) => efcBenchPart(B, g, m, [x, y, z], null, cast, phone);
  add(new THREE.ExtrudeGeometry(sh, { depth: P.t, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.002, bevelSegments: 2, curveSegments: 6 }), std(0x1f251c, 0.5), 0, 0, 0);
  const top = P.t + 0.003, sc = P.screen, key = std(0x3a4234, 0.45);
  add(new THREE.PlaneGeometry(sc.w + 0.008, sc.h + 0.009), std(0x0c100a, 0.3), 0, sc.y, top + 0.0003, false); // bezel
  add(new THREE.BoxGeometry(0.012, 0.0015, 0.001), std(0x0a0c09, 0.55), 0, sc.y + sc.h / 2 + 0.009, top + 0.0003, false); // earpiece
  add(new THREE.CylinderGeometry(0.0075, 0.0075, 0.003, 16).rotateX(Math.PI / 2), std(0x2b3126, 0.4), 0, -0.004, top + 0.0015, false);
  for (const x of [-0.016, 0.016]) add(new THREE.BoxGeometry(0.008, 0.005, 0.0025), key, x, -0.006, top + 0.0012, false);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) add(new THREE.BoxGeometry(0.011, 0.0055, 0.0028), key, (col - 1) * 0.0135, -0.02 - row * 0.0082, top + 0.0014, false);
  const lcd = document.createElement('canvas'); lcd.width = 84; lcd.height = 48;
  const tex = new THREE.CanvasTexture(lcd); tex.encoding = THREE.sRGBEncoding; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(sc.w, sc.h), new THREE.MeshBasicMaterial({ map: tex, color: 0xc8c8c8 }));
  scr.position.set(0, sc.y, top + 0.0006); scr.userData.efcBench = true; phone.add(scr);
  B.phone = phone; B.lcd = lcd; B.lcdTex = tex; B.lcdAt = -1; B.ownMats.push(scr.material);
  efcBenchLcd(B, 0);
}
/* The LCD, 84 x 48 two-tone pixels redrawn 12 times a second: the emblem's peak in a sweeping light, dithered, then a console log */
function efcBenchLcd(B, time) {
  if (time - B.lcdAt < 1 / 12 && B.lcdAt >= 0) return; B.lcdAt = time;
  const g = B.lcd.getContext('2d'), W = 84, H = 48, ON = '#1f2a14', OFF = '#9fb184';
  g.fillStyle = OFF; g.fillRect(0, 0, W, H); g.fillStyle = ON;
  for (let i = 0; i < 4; i++) { g.fillRect(1 + i * 2, 6 - i * 1.5, 1, 1 + i * 1.5); g.fillRect(W - 2 - i * 2, 6 - i * 1.5, 1, 1 + i * 1.5); }
  if (Math.floor(time / 9) % 2 === 0) {
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], lx = W / 2 + Math.cos(time * 1.3) * 30, ly = H / 2 + Math.sin(time * 1.3) * 16;
    for (let y = 9; y < H - 2; y++) for (let x = 14; x < W - 14; x++) {
      const dx = x - W / 2, dy = y - 27, inPeak = dy > -14 + Math.abs(dx) * 0.9 && dy < 8, ring = Math.abs(Math.hypot(dx, dy * 1.1) - 17) < 1.6;
      if (!inPeak && !ring) continue;
      const v = 0.35 + 0.65 * Math.max(0, 1 - Math.hypot(x - lx, y - ly) / 46);
      if (v * 16 > BAYER[(y & 3) * 4 + (x & 3)]) g.fillRect(x, y, 1, 1);
    }
  } else {
    g.font = '7px monospace'; g.textBaseline = 'top'; g.textAlign = 'left';
    const shown = Math.floor((time % 9) * 2), start = Math.max(0, shown - 5), L = EFC_BENCH_LOG;
    for (let i = start; i <= Math.min(shown, L.length - 1); i++) g.fillText(L[i], 1, 10 + (i - start) * 7);
    if (Math.floor(time * 2) % 2) g.fillRect(1, 10 + (Math.min(shown, L.length - 1) - start + 1) * 7, 4, 6);
    const img = g.getImageData(0, 0, W, H), px = img.data; // hard LCD edges: no grey text
    for (let k = 0; k < px.length; k += 4) { const on = px[k + 1] < 120; px[k] = on ? 0x1f : 0x9f; px[k + 1] = on ? 0x2a : 0xb1; px[k + 2] = on ? 0x14 : 0x84; }
    g.putImageData(img, 0, 0);
  }
  B.lcdTex.needsUpdate = true;
}
