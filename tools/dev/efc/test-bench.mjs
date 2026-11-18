// P4 bench menu test: the main menu boots on the workbench scene (src/efc/55-efc-bench*.js) with the AK on the table in view; every menu
// entry is reachable by keyboard and opens its screen; the bench pauses under sub-screens and resumes on return; a match leaves no bench
// object in the match scene and no bench render state; the lowest quality keeps the key art. Screenshots (SHOTS dir, default /tmp):
// efc-bench-1280.png, efc-bench-1920.png, efc-bench-sub.png, efc-bench-reduced.png. node tools/dev/efc/test-bench.mjs [noshots]
import { openGame, startSolo, simRun } from './harness.mjs';
const SHOTS = process.env.SHOTS || '/tmp', shots = process.argv[2] !== 'noshots';
const fails = [], report = {};
const check = (ok, what, extra) => { console.log((ok ? 'ok   ' : 'FAIL ') + what + (extra !== undefined ? ' ' + JSON.stringify(extra) : '')); if (!ok) fails.push(what); };
const benchT = (page) => page.evaluate(() => EFC_BENCH.t);
const waitFrames = (page, n = 3) => page.evaluate((n) => new Promise((ok) => { let i = 0; const f = () => (++i >= n ? ok() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);

const { browser, page, errors } = await openGame({ w: 1280, h: 720, noMap: true });
try {
  // ---------- boot: the bench is the menu background, the AK is on the table and in the camera's view ----------
  await page.waitForFunction(() => EFC_BENCH.firstAt !== null, null, { timeout: 120000, polling: 200 });
  await waitFrames(page, 4);
  const boot = await page.evaluate(() => {
    const B = EFC_BENCH, rifle = B.rifle, box = new THREE.Box3().setFromObject(rifle);
    B.cam.updateMatrixWorld(true);
    const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(B.cam.projectionMatrix, B.cam.matrixWorldInverse));
    let meshes = 0, tris = 0; rifle.traverse((o) => { if (o.isMesh) { meshes++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });
    const c = box.getCenter(new THREE.Vector3());
    return {
      screen: UI.screen, on: B.on, live: MBG.live, keyArt: !!MBG.mat, inScene: rifle.parent === B.scene, meshes, rifleTris: tris,
      len: +(box.max.x - box.min.x).toFixed(3), onTable: Math.abs(box.min.y - EFC_BENCH_TABLE.top) < 0.002,
      inside: fr.containsPoint(c) && fr.intersectsBox(box),
      corners: (() => { let n = 0, out = 0; const v = new THREE.Vector3(); rifle.traverse((o) => { if (!o.isMesh) return; const P = o.geometry.attributes.position; for (let i = 0; i < P.count; i += 7) { v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld).project(B.cam); n++; if (Math.abs(v.x) > 1 || Math.abs(v.y) > 1) out++; } }); return out === 0 && n > 0; })(),
      stats: B.stats, frameMs: B.frameMs, buildMs: B.buildMs, firstAt: B.firstAt, bg: $('menuBg').className,
    };
  });
  report.boot = boot;
  check(boot.screen === 'main' && boot.on && boot.live && !boot.keyArt, 'boots to the main menu with the bench drawn (key art not loaded)', boot);
  check(boot.inScene && boot.meshes > 0 && boot.len > 0.8 && boot.len < 1 && boot.onTable, 'the AK-47 lies on the table', boot);
  check(boot.inside && boot.corners, 'the AK is inside the camera frustum (every sampled vertex on screen)', boot);
  const t0 = await benchT(page); await waitFrames(page, 4); const t1 = await benchT(page);
  check(t1 > t0, 'idle motion runs on the main menu', [t0, t1]);
  if (shots) await page.screenshot({ path: SHOTS + '/efc-bench-1280.png', timeout: 300000 });

  // The DOM hit target tracks the radio and uses the same button for click and Enter.
  const radio = page.locator('#efcBenchRadio');
  const radioBefore = await page.evaluate(() => efcCall('music:nowPlaying'));
  // The swaying camera moves this hit target between frames. Click where the radio is now.
  const hit = await radio.boundingBox();
  if (!hit) throw new Error('The radio has no visible hit target');
  await page.mouse.click(hit.x + hit.width / 2, hit.y + hit.height / 2);
  await page.waitForFunction(() => EFC_BENCH.dial.material.emissiveIntensity === 0, null, { timeout: 120000 });
  const radioAfter = await page.evaluate(() => efcCall('music:nowPlaying'));
  check(radioBefore.on && !radioAfter.on, 'clicking the radio turns the theme and dial off');
  await radio.focus();
  check(await radio.locator('span').isVisible() && (await radio.locator('span').textContent()).includes(radioBefore.author), 'the focused radio shows the track and artist');
  await radio.press('Enter');
  await page.waitForFunction(() => EFC_BENCH.dial.material.emissiveIntensity > 0, null, { timeout: 120000 });
  check(await page.evaluate(() => efcCall('music:nowPlaying').on), 'Enter turns the radio back on');

  // ---------- keyboard: every entry reachable with Tab and opened with Enter; Escape comes back ----------
  const entries = [['efcMmRaid', 'raid'], ['efcMmSquad', 'multi'], ['efcMmHideout', 'hideout'], ['efcMmSettings', 'options'], ['efcCreditsBtn', 'credits']];
  for (const [id, screen] of entries) {
    await page.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); });
    let found = false, steps = 0;
    for (; steps < 25 && !found; steps++) { await page.keyboard.press('Tab'); found = await page.evaluate((id) => document.activeElement && document.activeElement.id === id, id); }
    const focus = await page.evaluate(() => { const a = document.activeElement, s = getComputedStyle(a); return { bg: s.backgroundImage !== 'none' || s.outlineStyle !== 'none' || s.textDecorationLine !== 'none' || s.color !== 'rgb(242, 238, 227)' }; });
    await page.keyboard.press('Enter'); await waitFrames(page, 2);
    const at = await page.evaluate(() => UI.screen);
    const tA = await benchT(page); await waitFrames(page, 4); const tB = await benchT(page);
    if (id === 'efcMmHideout' && shots) await page.screenshot({ path: SHOTS + '/efc-bench-sub.png', timeout: 300000 });
    await page.keyboard.press('Escape'); await waitFrames(page, 2);
    const back = await page.evaluate(() => UI.screen);
    const tC = await benchT(page); await waitFrames(page, 4); const tD = await benchT(page);
    check(found && at === screen && back === 'main', `${id}: Tab reaches it (${steps} presses), Enter opens ${screen}, Escape returns`, { found, at, back, focus });
    check(tA === tB && tD > tC, `${id}: bench paused under ${screen}, resumes on return`, [tA, tB, tC, tD]);
  }
  // Fullscreen, the fork link and the version: reachable, and Fullscreen calls the engine's toggle
  const misc = await page.evaluate(() => {
    let called = 0; const orig = document.documentElement.requestFullscreen; document.documentElement.requestFullscreen = () => { called++; return Promise.resolve(); };
    $('fsBtn').focus(); const fsFocus = document.activeElement === $('fsBtn'); $('fsBtn').click(); document.documentElement.requestFullscreen = orig;
    const fork = document.querySelector('#scr-main .efc-fork'); fork.focus();
    const vis = (e) => !!e && e.getClientRects().length > 0;
    return { fsFocus, called, fork: document.activeElement === fork && /Riposte-Frontline-Source/.test(fork.href) && fork.target === '_blank', ver: vis($('verTag')) && $('verTag').textContent.trim().length > 0 };
  });
  check(misc.fsFocus && misc.called === 1 && misc.fork && misc.ver, 'Fullscreen, the fork link and the version are on the menu and operable', misc);
  const tabs = await page.evaluate(() => { document.activeElement.blur(); return null; });
  let seen = [];
  for (let i = 0; i < 25; i++) { await page.keyboard.press('Tab'); const id = await page.evaluate(() => (document.activeElement.id || document.activeElement.className)); if (seen.includes(id)) break; seen.push(id); }
  check(['efc-fork', 'efcMmRaid', 'efcMmSquad', 'efcMmHideout', 'efcMmSettings', 'fsBtn', 'efcCreditsBtn'].every((x) => seen.includes(x)), 'Tab order covers the fork link, the four entries, Fullscreen and Credits', seen);

  // ---------- a match: no bench object in the match scene, no bench render state, shadow map released; back to the menu ----------
  await page.evaluate(() => mapEnsure(Settings.map));
  await startSolo(page);
  await simRun(page, 2, 'PL.ent.health = 100;');
  await page.waitForTimeout(1500); await waitFrames(page, 3);
  const inMatch = await page.evaluate(() => {
    let bench = 0; scene.traverse((o) => { if (o.userData && o.userData.efcBench) bench++; });
    const r = renderer;
    return { state: MATCH.state, bench, benchParent: !!(EFC_BENCH.rifle && EFC_BENCH.rifle.parent === EFC_BENCH.scene), tm: r.toneMapping === THREE.NoToneMapping, enc: r.outputEncoding === THREE.LinearEncoding, pcl: r.physicallyCorrectLights === false, shadowMap: !!EFC_BENCH.lamp.shadow.map };
  });
  check(inMatch.state === 'playing' && inMatch.bench === 0 && inMatch.benchParent, 'no bench object in the match scene', inMatch);
  check(inMatch.tm && inMatch.enc && inMatch.pcl && !inMatch.shadowMap, 'no bench render state during the match, lamp shadow map released', inMatch);
  await page.evaluate(() => toMenu());
  await page.waitForFunction(() => MATCH.state === 'menu' && UI.screen === 'main', null, { timeout: 60000, polling: 200 });
  const tE = await benchT(page); await waitFrames(page, 5); const tF = await benchT(page);
  const after = await page.evaluate(() => ({ tm: renderer.toneMapping === THREE.NoToneMapping, enc: renderer.outputEncoding === THREE.LinearEncoding, pcl: !renderer.physicallyCorrectLights, rt: renderer.getRenderTarget() === null }));
  check(tF > tE && after.tm && after.enc && after.pcl, 'back from the match the bench resumes and leaves the renderer as it found it', { tE, tF, after });

  // ---------- 1920 x 1080 and reduced motion ----------
  await page.setViewportSize({ width: 1920, height: 1080 }); await waitFrames(page, 6);
  report.at1920 = await page.evaluate(() => ({ stats: EFC_BENCH.stats, frameMs: EFC_BENCH.frameMs }));
  if (shots) await page.screenshot({ path: SHOTS + '/efc-bench-1920.png', timeout: 300000 });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: 'reduce' }); await waitFrames(page, 4);
  const r0 = await benchT(page); await waitFrames(page, 6); const r1 = await benchT(page);
  const still = await page.evaluate(() => ({ look: EFC_BENCH.look, drawn: EFC_BENCH.drawn }));
  check(r0 === r1 && still.look.x === 0 && still.drawn, 'reduced motion: one still frame, no idle motion', { r0, r1, still });
  if (shots) await page.screenshot({ path: SHOTS + '/efc-bench-reduced.png', timeout: 300000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
} catch (e) { fails.push('exception: ' + e.message); console.error(e); }
await browser.close();
if (errors.length) { console.error(errors.slice(0, 20).join('\n')); fails.push('page errors'); }

// ---------- lowest quality: the key art stays ----------
try {
  const low = await openGame({ w: 640, h: 360, noMap: true, settings: { quality: 'ultra' } });
  await low.page.waitForFunction(() => MBG.live || MBG.failed, null, { timeout: 120000, polling: 200 });
  const r = await low.page.evaluate(() => ({ bench: EFC_BENCH.on, keyArt: !!MBG.mat, live: MBG.live, bg: $('menuBg').className }));
  check(!r.bench && r.keyArt && !/bench/.test(r.bg), 'lowest quality keeps the key art', r);
  await low.browser.close();
  if (low.errors.length) { console.error(low.errors.slice(0, 10).join('\n')); fails.push('page errors (lowest quality)'); }
} catch (e) { fails.push('exception (lowest quality): ' + e.message); }

console.log('report ' + JSON.stringify(report));
console.log(fails.length ? `test-bench: ${fails.length} failure(s)` : 'test-bench ok');
process.exit(fails.length ? 1 : 0);
