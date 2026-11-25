// Thumbnails test (P3, P3b): every item of item:all yields its row picture (weapons 256 x 96, other items 128 x 128), its slot picture
// (440 x 168) and its preview picture (840 x 320, rendered at that size), each 4 to 85 % opaque pixels, not one flat colour, not clipped,
// not too dark; guns are wider than tall; props are 50 to 300 triangles; the renderer settings are the same after rendering; row boxes
// have their P3b sizes; the preview shows name, weight, value and for weapons calibre, magazine and loaded rounds; no page error.
// Writes a contact sheet of every item, a sheet of the gun previews, and screenshots of the hideout and the loot panel.
// node tools/dev/efc/test-thumbs.mjs ; SHOTS=dir (default /tmp)
import fs from 'node:fs';
import { openGame } from './harness.mjs';
const SHOTS = process.env.SHOTS || '/tmp';
const fails = [];
const check = (ok, what, extra) => { console.log((ok ? 'ok   ' : 'FAIL ') + what + (extra !== undefined ? ' ' + JSON.stringify(extra) : '')); if (!ok) fails.push(what); };
const VARS = ['row', 'slot', 'big'];
const SIZE = { row: { weapon: [256, 96], other: [128, 128] }, slot: { weapon: [440, 168], other: [440, 168] }, big: { weapon: [840, 320], other: [840, 320] } };

const { browser, page, errors } = await openGame({ w: 1280, h: 720 });
try {
  // ---------- render every item in every size ----------
  const pre = await page.evaluate((VARS) => {
    const s = efcThumbRState(); window.T0 = { s, n: efcCall('item:all').length };
    window.T1 = []; efcOn('thumb:ready', (id, v) => T1.push(id + '|' + v));
    const first = [];
    for (const v of VARS) for (const d of efcCall('item:all')) first.push(efcCall('thumb:get', d.id, v));
    return { n: T0.n, nullFirst: first.every((u) => u === null), svc: efcHas('thumb:get') };
  }, VARS);
  check(pre.svc && pre.n >= 40, 'thumb:get provided, items in the catalogue', pre.n);
  check(pre.nullFirst, 'thumb:get is null before the picture is ready');
  const t0 = Date.now();
  await page.waitForFunction(() => !EFC_TH.busy && EFC_TH.queue.length === 0, null, { timeout: 900000, polling: 500 });
  console.log('rendered ' + pre.n * VARS.length + ' pictures in ' + Math.round((Date.now() - t0) / 1000) + ' s');
  const st = await page.evaluate(() => {
    const a = T0.s, b = efcThumbRState(), same = (k) => (a[k] && a[k].equals ? a[k].equals(b[k]) : a[k] === b[k]);
    return { diff: Object.keys(a).filter((k) => !same(k)), ready: T1.length, fail: Object.keys(EFC_TH.fail) };
  });
  check(st.diff.length === 0, 'renderer settings restored after rendering', st.diff);
  check(st.ready === pre.n * VARS.length && st.fail.length === 0, 'thumb:ready for every item and size', st);

  // ---------- picture checks ----------
  const pics = await page.evaluate(async (VARS) => {
    const out = [];
    for (const v of VARS) for (const d of efcCall('item:all')) {
      const url = efcCall('thumb:get', d.id, v);
      if (!url) { out.push({ id: d.id, v, url: false }); continue; }
      const im = new Image(); im.src = url; await im.decode();
      const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
      const cx = cv.getContext('2d'); cx.drawImage(im, 0, 0);
      const px = cx.getImageData(0, 0, cv.width, cv.height).data;
      let op = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, sum = 0, sum2 = 0;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] < 128) continue; // the gun rim glow is faint: count the object itself
        op++; const p = i / 4, x = p % cv.width, y = (p / cv.width) | 0;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        const l = 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]; sum += l; sum2 += l * l;
      }
      let edge = false; // anything visible on the outer pixel ring: clipped
      for (let x = 0; x < cv.width && !edge; x++) for (const y of [0, cv.height - 1]) if (px[(y * cv.width + x) * 4 + 3] > 40) edge = true;
      for (let y = 0; y < cv.height && !edge; y++) for (const x of [0, cv.width - 1]) if (px[(y * cv.width + x) * 4 + 3] > 40) edge = true;
      const mean = op ? sum / op : 0, sd = op ? Math.sqrt(Math.max(0, sum2 / op - mean * mean)) : 0;
      const tri = d.kind === 'weapon' || v !== 'row' ? null : efcThumbTris(efcThumbProp(d));
      out.push({ id: d.id, v, kind: d.kind, url: true, w: cv.width, h: cv.height, cover: op / (cv.width * cv.height), bw: x1 - x0 + 1, bh: y1 - y0 + 1, mean: Math.round(mean), sd: Math.round(sd), tri, edge });
    }
    return out;
  }, VARS);
  const bad = (f) => pics.filter(f).map((p) => p.id + '|' + p.v);
  // Thin Partisan parts (folded bipod, sling strap) cannot reach 4 % of a 440 x 168 frame without clipping: at least 1.5 % for them.
  const THIN = new Set(['part_p35123218a', 'part_pca7a0599d']);
  const coverOk = (p) => p.cover <= 0.85 && p.cover >= (THIN.has(p.id) ? 0.015 : 0.04);
  check(bad((p) => !p.url).length === 0, 'every item has a picture in every size', bad((p) => !p.url));
  check(bad((p) => { const s = SIZE[p.v][p.kind === 'weapon' ? 'weapon' : 'other']; return p.url && (p.w !== s[0] || p.h !== s[1]); }).length === 0, 'picture sizes (row 256x96 / 128x128, slot 440x168, preview 840x320)');
  check(bad((p) => !coverOk(p)).length === 0, '4 to 85 % opaque pixels (1.5 % for the two thin parts)', pics.filter((p) => !coverOk(p)).map((p) => [p.id, p.v, +p.cover.toFixed(3)]));
  check(bad((p) => p.sd < 6).length === 0, 'no picture is one flat colour', pics.filter((p) => p.sd < 6).map((p) => [p.id, p.v, p.sd]));
  check(bad((p) => p.kind === 'weapon' && !(p.bw > p.bh)).length === 0, 'guns are wider than tall', pics.filter((p) => p.kind === 'weapon' && !(p.bw > p.bh)).map((p) => [p.id, p.v, p.bw, p.bh]));
  check(bad((p) => p.edge).length === 0, 'nothing touches the picture edge (not clipped)', bad((p) => p.edge));
  // procedural props stay 50 to 300 triangles; imported Partisan parts (part_p…) are real models, at most 5,000
  const triOk = (p) => p.tri === null || (p.id.startsWith('part_p') ? p.tri <= 5000 : p.tri >= 50 && p.tri <= 300);
  check(bad((p) => !triOk(p)).length === 0, 'props are 50 to 300 triangles, Partisan parts at most 5,000', pics.filter((p) => !triOk(p)).map((p) => [p.id, p.tri]));
  check(bad((p) => p.mean < 45).length === 0, 'no picture too dark (mean luminance of the object >= 45)', pics.filter((p) => p.mean < 45).map((p) => [p.id, p.v, p.mean]));
  const gunMean = pics.filter((p) => p.kind === 'weapon' && p.v === 'row').map((p) => p.mean);
  check(Math.min(...gunMean) >= 70, 'guns lit bright (darkest gun mean luminance >= 70)', Math.min(...gunMean));
  console.log('stats ' + JSON.stringify(pics.filter((p) => p.v === 'row').map((p) => [p.id, +(p.cover || 0).toFixed(2), p.mean, p.tri])));

  // ---------- contact sheets ----------
  const sheets = await page.evaluate(async () => {
    const all = efcCall('item:all'), load = async (u) => { const im = new Image(); im.src = u; await im.decode(); return im; };
    const grid = async (list, C, cw, ch, iw, ih, v) => {
      const cv = document.createElement('canvas'); cv.width = C * cw; cv.height = Math.ceil(list.length / C) * ch;
      const x = cv.getContext('2d'); x.fillStyle = '#1b1e17'; x.fillRect(0, 0, cv.width, cv.height); x.font = '13px sans-serif'; x.textAlign = 'center';
      for (let i = 0; i < list.length; i++) {
        const d = list[i], px = (i % C) * cw, py = Math.floor(i / C) * ch, im = await load(efcCall('thumb:get', d.id, v));
        x.fillStyle = '#23271e'; x.fillRect(px + (cw - iw) / 2, py + 6, iw, ih);
        const s = Math.min(iw / im.width, ih / im.height), w = im.width * s, h = im.height * s; // at their display size
        x.drawImage(im, px + (cw - w) / 2, py + 6 + (ih - h) / 2, w, h);
        x.fillStyle = '#e8e2d0'; x.fillText(d.name, px + cw / 2, py + ih + 22);
      }
      return cv.toDataURL('image/png');
    };
    // rows at their display size (weapons 128 x 48, others 64 x 64) and doubled so the detail is visible: 256 x 96 / 128 x 128
    return { rows: await grid(all, 6, 272, 132, 256, 96 + 4, 'row'), big: await grid(all.filter((d) => d.kind === 'weapon'), 3, 440, 190, 420, 160, 'big') };
  });
  fs.writeFileSync(SHOTS + '/efc-thumbs-sheet.png', Buffer.from(sheets.rows.split(',')[1], 'base64'));
  fs.writeFileSync(SHOTS + '/efc-thumbs-guns-big.png', Buffer.from(sheets.big.split(',')[1], 'base64'));
  console.log('contact sheets: ' + SHOTS + '/efc-thumbs-sheet.png ' + SHOTS + '/efc-thumbs-guns-big.png');

  // ---------- hideout: row boxes, preview on hover ----------
  const ho = await page.evaluate(() => {
    const st = efcStash();
    for (const id of ['w_m82', 'armor_t3', 'pack_l', 'loot_sextant', 'loot_gauge', 'loot_keys', 'loot_chrono']) if (efcCall('item:def', id)) st.items.push(efcItemNorm({ id, n: 1 }));
    uiGo('hideout');
    const box = (sel) => { const e = document.querySelector('#scr-hideout ' + sel); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; };
    const rows = [...document.querySelectorAll('#scr-hideout .efc-it')], cells = [...document.querySelectorAll('#scr-hideout .efc-op-item')];
    // since A8 the lists sit under the operator grids: count the pictures inside list rows and inside grid items separately
    const imgs = rows.flatMap((r) => [...r.querySelectorAll('.efc-th img')]), cellImgs = cells.map((c) => c.querySelectorAll('.efc-th img').length);
    const fit = rows.every((r) => { const t = r.querySelector('.efc-th'); if (!t) return false; const a = r.getBoundingClientRect(), b = t.getBoundingClientRect(); return b.top >= a.top && b.bottom <= a.bottom + 0.5; });
    const line = rows.filter((r) => r.classList.contains('noslot')).every((r) => { const a = r.querySelector('.nm').getBoundingClientRect(), b = r.querySelector('.w').getBoundingClientRect(); return Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2) < 4; });
    const clipped = rows.filter((r) => !r.classList.contains('empty')).map((r) => r.querySelector('.nm')).filter((n) => !(n.scrollWidth <= n.clientWidth + 1 || n.clientWidth > 120)).map((n) => [n.textContent, n.clientWidth]), named = clipped.length === 0;
    return { imgs: imgs.length, rows: rows.length, cells: cells.length, cellsOk: cellImgs.every((n) => n === 1), fit, line, named, clipped, gun: box('#efcHoStash .efc-th.gun'), sq: box('#efcHoStash .efc-th.sq'), slot: box('#efcHoLoad .efc-th.slot'),
      pend: imgs.filter((i) => i.dataset.pend !== undefined).length };
  });
  check(ho.imgs > 0 && ho.imgs === ho.rows && ho.cells > 0 && ho.cellsOk, 'every hideout row and grid item has one thumbnail', ho);
  // the A8 operator layout (shell.html .efc-op-layout .efc-it) gives list thumbnails a 53 px column (72 px for slots), at most 46 px tall
  check(String(ho.gun) === '53,46' && String(ho.sq) === '53,46' && String(ho.slot) === '72,46', 'row boxes 53x46 (weapons and items), slots 72x46', ho);
  check(ho.fit, 'every thumbnail fits inside its row (row height raised)');
  check(ho.line && ho.named, 'item rows keep name, weight and value on one line, names readable', ho);
  check(ho.pend === 0, 'pictures already rendered show at once');
  const row = page.locator('#efcHoStash .efc-it[data-efc-id="w_m82"]');
  await row.hover();
  await page.waitForFunction(() => { const i = document.querySelector('#efcPrev img'); return i && i.dataset.pend === undefined && /webp|png/.test(i.src); }, null, { timeout: 60000 });
  const pv = await page.evaluate(() => {
    const el = $('efcPrev'), r = el.getBoundingClientRect(), im = el.querySelector('.efc-prev-im').getBoundingClientRect();
    return { show: el.classList.contains('show'), text: el.innerText.replace(/\s+/g, ' '), im: [Math.round(im.width), Math.round(im.height)], inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight,
      big: el.querySelector('img').src === efcCall('thumb:get', 'w_m82', 'big') };
  });
  check(pv.show && pv.big && String(pv.im) === '420,160' && pv.inside, 'hover shows the 420x160 preview with the preview-size picture', pv);
  check(/Barrett M82/.test(pv.text) && /Weight 12\.9 kg/.test(pv.text) && /Value/.test(pv.text) && /Calibre \.50 BMG/.test(pv.text) && /Magazine 10 rounds/.test(pv.text) && /Loaded 10/.test(pv.text),
    'preview: name, weight, value, calibre, magazine, loaded rounds', pv.text);
  await page.screenshot({ path: SHOTS + '/efc-thumbs-hideout.png', timeout: 300000 });
  console.log('hideout screenshot: ' + SHOTS + '/efc-thumbs-hideout.png');

  // ---------- loot panel (fake container in this page only) ----------
  const lo = await page.evaluate(() => {
    const c = { id: 9001, kind: 'crate', name: 'Customs crate', x: 0, z: 0, items: ['w_ak47', 'w_glock18', 'ammo_rifle', 'med_kit', 'loot_chrono', 'loot_coil', 'armor_t2'].map((id) => efcItemNorm({ id, n: id === 'ammo_rifle' ? 45 : 1 })) };
    efcProvide('world:list', () => [c]);
    EFC.inv = efcClone(efcStash().loadout);
    uiGo('main'); efcUirOpen('loot', 9001);
    const rows = [...document.querySelectorAll('#efcLoot .efc-it')];
    return { rows: rows.length, imgs: rows.filter((r) => r.querySelectorAll('.efc-th img').length === 1).length };
  });
  check(lo.rows > 0 && lo.rows === lo.imgs, 'loot panel rows have thumbnails', lo);
  await page.locator('#efcLootList .efc-it[data-efc-id="w_ak47"]').focus();
  await page.waitForFunction(() => { const i = document.querySelector('#efcPrev img'); return $('efcPrev').classList.contains('show') && i.dataset.efcThumb === 'w_ak47' && i.dataset.pend === undefined; }, null, { timeout: 60000 });
  await page.screenshot({ path: SHOTS + '/efc-thumbs-loot.png', timeout: 300000 });
  console.log('loot panel screenshot: ' + SHOTS + '/efc-thumbs-loot.png');
  const gone = await page.evaluate(() => { efcUirClose(true); return new Promise((r) => setTimeout(() => r($('efcPrev').classList.contains('show')), 50)); });
  check(!gone, 'the preview goes when the panel closes');
} finally {
  await browser.close();
}
check(errors.length === 0, 'no page error', errors.slice(0, 5));
if (fails.length) { console.error(fails.length + ' check(s) failed'); process.exit(1); }
console.log('thumbs ok');
