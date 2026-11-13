// Headless smoke test: boot the built game, start a solo match, run it, fail on any page error.
// node tools/dev/efc/smoke.mjs [game seconds=4] (software rendering is slow: the test waits on game time, not wall time) ; MAP=simoun MODE=raid SHOT=path.png
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const secs = +(process.argv[2] || 4);
const settings = { quality: 'low', sv: 7, dynres: false, eco: false, map: process.env.MAP || 'simoun', mode: process.env.MODE || 'tdm', difficulty: 1 };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ bypassCSP: true, viewport: { width: 960, height: 540 } });
await page.addInitScript(`try{localStorage.setItem('dc_settings', ${JSON.stringify(JSON.stringify(settings))})}catch(e){}; window.MATCH_COUNTDOWN = 0;`);
const errors = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|ERR_INTERNET|net::/.test(m.text())) errors.push('[console] ' + m.text()); });
await page.route('**/*', (r) => (/^file:/.test(r.request().url()) ? r.continue() : r.abort()));
await page.goto('file://' + path.join(REPO, 'dist/index.html'));
await page.waitForFunction(() => typeof MATCH !== 'undefined' && MATCH.state === 'menu', null, { timeout: 300000, polling: 500 });
await page.evaluate(() => mapEnsure(Settings.map));
await page.evaluate(() => { LOCK.fallback = true; startMatch({}); });
const t0 = Date.now();
await page.waitForFunction((s) => MATCH.time >= s || MATCH.state === 'ended', secs, { timeout: 400000, polling: 500 }).catch(() => errors.push('game time did not reach ' + secs + ' s'));
const wall = Math.round((Date.now() - t0) / 1000);
const r = await page.evaluate(() => ({ state: MATCH.state, mode: MATCH.mode, map: MAPL.id, time: Math.round(MATCH.time * 10) / 10, entities: entities.length, alive: entities.filter((e) => e.alive).length, efc: typeof EFC !== 'undefined' ? Object.keys(EFC) : null }));
if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
await browser.close();
console.log(JSON.stringify({ ...r, wall }));
if (errors.length) { console.error(errors.slice(0, 20).join('\n')); process.exit(1); }
if (r.time < secs && r.state !== 'ended') { console.error('match did not run'); process.exit(1); }
console.log('smoke ok');
