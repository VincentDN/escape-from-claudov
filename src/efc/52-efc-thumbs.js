/* Escape From Claudov item thumbnails. Every item gets a small picture (256 x 96, transparent) rendered once, on first need, by the
   game's own renderer into an offscreen target (no second WebGL context), read back and kept in memory as a data URL. Weapons are the
   engine's world gun models (buildWorldGun) seen from the side, orthographic, muzzle to the right; other items are the code-built props of
   52-efc-thumb-props.js in three-quarter view. One item is drawn per animation frame and every renderer setting touched is restored.
   Service 'thumb:get'(itemId) -> url or null (null until ready; asking queues it). Event 'thumb:ready'(itemId).
   Also the row helpers the hideout, raid and summary screens use: efcThumbRow, efcThumbInvHtml (a thumbnail at the left of each row). */
const EFC_TH = {
  W: 256, H: 96, SS: 2, // image size, supersampling of the render
  url: {}, fail: {}, queue: [], busy: false, done: 0,
  rt: null, px: null, img: null, big: null, small: null, scene: null, cam: null, lights: null, gunMats: new Map(),
};
const EFC_TH_REF = 1.25; // metres: a gun this long fills 92 % of the width; shorter guns shrink with the square root of their length

/* ---------- Placeholder silhouettes by kind (shown until the picture is ready) ---------- */
const EFC_TH_SIL = {
  weapon: 'M14 52h120l8-6h70v-6h20v10h12v8h-12v6h-60l-14 4h-34l-6 18h-16l4-18h-30l-26 20h-22l12-24h-26z',
  armor: 'M98 10h18q12 12 24 0h18l14 18v58h-88V28z',
  pack: 'M100 22q28-24 56 0v6h14v58H86V28h14z',
  ammo: 'M80 34h96v50H80zM80 44h96',
  med: 'M88 30h80v52H88zM120 40h16v12h12v12h-12v12h-16V64h-12V52h12z',
  loot: 'M128 14l34 34-34 34-34-34z',
};
function efcThumbSil(kind) {
  const k = EFC_TH_SIL[kind] ? kind : 'loot', c = EFC_TH.sil || (EFC_TH.sil = {});
  if (!c[k]) c[k] = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 96"><path d="${EFC_TH_SIL[k]}" fill="rgba(242,238,227,0.16)" fill-rule="evenodd"/></svg>`);
  return c[k];
}

/* ---------- Studio ---------- */
function efcThumbStudio() {
  if (EFC_TH.scene) return EFC_TH;
  const sc = new THREE.Scene(), L = {
    key: new THREE.DirectionalLight(0xfff4e6, 2.6), fill: new THREE.DirectionalLight(0xdce6ff, 1.1), rim: new THREE.DirectionalLight(0xffffff, 1.6),
    hemi: new THREE.HemisphereLight(0xf4f2ee, 0x5a554c, 1.1),
  };
  for (const k of ['key', 'fill', 'rim']) { sc.add(L[k]); sc.add(L[k].target); }
  sc.add(L.hemi);
  EFC_TH.scene = sc; EFC_TH.lights = L; EFC_TH.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
  return EFC_TH;
}
/* Gun materials for the studio: copies of the engine's with less metal (no environment here to reflect, so full metal reads black).
   Copies, so the engine's own materials keep their shader programs. */
function efcThumbGunMat(m) {
  let c = EFC_TH.gunMats.get(m);
  if (!c) {
    c = m.clone(); c.metalness = Math.min(m.metalness || 0, 0.25); c.roughness = Math.max(m.roughness == null ? 0.6 : m.roughness, 0.45);
    if (c.color) c.color.multiplyScalar(1.35);
    EFC_TH.gunMats.set(m, c);
  }
  return c;
}
/* The object to draw for an item: { obj, gun, muzzle, own } (own: geometries to dispose after the render) */
function efcThumbObject(def) {
  if (def.kind === 'weapon') {
    const wkey = def.weapon && def.weapon.wkey;
    if (!wkey || typeof buildWorldGun !== 'function' || typeof WEAPONS === 'undefined' || !WEAPONS[wkey]) return null;
    const G = buildWorldGun(wkey);
    setGunLod(G.group, true);
    for (const m of G.group.children) if (m.isMesh) { m.material = efcThumbGunMat(m.material); m.castShadow = false; }
    return { obj: G.group, gun: true, muzzle: G.muzzle, own: false };
  }
  return { obj: efcThumbProp(def), gun: false, own: true };
}
const _efcThV = new THREE.Vector3();
/* Places the orthographic camera (side view for guns, three-quarter for props), fits it to what it sees, aims the lights.
   Returns whether the muzzle ends up on the left (the picture is then mirrored so it points right) */
function efcThumbFrame(o) {
  const S = efcThumbStudio(), cam = S.cam, obj = o.obj, A = S.W / S.H;
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const dir = o.gun ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(Math.sin(0.62) * Math.cos(0.5), Math.sin(0.5), Math.cos(0.62) * Math.cos(0.5));
  cam.position.copy(c).addScaledVector(dir, 20); cam.up.set(0, 1, 0); cam.lookAt(c); cam.updateMatrixWorld(true);
  // bounds of the visible vertices in camera space
  const inv = cam.matrixWorldInverse; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
  obj.traverseVisible((m) => {
    const p = m.isMesh && m.layers.test(cam.layers) && m.geometry.attributes.position; if (!p) return;
    for (let i = 0; i < p.count; i++) {
      const v = _efcThV.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).applyMatrix4(inv);
      if (v.x < x0) x0 = v.x; if (v.x > x1) x1 = v.x; if (v.y < y0) y0 = v.y; if (v.y > y1) y1 = v.y; if (v.z < z0) z0 = v.z; if (v.z > z1) z1 = v.z;
    }
  });
  if (x0 > x1) { x0 = y0 = z0 = -1; x1 = y1 = z1 = 1; }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = (x1 - x0) / 2, hh = (y1 - y0) / 2;
  let halfW;
  if (o.gun) { // same rule for every gun: the share of the width grows with the square root of the length
    const fill = Math.min(0.94, Math.max(0.56, 0.92 * Math.sqrt(size.z / EFC_TH_REF)));
    halfW = Math.max(hw / fill, (hh / 0.84) * A);
  } else halfW = Math.max(hw / 0.88, (hh / 0.84) * A);
  const halfH = halfW / A;
  cam.left = cx - halfW; cam.right = cx + halfW; cam.top = cy + halfH; cam.bottom = cy - halfH;
  cam.near = Math.max(0.01, -z1 - 1); cam.far = -z0 + 1; cam.updateProjectionMatrix();
  // lights from the camera's frame: key above left, fill right, rim from behind above
  const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1), L = S.lights;
  const aim = (l, r, u, f) => { l.position.copy(c).addScaledVector(right, r).addScaledVector(up, u).addScaledVector(dir, f); l.target.position.copy(c); l.target.updateMatrixWorld(); };
  aim(L.key, -0.7, 1.2, 1.1); aim(L.fill, 1.3, 0.1, 0.8); aim(L.rim, 0.3, 1.0, -1.3);
  if (!o.gun || !o.muzzle) return false;
  const mz = _efcThV.copy(o.muzzle).applyMatrix4(obj.matrixWorld).applyMatrix4(inv);
  return mz.x < cx;
}
/* Renders the studio into the offscreen target and reads it back; every renderer setting changed is put back as it was */
function efcThumbDraw(mirror) {
  const r = renderer, S = EFC_TH, w = S.W * S.SS, h = S.H * S.SS;
  if (!S.rt) { S.rt = new THREE.WebGLRenderTarget(w, h); S.rt.texture.encoding = THREE.sRGBEncoding; S.px = new Uint8Array(w * h * 4); }
  const keep = efcThumbRState(), info = r.info.render, ki = { calls: info.calls, triangles: info.triangles, points: info.points, lines: info.lines, frame: info.frame };
  try {
    r.setRenderTarget(S.rt); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.1; r.autoClear = true; r.setClearColor(0x000000, 0);
    r.render(S.scene, S.cam);
    r.readRenderTargetPixels(S.rt, 0, 0, w, h, S.px);
  } finally {
    r.setRenderTarget(keep.rt, keep.face, keep.mip); r.toneMapping = keep.tm; r.toneMappingExposure = keep.ex; r.autoClear = keep.ac;
    r.setClearColor(keep.cc, keep.ca); r.shadowMap.needsUpdate = keep.sh;
    Object.assign(info, ki);
  }
  // WebGL rows go bottom to top; mirrored when the muzzle came out on the left
  if (!S.img) { S.img = new ImageData(w, h); S.big = document.createElement('canvas'); S.big.width = w; S.big.height = h; S.small = document.createElement('canvas'); S.small.width = S.W; S.small.height = S.H; }
  const d = S.img.data, px = S.px, row = w * 4;
  for (let y = 0; y < h; y++) {
    const src = (h - 1 - y) * row, dst = y * row;
    if (!mirror) d.set(px.subarray(src, src + row), dst);
    else for (let x = 0; x < w; x++) { const a = src + x * 4, b = dst + (w - 1 - x) * 4; d[b] = px[a]; d[b + 1] = px[a + 1]; d[b + 2] = px[a + 2]; d[b + 3] = px[a + 3]; }
  }
  S.big.getContext('2d').putImageData(S.img, 0, 0);
  const ctx = S.small.getContext('2d'); ctx.clearRect(0, 0, S.W, S.H); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(S.big, 0, 0, S.W, S.H);
  return S.small.toDataURL('image/webp', 0.92);
}
/* The renderer settings a thumbnail touches (the test compares them before and after) */
function efcThumbRState() {
  const r = renderer;
  return { rt: r.getRenderTarget(), face: r.getActiveCubeFace(), mip: r.getActiveMipmapLevel(), tm: r.toneMapping, ex: r.toneMappingExposure, ac: r.autoClear,
    cc: r.getClearColor(new THREE.Color()), ca: r.getClearAlpha(), sh: r.shadowMap.needsUpdate, oe: r.outputEncoding };
}
/* Draws one item now; returns its url or '' on failure */
function efcThumbRender(id) {
  const def = efcCall('item:def', id); if (!def) return '';
  let o = null;
  try {
    o = efcThumbObject(def); if (!o || !o.obj) throw new Error('no model');
    const S = efcThumbStudio();
    S.scene.add(o.obj);
    const mirror = efcThumbFrame(o);
    EFC_TH.url[id] = efcThumbDraw(mirror);
    S.scene.remove(o.obj);
  } catch (e) {
    EFC_TH.fail[id] = (EFC_TH.fail[id] || 0) + 1;
    if (o && o.obj && o.obj.parent) o.obj.parent.remove(o.obj);
    console.warn('[efc] thumbnail failed: ' + id + ' ' + (e && e.message));
  }
  if (o && o.own && o.obj) o.obj.traverse((m) => { if (m.isMesh) m.geometry.dispose(); });
  return EFC_TH.url[id] || '';
}

/* ---------- Queue: one item per animation frame (more if they are quick), never while a map loads ---------- */
function efcThumbWant(id) {
  if (EFC_TH.url[id] || (EFC_TH.fail[id] || 0) >= 2 || EFC_TH.queue.includes(id)) return;
  EFC_TH.queue.push(id);
  if (!EFC_TH.busy) { EFC_TH.busy = true; requestAnimationFrame(efcThumbStep); }
}
function efcThumbStep() {
  const Q = EFC_TH.queue;
  if (!Q.length) { EFC_TH.busy = false; return; }
  const gl = renderer.getContext();
  if ((typeof MAPL !== 'undefined' && MAPL.state === 'loading') || (gl && gl.isContextLost && gl.isContextLost())) { setTimeout(() => requestAnimationFrame(efcThumbStep), 400); return; }
  const t0 = performance.now();
  do {
    const id = Q.shift(), url = efcThumbRender(id);
    if (url) { EFC_TH.done++; efcEmit('thumb:ready', id); }
    else if ((EFC_TH.fail[id] || 0) < 2) Q.push(id); // one more try later
  } while (Q.length && performance.now() - t0 < 6);
  requestAnimationFrame(efcThumbStep);
}
efcProvide('thumb:get', (id) => {
  if (typeof id !== 'string') return null;
  if (EFC_TH.url[id]) return EFC_TH.url[id];
  if (efcCall('item:def', id)) efcThumbWant(id);
  return null;
});
// a picture that arrives replaces the placeholder in every row on screen (no re-render: focus and scroll stay put)
efcOn('thumb:ready', (id) => {
  const url = EFC_TH.url[id]; if (!url) return;
  for (const el of document.querySelectorAll('img[data-efc-thumb]')) if (el.dataset.efcThumb === id) { el.src = url; el.removeAttribute('data-pend'); }
});

/* ---------- Rows with a thumbnail ---------- */
function efcThumbImg(id, kind, big) {
  const url = efcCall('thumb:get', id);
  return `<span class="efc-th${big ? ' big' : ''}" aria-hidden="true"><img alt="" draggable="false" data-efc-thumb="${esc(id)}" src="${url || efcThumbSil(kind)}"${url ? '' : ' data-pend=""'}></span>`;
}
/* efcUiRow (50-efc-ui-menu.js) with the thumbnail as the first cell of the row button; slots (o.slot) get the larger one */
function efcThumbRow(it, o = {}) {
  const h = efcUiRow(it, o), at = h.indexOf('<button class="efc-it'), end = at < 0 ? -1 : h.indexOf('>', at);
  if (end < 0) return h;
  const th = efcThumbImg(it.id, efcUiDef(it.id).kind, !!o.slot);
  return h.slice(0, at) + '<button class="efc-it efc-thr' + h.slice(at + 21, end + 1) + th + h.slice(end + 1);
}
const EFC_TH_SLOTKIND = { primary: 'weapon', sidearm: 'weapon', armor: 'armor', pack: 'pack' };
function efcThumbEmptySlot(slot, label) {
  return `<div class="efc-row" role="listitem"><div class="efc-it efc-thr empty"><span class="efc-th big" aria-hidden="true"><img alt="" src="${efcThumbSil(EFC_TH_SLOTKIND[slot])}"></span>`
    + `<span class="k">${esc(label)}</span><span class="nm">Empty</span><span class="n"></span><span class="w"></span><span class="v"></span></div></div>`;
}
/* efcUiInvHtml with thumbnails: the four slots, then the bag */
function efcThumbInvHtml(inv, o = {}) {
  let h = '';
  for (const [s, label] of EFC_UI_SLOTS) {
    const it = inv && inv.slots ? inv.slots[s] : null;
    h += it ? efcThumbRow(it, { slot: label, key: 'slot-' + s, data: { slot: s }, acts: o.slotActs ? o.slotActs(s, it) : null }) : efcThumbEmptySlot(s, label);
  }
  const bag = (inv && inv.bag) || [];
  h += `<p class="efc-gh">Bag</p>` + (bag.length ? bag.map((it, i) => efcThumbRow(it, { key: 'bag-' + i, data: { bag: i }, acts: o.bagActs ? o.bagActs(i, it) : null })).join('') : '<p class="efc-none">The bag is empty.</p>');
  return h;
}

/* Row layout: fixed boxes, so nothing moves when a picture arrives (rows 72 x 27, slots 112 x 42) */
(function efcThumbCss() {
  if (typeof document === 'undefined' || document.getElementById('efcThumbCss')) return;
  const st = document.createElement('style'); st.id = 'efcThumbCss';
  st.textContent = `
.efc-it.efc-thr.noslot { grid-template-columns: 72px minmax(0, 1fr) 3.2em 4.6em 5.4em; }
.efc-it.efc-thr:not(.noslot) { grid-template-columns: 112px 5.4em minmax(0, 1fr) 3.2em 4.6em 5.4em; }
.efc-it.efc-thr { padding-left: 6px; }
.efc-it.efc-thr > .efc-th { display: block; width: 72px; height: 27px; overflow: visible; border-radius: 2px;
  background: radial-gradient(ellipse at 50% 55%, rgba(242,238,227,.13), rgba(242,238,227,.03) 70%); }
.efc-it.efc-thr > .efc-th.big { width: 112px; height: 42px; }
.efc-th img { display: block; width: 100%; height: 100%; object-fit: contain; }
.efc-th img[data-pend] { opacity: .8; }
.efc-it.empty .efc-th img { opacity: .6; }`;
  document.head.appendChild(st);
})();
