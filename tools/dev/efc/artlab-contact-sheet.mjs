// L0 art style lab contact sheet: the owner's reference next to every preset from one fixed view of Claudov, the A/B split, high FOV with
// fisheye, and a 2x detail of the PS1 preset. Writes docs/artlab/contact-sheet.png. Run after python3 build.py (about 5 minutes here).
// Each tile is one synchronous render read straight from the canvas, so no animation frame or HUD gets into it.
import fs from 'node:fs';
import path from 'node:path';
import { launchEfcBrowser, REPO } from './harness.mjs';

const GAME = process.env.EFC_TEST_URL || 'file://' + path.join(REPO, 'dist/index.html');
const W = 640, H = 400, VIEW = [29, 45, -1.2, 0.02]; // x, z, yaw, pitch: the boxcar, brick buildings and rails north-east of the yard
const OUT = path.join(REPO, 'docs/artlab/contact-sheet.png');
const browser = await launchEfcBrowser();
try {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(`try{localStorage.setItem('dc_settings', JSON.stringify({quality:'medium',sv:9,dynres:false,eco:false,mode:'raid'}));localStorage.removeItem('efc_artlab_v1')}catch(e){}; window.EFC_TEST = true; window.MATCH_COUNTDOWN = 0;`);
  await page.goto(GAME + '#artlab');
  await page.waitForFunction(() => typeof EFC_ART !== 'undefined' && EFC_ART.active && EFC_ART.frames > 1, null, { timeout: 400000, polling: 500 });
  const shot = (preset, split = false) => page.evaluate(([[x, z, yaw, pitch], preset, split]) => {
    efcArtPreset(preset); EFC_ART.split = split;
    const e = PL.ent; e.pos.set(x, gy0(x, z), z); e.vel.set(0, 0, 0); PL.yaw = yaw; PL.pitch = pitch;
    for (let k = 0; k < 20; k++) matchTick(1 / 30, false);
    efcArtSync(); efcArtSync(); // the second call picks up the texture scan the first one scheduled
    camera.fov = Settings.fov; camera.updateProjectionMatrix();
    renderFrame(0); renderFrame(0); // same parity as the engine's alternating frames every time
    const url = renderer.domElement.toDataURL('image/png');
    EFC_ART.split = false;
    return url;
  }, [VIEW, preset, split]);
  const tiles = [['Owner reference (PS1 retro with dither)', 'data:image/webp;base64,' + fs.readFileSync(path.join(REPO, 'docs/artlab/reference-ps1-dither.webp')).toString('base64')]];
  for (const p of ['Current game', 'PS1 dither (reference)', 'PSX heavy low-res', 'Modern retro (subtle)', 'Newsprint halftone']) {
    tiles.push([p === 'Modern retro (subtle)' ? p + ': viewmodel kept clean' : p, await shot(p)]);
    console.log('captured', p);
  }
  tiles.push(['A/B split: current game | PS1 dither', await shot('PS1 dither (reference)', true)]);
  tiles.push(['Wide lens test: FOV 120, fisheye 0.55, lens dirt', await shot('Wide lens test (120 degrees)')]);
  tiles.push(['PS1 dither (reference), 2x detail of the rifle', tiles[2][1], [300, 200, 320, 200]]);
  const png = await page.evaluate(async ([tiles, W, H]) => {
    const L = 26, cv = document.createElement('canvas'); cv.width = W * 3; cv.height = (H + L) * 3;
    const g = cv.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, cv.width, cv.height);
    for (const [i, [label, url, crop]] of tiles.entries()) {
      const im = new Image(); im.src = url; await im.decode();
      const x = (i % 3) * W, y = Math.floor(i / 3) * (H + L);
      g.imageSmoothingEnabled = !crop;
      if (crop) g.drawImage(im, crop[0], crop[1], crop[2], crop[3], x, y + L, W, H);
      else { const s = Math.min(W / im.width, H / im.height), w = im.width * s, h = im.height * s; g.drawImage(im, x + (W - w) / 2, y + L + (H - h) / 2, w, h); }
      g.fillStyle = '#e5e9e8'; g.font = '15px system-ui, sans-serif'; g.fillText((i + 1) + '. ' + label, x + 8, y + 18);
    }
    return cv.toDataURL('image/png');
  }, [tiles, W, H]);
  fs.writeFileSync(OUT, Buffer.from(png.split(',')[1], 'base64'));
  if (errors.length) console.log('page errors:', errors);
  console.log('wrote', path.relative(REPO, OUT));
} finally {
  await browser.close();
}
