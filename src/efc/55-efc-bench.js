/* Escape From Claudov main-menu bench (P4), part 3: life cycle and drawing. The main menu shows Partisan Project's opening shot, the
   over-the-shoulder view of a rifle lying on a workbench, drawn by the game's own renderer in place of the animated key art
   (09w-fond.js calls efcBenchInit from mbgInit and efcBenchDraw from mbgDraw, inside the engine's frame loop: no second WebGL context).
   - Main menu: drawn every frame, with Partisan's idle motion (a slow camera sway, the mouse looking round a little, the flag swaying,
     the LCD and the radio dial). Sub-screens: the bench is paused (one still frame, re-drawn only when the size changes) under the
     screen's usual shade. Reduced motion: one still frame, no sway, no mouse look.
   - The bench is a scene of its own, never added to the match scene. Its render state (tone mapping, sRGB output, physically correct
     lights, viewport, clear colour, shadow update flag) is set for its draw and restored straight after. When a match runs, the lamp's
     shadow map is released; it comes back with the next menu frame.
   - Falls back to the key art (efcBenchInit returns false) in safe graphics mode, at the lowest quality (Minimale), without WebGL, or if
     building the bench fails; a lost context stops it (mbgFail) and the CSS key art shows again. */
const EFC_BENCH = {
  on: false, failed: false, scene: null, cam: null, mats: {}, ownMats: [], parts: {}, geos: [], merged: [], env: null,
  t: 0, look: { x: 0, y: 0 }, want: { x: 0, y: 0 }, drawn: '', firstAt: null, buildMs: 0, frameMs: 0, stats: null,
};
const EFC_BENCH_SHOT = { pos: [-0.56, 1.86, 0], target: [-0.06, 0.84, 0.42] }; // behind and above the right shoulder, looking down at the rifle
const _ebV2 = new THREE.Vector2(), _ebV4 = new THREE.Vector4(), _ebCol = new THREE.Color(), _ebBg = new THREE.Color().setRGB(7 / 255, 9 / 255, 10 / 255);

/* Whether the bench may replace the key art on this machine */
function efcBenchWanted() {
  if (EFC_BENCH.failed || window.EFC_BENCH_OFF) return false;
  if (Settings.gfxSafe || GFX_SAFE || ULTRA) return false; // lowest quality and safe mode keep the key art
  try { return !!renderer.getContext() && !renderer.getContext().isContextLost(); } catch (e) { return false; }
}
/* Builds the bench. True when it replaces the key art (mbgInit then skips the key art) */
function efcBenchInit() {
  const B = EFC_BENCH;
  if (B.on) return true;
  if (!efcBenchWanted()) return false;
  const t0 = performance.now();
  try {
    B.scene = new THREE.Scene(); B.scene.userData.efcBench = true;
    B.cam = new THREE.PerspectiveCamera(42, 1, 0.05, 20);
    efcBenchRoom(B); efcBenchFlag(B); efcBenchPhone(B); efcBenchRifle(B); efcBenchMergeParts(B);
    B.scene.traverse((o) => { if (o.isMesh && o.material.isMeshStandardMaterial) o.material.onBeforeCompile = efcBenchSpotFix; });
    if (!COARSE) addEventListener('pointermove', (e) => { B.want.x = (e.clientX / Math.max(1, innerWidth)) * 2 - 1; B.want.y = (e.clientY / Math.max(1, innerHeight)) * 2 - 1; }, { passive: true });
    B.on = true; B.buildMs = Math.round(performance.now() - t0);
    const bg = $('menuBg'); if (bg) bg.classList.add('bench'); // no flash of the key art before the first bench frame
    return true;
  } catch (e) {
    console.warn('[efc] bench unavailable, key art kept', e); efcBenchFree(true); B.failed = true; return false;
  }
}
/* three r147's lights_fragment_begin reads the spot shadow coordinates as vSpotShadowCoord, but the vertex stage declares vSpotLightCoord
   (the engine never casts spot shadows, so it never met this): the bench's materials use the declared name */
function efcBenchSpotFix(sh) { sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_begin>', THREE.ShaderChunk.lights_fragment_begin.replace(/vSpotShadowCoord/g, 'vSpotLightCoord')); }
function efcBenchMotion() { return typeof mbgMotion === 'function' ? mbgMotion() : true; }
/* One bench frame (from mbgDraw). Returns true when it drew */
function efcBenchDraw(dt) {
  const B = EFC_BENCH; if (!B.on || B.failed) return;
  const main = UI.screen === 'main', move = efcBenchMotion();
  renderer.getDrawingBufferSize(_ebV2);
  const key = _ebV2.x + 'x' + _ebV2.y, live = main && move;
  if (!live && B.drawn === key) return; // paused or reduced motion: the still frame stays on the canvas
  const t0 = performance.now(), d = Math.min(dt || 0, 0.05);
  if (live) B.t += d;
  // look: the mouse moves the view a little, eased (Partisan's 1 - exp(-4 dt))
  if (live) { const k = 1 - Math.exp(-d * 4); B.look.x += (B.want.x - B.look.x) * k; B.look.y += (B.want.y - B.look.y) * k; }
  else if (!move) { B.look.x = B.look.y = 0; }
  const L = B.look, S = EFC_BENCH_SHOT, sway = move ? Math.sin(B.t * 0.6) * 0.006 : 0, cam = B.cam;
  cam.aspect = VIEW.w / Math.max(1, VIEW.h); cam.fov = cam.aspect < 1 ? 60 : 42; cam.updateProjectionMatrix();
  cam.position.set(S.pos[0] + L.x * 0.05, S.pos[1] - L.y * 0.03 + sway, S.pos[2]);
  cam.lookAt(S.target[0] + L.x * 0.1, S.target[1] - L.y * 0.06, S.target[2]);
  efcBenchPlaceRifle(B, L.x, L.y);
  if (move) { efcBenchDrape(B, B.t, true); efcBenchLcd(B, B.t); B.dial.material.emissiveIntensity = 1.3 + Math.random() * 0.15; }
  efcBenchRender(B);
  B.drawn = key; B.frameMs = Math.round((performance.now() - t0) * 10) / 10;
  if (B.firstAt === null) B.firstAt = Math.round(performance.now());
  if (!MBG.live) { MBG.live = true; const bg = $('menuBg'); if (bg) bg.classList.add('gl'); }
  return true;
}
/* Draws the bench scene to the screen with its own render state, then puts the engine's back */
function efcBenchRender(B) {
  // the light probe is built on the second frame, so the first one is not held up by its conversion
  if (!B.env && B.firstAt !== null) { try { efcBenchEnv(B); } catch (e) { B.env = 'none'; } B.drawn = ''; }
  const r = renderer, prev = {
    tm: r.toneMapping, tme: r.toneMappingExposure, enc: r.outputEncoding, pcl: r.physicallyCorrectLights, sm: r.shadowMap.needsUpdate,
    rt: r.getRenderTarget(), ca: r.getClearAlpha(), info: { calls: r.info.render.calls, tri: r.info.render.triangles },
  };
  r.getViewport(_ebV4); r.getClearColor(_ebCol);
  try {
    r.setRenderTarget(null); r.setViewport(0, 0, VIEW.w, VIEW.h);
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.outputEncoding = THREE.sRGBEncoding; r.physicallyCorrectLights = true;
    r.shadowMap.needsUpdate = true;
    r.setClearColor(_ebBg, 1); r.clear(true, true, false);
    r.render(B.scene, B.cam);
    B.stats = { calls: r.info.render.calls - prev.info.calls, triangles: r.info.render.triangles - prev.info.tri };
  } finally {
    r.toneMapping = prev.tm; r.toneMappingExposure = prev.tme; r.outputEncoding = prev.enc; r.physicallyCorrectLights = prev.pcl;
    r.shadowMap.needsUpdate = prev.sm; r.setClearColor(_ebCol, prev.ca); r.setRenderTarget(prev.rt); r.setViewport(_ebV4);
  }
}
/* Releases GPU memory the bench holds. all: the whole bench (failure or test), else only the lamp's shadow map while a match runs */
function efcBenchFree(all) {
  const B = EFC_BENCH;
  if (B.lamp && B.lamp.shadow && B.lamp.shadow.map) { B.lamp.shadow.map.dispose(); B.lamp.shadow.map = null; }
  B.drawn = '';
  if (!all) return;
  for (const g of B.merged) g.dispose();
  for (const k in B.mats) { const m = B.mats[k]; if (m.map) m.map.dispose(); m.dispose(); }
  for (const m of B.ownMats) { if (m.map) m.map.dispose(); m.dispose(); }
  if (B.flag) { B.flag.geometry.dispose(); B.flag.material.dispose(); }
  if (B.flagTex) B.flagTex.dispose();
  if (B.dial) { B.dial.geometry.dispose(); B.dial.material.dispose(); }
  if (B.env && B.env.dispose) B.env.dispose();
  B.on = false; B.scene = null; B.mats = {}; B.ownMats = []; B.merged = []; B.env = null;
  const bg = $('menuBg'); if (bg) bg.classList.remove('bench');
}
/* Lost context (from mbgFail): stop, and let the CSS key art show */
function efcBenchFail() { EFC_BENCH.failed = true; const bg = $('menuBg'); if (bg) bg.classList.remove('bench'); }
efcOn('tick', () => { if (EFC_BENCH.lamp && EFC_BENCH.lamp.shadow.map) efcBenchFree(false); });
efcOn('raid:begin', () => efcBenchFree(false));
