// P3 thumbnails test: every item of item:all yields a picture (4 to 85 % opaque pixels, not one flat colour), guns are wider than tall,
// props are 50 to 300 triangles, the renderer settings are the same after rendering, no page error. Writes a contact sheet of every item
// and one hideout screenshot. node tools/dev/efc/test-thumbs.mjs ; SHOTS=dir (default /tmp)
import fs from 'node:fs';
import { openGame } from './harness.mjs';
const SHOTS = process.env.SHOTS || '/tmp';
const fails = [];
const check = (ok, what, extra) => { console.log((ok ? 'ok   ' : 'FAIL ') + what + (extra !== undefined ? ' ' + JSON.stringify(extra) : '')); if (!ok) fails.push(what); };

const { browser, page, errors } = await openGame({ w: 1280, h: 720 });
try {
  // ---------- render every item ----------
  const pre = await page.evaluate(() => {
    const s = efcThumbRState(); window.T0 = { s, n: efcCall('item:all').length };
    const first = efcCall('item:all').map((d) => efcCall('thumb:get', d.id));
    return { n: T0.n, nullFirst: first.every((u) => u === null), svc: efcHas('thumb:get') };
  });
  check(pre.svc && pre.n >= 40, 'thumb:get provided, items in the catalogue', pre.n);
  check(pre.nullFirst, 'thumb:get is null before the picture is ready');
  await page.evaluate(() => { window.T1 = []; efcOn('thumb:ready', (id) => T1.push(id)); });
  await page.waitForFunction(() => !EFC_TH.busy && EFC_TH.queue.length === 0, null, { timeout: 600000, polling: 500 });
  const st = await page.evaluate(() => {
    const a = T0.s, b = efcThumbRState(), same = (k) => (a[k] && a[k].equals ? a[k].equals(b[k]) : a[k] === b[k]);
    return { diff: Object.keys(a).filter((k) => !same(k)), ready: T1.length, fail: Object.keys(EFC_TH.fail) };
  });
  check(st.diff.length === 0, 'renderer settings restored after rendering', st.diff);
  check(st.ready === pre.n && st.fail.length === 0, 'thumb:ready for every item', st);

  // ---------- picture checks ----------
  const pics = await page.evaluate(async () => {
    const out = [];
    for (const d of efcCall('item:all')) {
      const url = efcCall('thumb:get', d.id);
      if (!url) { out.push({ id: d.id, url: false }); continue; }
      const im = new Image(); im.src = url; await im.decode();
      const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
      const cx = cv.getContext('2d'); cx.drawImage(im, 0, 0);
      const px = cx.getImageData(0, 0, cv.width, cv.height).data;
      let op = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, sum = 0, sum2 = 0, lumOp = 0;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] < 24) continue;
        op++; const p = i / 4, x = p % cv.width, y = (p / cv.width) | 0;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        const l = 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]; sum += l; sum2 += l * l;
      }
      const mean = op ? sum / op : 0, sd = op ? Math.sqrt(Math.max(0, sum2 / op - mean * mean)) : 0;
      const tri = d.kind === 'weapon' ? null : efcThumbTris(efcThumbProp(d));
      out.push({ id: d.id, kind: d.kind, url: true, w: cv.width, h: cv.height, cover: op / (cv.width * cv.height), bw: x1 - x0 + 1, bh: y1 - y0 + 1, mean: Math.round(mean), sd: Math.round(sd), tri,
        edge: x0 <= 0 || y0 <= 0 || x1 >= cv.width - 1 || y1 >= cv.height - 1 });
    }
    return out;
  });
  const bad = (f) => pics.filter(f).map((p) => p.id);
  check(bad((p) => !p.url).length === 0, 'every item has a picture', bad((p) => !p.url));
  check(bad((p) => p.url && (p.w !== 256 || p.h !== 96)).length === 0, 'pictures are 256 x 96');
  check(bad((p) => !(p.cover >= 0.04 && p.cover <= 0.85)).length === 0, '4 to 85 % opaque pixels', pics.filter((p) => !(p.cover >= 0.04 && p.cover <= 0.85)).map((p) => [p.id, +p.cover.toFixed(3)]));
  check(bad((p) => p.sd < 6).length === 0, 'no picture is one flat colour', pics.filter((p) => p.sd < 6).map((p) => [p.id, p.sd]));
  check(bad((p) => p.kind === 'weapon' && !(p.bw > p.bh * 1.5)).length === 0, 'guns are wider than tall', pics.filter((p) => p.kind === 'weapon').map((p) => [p.id, p.bw, p.bh]).filter((x) => !(x[1] > x[2] * 1.5)));
  check(bad((p) => p.edge).length === 0, 'nothing touches the picture edge (not clipped)', bad((p) => p.edge));
  check(bad((p) => p.tri !== null && !(p.tri >= 50 && p.tri <= 300)).length === 0, 'props are 50 to 300 triangles', pics.filter((p) => p.tri !== null && !(p.tri >= 50 && p.tri <= 300)).map((p) => [p.id, p.tri]));
  check(bad((p) => p.mean < 45).length === 0, 'no picture too dark (mean luminance of the object >= 45)', pics.filter((p) => p.mean < 45).map((p) => [p.id, p.mean]));
  console.log('stats ' + JSON.stringify(pics.map((p) => [p.id, +(p.cover || 0).toFixed(2), p.mean, p.tri])));

  // ---------- contact sheet ----------
  const sheet = await page.evaluate(async () => {
    const all = efcCall('item:all'), C = 6, cw = 272, ch = 126, cv = document.createElement('canvas');
    cv.width = C * cw; cv.height = Math.ceil(all.length / C) * ch;
    const x = cv.getContext('2d'); x.fillStyle = '#20231b'; x.fillRect(0, 0, cv.width, cv.height);
    x.font = '13px sans-serif'; x.textAlign = 'center';
    for (let i = 0; i < all.length; i++) {
      const d = all[i], px = (i % C) * cw, py = Math.floor(i / C) * ch;
      x.fillStyle = '#2b2f25'; x.fillRect(px + 8, py + 6, 256, 96);
      const im = new Image(); im.src = efcCall('thumb:get', d.id) || efcThumbSil(d.kind); await im.decode(); x.drawImage(im, px + 8, py + 6);
      x.fillStyle = '#e8e2d0'; x.fillText(d.name, px + cw / 2, py + 118);
    }
    return cv.toDataURL('image/png');
  });
  fs.writeFileSync(SHOTS + '/efc-thumbs-sheet.png', Buffer.from(sheet.split(',')[1], 'base64'));
  console.log('contact sheet: ' + SHOTS + '/efc-thumbs-sheet.png');

  // ---------- hideout with thumbnails (rows keep their size when pictures arrive) ----------
  const ho = await page.evaluate(() => {
    const st = efcCall('stash:get');
    for (const id of ['w_ak', 'w_m4', 'w_glock', 'ammo_rifle', 'ammo_pistol', 'armor_t2', 'pack_m', 'med_kit', 'med_bandage', 'loot_sextant', 'loot_gauge', 'loot_keys']) if (efcCall('item:def', id)) st.items.push(efcItemNorm({ id, n: 1 }));
    uiGo('hideout');
    const imgs = [...document.querySelectorAll('#scr-hideout .efc-th img')], rows = [...document.querySelectorAll('#scr-hideout .efc-it')];
    const h0 = rows.map((r) => r.getBoundingClientRect().height);
    return { imgs: imgs.length, rows: rows.length, ready: imgs.filter((i) => !i.dataset.pend).length, h0 };
  });
  check(ho.imgs > 0 && ho.imgs === ho.rows, 'every hideout row has a thumbnail', ho);
  await page.waitForTimeout(800);
  await page.screenshot({ path: SHOTS + '/efc-thumbs-hideout.png', timeout: 300000 });
  console.log('hideout screenshot: ' + SHOTS + '/efc-thumbs-hideout.png');
} finally {
  await browser.close();
}
check(errors.length === 0, 'no page error', errors.slice(0, 5));
if (fails.length) { console.error(fails.length + ' check(s) failed'); process.exit(1); }
console.log('thumbs ok');
