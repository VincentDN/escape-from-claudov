// L0 art style lab: the #artlab route boots Claudov empty, the panel opens and closes, every dial reaches the image, the "Current game"
// preset matches the lab being off, settings round-trip through copy and paste, and a normal raid never gets the lab pass.
// Run after python3 build.py: node tools/dev/efc/test-artlab.mjs (about 3 minutes with software rendering).
import assert from 'node:assert/strict';
import path from 'node:path';
import { launchEfcBrowser, REPO } from './harness.mjs';

const GAME = process.env.EFC_TEST_URL || 'file://' + path.join(REPO, 'dist/index.html');
const SETTINGS = { quality: 'medium', sv: 9, dynres: false, eco: false, mode: 'raid', map: 'claudov' };
const browser = await launchEfcBrowser();
let failed = false;
const ok = (name) => console.log('ok   ' + name);

async function open(hash) {
  const page = await browser.newPage({ viewport: { width: 480, height: 300 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(`try{localStorage.setItem('dc_settings', ${JSON.stringify(JSON.stringify(SETTINGS))})}catch(e){}; window.MATCH_COUNTDOWN = 0; window.EFC_TEST = true;`);
  await page.goto(GAME + hash);
  return { page, errors };
}

try {
  /* ---------- 1. The route boots with no hostiles ---------- */
  const { page, errors } = await open('#artlab');
  await page.waitForFunction(() => typeof EFC_ART !== 'undefined' && EFC_ART.active && EFC_ART.frames > 1, null, { timeout: 400000, polling: 500 });
  const boot = await page.evaluate(() => {
    for (let k = 0; k < 150; k++) matchTick(1 / 30, false); // five game seconds of logic
    return {
      map: MAPL.id, state: MATCH.state, online: MATCH.online, hostiles: entities.filter((e) => !e.isPlayer && (e.alive || !e.off)).length,
      left: MATCH.timeLeft, weapon: EFC.inv && EFC.inv.slots.primary && EFC.inv.slots.primary.id, vm: VM.root.visible,
      freeKitStored: efcCall('stash:get').freeKit, last: composer.passes[composer.passes.length - 1] === EFC_ART.pass,
    };
  });
  assert.deepEqual({ ...boot, left: boot.left > 20 * 60 * 10 }, {
    map: 'claudov', state: 'playing', online: false, hostiles: 0, left: true, weapon: 'w_sks', vm: true, freeKitStored: false, last: true,
  });
  ok('#artlab boots Claudov in a live raid with no Wardens or Scavengers, no lobby, a day on the clock, the free SKS, stash choice restored');

  const targetCheck = await page.evaluate(() => {
    const captured = [], renderWorld = worldPass.render;
    worldPass.render = function (renderer, write, read, ...args) {
      captured.push(read.samples);
      return renderWorld.call(this, renderer, write, read, ...args);
    };
    try {
      efcArtPreset('Current game');
      const phases = [];
      for (const enabled of [false, true, false]) {
        efcArtSet('dither', enabled ? 'bayer4' : 'off');
        for (let i = 0; i < 3; i++) composer.render(0);
        phases.push({ samples: captured.splice(0), scene: RQ.q.msaa, labOnScreen: enabled && EFC_ART.pass.renderToScreen,
          finalOnScreen: finalPass.renderToScreen });
      }
      return phases;
    } finally { worldPass.render = renderWorld; }
  });
  for (const [i, phase] of targetCheck.entries()) {
    assert.ok(phase.scene > 0 && phase.samples.every(samples => samples === phase.scene), JSON.stringify(phase));
    assert.equal(phase.labOnScreen, i === 1);
    assert.equal(phase.finalOnScreen, i !== 1);
  }
  ok('every scene frame uses the MSAA buffer with the Art Lab pass both off and on');

  /* ---------- 2. The panel opens and closes ---------- */
  // mouse-free mode, as the bench route uses: headless Chromium grants pointer lock asynchronously, and a lock that lands late would send
  // every click to the canvas. With it, closing the panel does not ask for the lock (the real game does, to resume looking around).
  await page.evaluate(() => { LOCK.fallback = true; if (document.pointerLockElement) document.exitPointerLock(); });
  const panelState = () => page.evaluate(() => ({ open: EFC_ART.open, hidden: document.getElementById('efcArtlab').hidden, state: MATCH.state }));
  await page.keyboard.press('F2');
  assert.deepEqual(await panelState(), { open: true, hidden: false, state: 'playing' });
  await page.keyboard.press('F2');
  assert.deepEqual(await panelState(), { open: false, hidden: true, state: 'playing' });
  await page.click('#efcArtChip', { timeout: 120000 });
  assert.deepEqual(await panelState(), { open: true, hidden: false, state: 'playing' });
  await page.keyboard.press('Escape');
  assert.deepEqual(await panelState(), { open: false, hidden: true, state: 'playing' });
  ok('F2 toggles the panel, the chip opens it, Escape closes it, the match never pauses');

  /* ---------- 3. Every dial changes what reaches the image ---------- */
  const dials = await page.evaluate(() => {
    efcArtPreset('Current game');
    const base = JSON.stringify(efcArtProbe()), out = [];
    for (const [key, , , kind, r] of EFC_ART_DIALS) {
      const d = EFC_ART.d[key];
      const v = kind === 'range' ? (d === r[0] ? r[0] + (r[1] - r[0]) * 0.5 : r[0] + (d - r[0]) * 0.5 + (r[1] - r[0]) * 0.01) : kind === 'select' ? r.find((o) => o !== d)
        : kind === 'color' ? (d === '#ff00ff' ? '#00ff00' : '#ff00ff') : !d;
      efcArtSet(key, v);
      // the viewmodel toggle only matters while a retro stage runs: give it one
      if (key === 'viewmodel') { efcArtSet('levels', 8); const a = JSON.stringify(efcArtProbe()); efcArtSet('viewmodel', d); const b = JSON.stringify(efcArtProbe()); out.push([key, a !== b]); }
      else out.push([key, JSON.stringify(efcArtProbe()) !== base]);
      efcArtPreset('Current game');
    }
    return out;
  });
  const dead = dials.filter(([, changed]) => !changed).map(([k]) => k);
  assert.deepEqual(dead, [], 'dials with no effect: ' + dead.join(', '));
  assert.equal(dials.length, 25);
  // and through the real panel control: a slider's input event reaches the uniform
  const viaUi = await page.evaluate(() => {
    const el = document.getElementById('efcArt-levels'); el.value = '9'; el.dispatchEvent(new Event('input', { bubbles: true }));
    const r = [EFC_ART.pass.mat.uniforms.uLevels.value, EFC_ART.pass.enabled, document.querySelector('label[for="efcArt-levels"] output').textContent];
    efcArtPreset('Current game');
    return r;
  });
  assert.deepEqual(viaUi, [9, true, '9']);
  ok(`all ${dials.length} dials change a uniform or engine value the frame reads (pass uniforms, bloom, fog, FOV, snap, texture filters)`);

  /* ---------- 4. "Current game" against the lab being off ---------- */
  const same = await page.evaluate(() => {
    const gl = renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const grab = () => { camera.fov = Settings.fov; camera.updateProjectionMatrix(); renderFrame(0); renderer.setRenderTarget(null); const p = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, p); return p; };
    const diff = (a, b) => { let max = 0, sum = 0, n = 0; for (let i = 0; i < a.length; i += 4) for (let c = 0; c < 3; c++) { const d = Math.abs(a[i + c] - b[i + c]); max = Math.max(max, d); sum += d; if (d) n++; } return { max, mean: sum / (a.length / 4 * 3), changed: n }; };
    efcArtPreset('Current game');
    // The engine alternates part of its work between even and odd frames (consecutive renders of a still scene differ), so every
    // comparison pairs frames of the same parity: renders 1, 3, 5, 7 against each other, and 2, 4, 6, 8.
    EFC_ART.active = false; composer.removePass(EFC_ART.pass); // lab off: pass out of the chain, nothing synced
    const offA = grab(), offB = grab(), offA2 = grab(), offB2 = grab();
    EFC_ART.active = true; efcArtSync();
    const curA = grab(), curB = grab();
    EFC_ART.force = true; efcArtSync(); // the pass running with every dial neutral
    const forA = grab(), forB = grab(), forcedOn = EFC_ART.pass.enabled;
    EFC_ART.force = false; efcArtSync();
    const sum = Array.from(offA.subarray(0, 4000)).reduce((s, x) => s + x, 0);
    const worst = (a, b) => (a.max > b.max ? a : b);
    return { size: [w, h], drawn: sum > 0, consecutive: diff(offA, offB), determinism: worst(diff(offA, offA2), diff(offB, offB2)),
      currentVsOff: worst(diff(offA, curA), diff(offB, curB)), forcedVsOff: worst(diff(offA, forA), diff(offB, forB)), forcedOn, passIn: composer.passes.includes(EFC_ART.pass) };
  });
  console.log('     ' + JSON.stringify(same));
  assert.ok(same.drawn, 'the frame read back is not empty');
  assert.equal(same.determinism.max, 0, 'two renders of the same frame differ: the comparison would not mean anything');
  assert.equal(same.currentVsOff.max, 0, '"Current game" differs from the lab being off');
  assert.ok(same.forcedOn && same.passIn);
  assert.ok(same.forcedVsOff.max <= 2 && same.forcedVsOff.mean < 0.05, 'the pass with neutral dials is not an identity');
  ok('"Current game" is pixel-identical to the lab off; the pass forced on with neutral dials differs by at most 2/255');

  /* ---------- 5. Copy and paste round trip, storage ---------- */
  const trip = await page.evaluate(() => {
    efcArtPreset('PS1 dither (reference)');
    const want = JSON.stringify(EFC_ART.s), json = efcArtExport();
    efcArtPreset('Current game');
    const changed = JSON.stringify(EFC_ART.s) !== want;
    const bad = efcArtImport('{"not":"lab"}') || efcArtImport('nonsense');
    const imported = efcArtImport(json) && JSON.stringify(EFC_ART.s) === want;
    let stored = false; try { stored = JSON.stringify(JSON.parse(localStorage.getItem('efc_artlab_v1')).settings) === want; } catch (e) { /* asserted below */ }
    const clamp = efcArtImport('{"settings":{"levels":9999,"dither":"zigzag","tint":"blue"}}') && [EFC_ART.s.levels, EFC_ART.s.dither, EFC_ART.s.tint];
    efcArtImport(json);
    return { changed, bad, imported, stored, clamp, json };
  });
  assert.deepEqual({ ...trip, json: undefined }, { changed: true, bad: false, imported: true, stored: true, clamp: [256, 'off', '#1f2a55'], json: undefined });
  // through the panel buttons: Copy (the clipboard, or the fallback box when the clipboard is blocked), then Paste into the box and Import
  await page.keyboard.press('F2');
  await page.click('#efcArtCopy', { timeout: 120000 });
  await page.waitForFunction(() => /copied|Clipboard blocked/.test(document.querySelector('.efc-art-status').textContent), null, { timeout: 60000 });
  await page.evaluate(() => efcArtPreset('Current game'));
  await page.click('#efcArtPasteBtn', { timeout: 120000 });
  // the handler first tries the clipboard (asynchronous); wait for its outcome before using the box
  await page.waitForFunction(() => /Settings pasted|Paste the JSON into the box/.test(document.querySelector('.efc-art-status').textContent), null, { timeout: 60000 });
  const viaClipboard = await page.evaluate(() => /Settings pasted/.test(document.querySelector('.efc-art-status').textContent));
  if (!viaClipboard) {
    await page.fill('#efcArtPaste', trip.json);
    await page.getByRole('button', { name: 'Import' }).click({ timeout: 120000 });
  }
  const after = await page.evaluate(() => ({ s: EFC_ART.s, status: document.querySelector('.efc-art-status').textContent }));
  assert.deepEqual(after.s, JSON.parse(trip.json).settings, 'after paste: ' + after.status);
  ok(`settings round-trip through efcArtExport/efcArtImport, localStorage and the panel's Copy and Paste (${viaClipboard ? 'clipboard' : 'fallback box'}); bad JSON is refused, bad values clamped`);

  /* ---------- A/B split ---------- */
  const split = await page.evaluate(() => { efcArtPreset('Current game'); document.getElementById('efcArtSplit').click(); efcArtSync(); const r = [EFC_ART.pass.enabled, EFC_ART.pass.mat.uniforms.uSplit.value]; document.getElementById('efcArtSplit').click(); efcArtSync(); return r.concat(EFC_ART.pass.enabled); });
  assert.deepEqual(split, [true, 1, false]);
  ok('the A/B split turns the pass on with the split uniform, and off again');
  assert.deepEqual(errors, []);
  await page.close();

  /* ---------- 6. A normal raid never gets the lab ---------- */
  const normal = await open('');
  await normal.page.waitForFunction(() => typeof MATCH !== 'undefined' && MATCH.state === 'menu', null, { timeout: 300000, polling: 300 });
  const raid = await normal.page.evaluate(async () => {
    await mapEnsure('claudov'); LOCK.fallback = true; startMatch({});
    for (let k = 0; k < 60; k++) matchTick(1 / 30, false);
    renderFrame(0);
    return {
      mode: MATCH.mode, state: MATCH.state, labActive: EFC_ART.active, labPass: EFC_ART.pass, panel: !!document.getElementById('efcArtlab'),
      passes: composer.passes.map((p) => p.constructor.name), patched: EFC_ART_SNAP.n, nearest: EFC_ART_TEX.size,
      wardens: entities.filter((e) => e.alive && e.squad === 'w').length, fov: Settings.fov,
    };
  });
  assert.deepEqual({ ...raid, wardens: raid.wardens > 0 }, {
    mode: 'raid', state: 'playing', labActive: false, labPass: null, panel: false,
    passes: ['DepthPrepass', 'ScenePass', 'SSAOPass', 'RenderPass', 'UnrealBloomPass', 'RaysPass', 'ShaderPass'], patched: 0, nearest: 0, wardens: true, fov: 62,
  });
  assert.deepEqual(normal.errors, []);
  ok('a normal raid keeps the engine chain unchanged (no lab pass, no patched material, no texture touched, no panel) and has its Wardens');
} catch (e) {
  failed = true;
  console.error(e);
} finally {
  await browser.close();
}
if (failed) { console.log('ART LAB TEST FAILED'); process.exit(1); }
console.log('art lab: all checks passed');
