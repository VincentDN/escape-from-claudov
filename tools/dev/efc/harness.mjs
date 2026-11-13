// Shared test harness: opens the built game headless and steps the game logic without rendering.
// import { openGame, simRun } from './harness.mjs'
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
/* o.settings: merged into the saved settings (map, mode, difficulty...). o.w, o.h: viewport. o.init: script run before the page.
   Returns { browser, page, errors }. The page is at the main menu with the map built. */
export async function openGame(o = {}) {
  const settings = Object.assign({ quality: 'low', sv: 7, dynres: false, eco: false, map: 'simoun', mode: 'tdm', difficulty: 1 }, o.settings || {});
  const browser = o.browser || await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ bypassCSP: true, viewport: { width: o.w || 480, height: o.h || 270 } });
  await page.addInitScript(`try{if(!localStorage.getItem('dc_settings'))localStorage.setItem('dc_settings', ${JSON.stringify(JSON.stringify(settings))})}catch(e){}; window.MATCH_COUNTDOWN = 0; window.EFC_TEST = true;`);
  if (o.init) await page.addInitScript(o.init);
  const errors = [];
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|ERR_INTERNET|net::|Failed to load resource/.test(m.text())) errors.push('[console] ' + m.text()); });
  await page.route('**/*', (r) => (/^file:/.test(r.request().url()) ? r.continue() : r.abort()));
  await page.goto('file://' + path.join(REPO, 'dist/index.html'));
  await page.waitForFunction(() => typeof MATCH !== 'undefined' && MATCH.state === 'menu', null, { timeout: 300000, polling: 300 });
  if (!o.noMap) await page.evaluate(() => mapEnsure(Settings.map));
  return { browser, page, errors };
}
/* Starts a solo match (no pointer lock needed). */
export async function startSolo(page) { await page.evaluate(() => { LOCK.fallback = true; startMatch({}); }); }
/* Steps the game logic for `seconds` of game time at 30 Hz with no rendering. Returns the game seconds actually run
   (it stops early when the match leaves the playing state). `each` is an optional function body string run every step. */
export async function simRun(page, seconds, each) {
  return page.evaluate(([seconds, each]) => {
    const fn = each ? new Function(each) : null, dt = 1 / 30; let n = 0;
    for (; n < seconds * 30 && MATCH.state === 'playing'; n++) { matchTick(dt, false); if (fn) fn(); }
    return n / 30;
  }, [seconds, each || '']);
}
