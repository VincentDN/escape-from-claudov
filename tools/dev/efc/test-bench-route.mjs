import assert from 'node:assert/strict';
import { launchEfcBrowser } from './harness.mjs';

const browser = await launchEfcBrowser();
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 }, acceptDownloads: true });
  page.on('pageerror', error => errors.push(error.message));
  const base = process.env.EFC_TEST_URL;
  assert.ok(base, 'Serve dist over HTTP and set EFC_TEST_URL');
  await page.goto(base + '#bench');
  await page.getByRole('button', { name: 'Run all qualities' }).waitFor({ timeout: 120000 });
  await page.evaluate(() => {
    sessionStorage.setItem('efc_bench_route', JSON.stringify({ levels: ['low'], rows: [] }));
    location.reload();
  });
  await page.waitForFunction(() => typeof EFC_BENCH_CAPTURE !== 'undefined' && EFC_BENCH_CAPTURE.start !== null && PFR.n >= 2, null, { timeout: 180000 });
  const points = await page.evaluate(() => ({
    start: efcBenchmarkPoint(0), end: efcBenchmarkPoint(1),
    wardens: EFC_BENCH_CAPTURE.wardens.length, scavengers: entities.filter(e => e.alive && e.squad === 's').length, map: MAPL.id,
  }));
  // Claudov's hostile budget is efcWardenNumber = 7; since A3 two of those slots are Scavengers, so the route alerts 5 Wardens
  assert.deepEqual(points, { start: [-51, 26], end: [69, 41], wardens: 5, scavengers: 2, map: 'claudov' });
  await page.evaluate(() => { EFC_BENCH_CAPTURE.start = performance.now() - 90001; });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON report' }).click({ timeout: 90000 });
  const stream = await (await download).createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const { rows } = JSON.parse(Buffer.concat(chunks).toString());
  assert.equal(rows.length, 1);
  const report = rows[0];
  assert.equal(report.seconds, 90);
  assert.equal(report.quality, 'low');
  assert.ok(report.frameMedianMs > 0 && report.frameP99Ms >= report.frameMedianMs && report.low1Fps > 0);
  assert.deepEqual(Object.keys(report.cpuStageMs), ['player', 'bots', 'props', 'logic', 'prep', 'shadow', 'render']);
  assert.deepEqual(Object.keys(report.cpuStageMs), Object.keys(report.gpuStageMs));
  assert.ok(report.drawCalls > 0 && report.triangles > 0 && report.cpuMs > 0);
  assert.ok(Object.hasOwn(report, 'heapStartBytes') && Object.hasOwn(report, 'heapEndBytes'));
  assert.deepEqual(errors, []);
  console.log('benchmark route initialized, completed, and downloaded a report');
} finally {
  await browser.close();
}
