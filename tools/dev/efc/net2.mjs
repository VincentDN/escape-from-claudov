// Two-client network rig: the built game (dist/) served over local HTTP, a host page and a guest page in one browser context, talking
// through tools/dev/efc/fakepeer.js (a BroadcastChannel stand-in for PeerJS, injected before the game's scripts; the real PeerJS CDN
// script and every other outside request are blocked). The helpers drive the functions the menus call: netHost, netJoinLobby, netLaunch,
// the loading phase (menuLaunch) and menuDeploy. Game logic is stepped with matchTick; rendering is halted (GPUX.halt).
//   import { openPair, createLobby, joinLobby, launch, waitInMatch, stepBoth } from './net2.mjs'
//   const rig = await openPair({ map: 'simoun' });            // rig.host, rig.guest: Playwright pages at the main menu, map built
//   const code = await createLobby(rig.host, { mode: 'raid', map: 'simoun' });
//   await joinLobby(rig.guest, code); await launch(rig.host);
//   await Promise.all([waitInMatch(rig.host), waitInMatch(rig.guest)]);
//   await stepBoth([rig.host, rig.guest], 2);                 // 2 game seconds on each page, in 0.2 s slices
//   ... rig.errors (page errors, both pages) ... await rig.close();
import { createRequire } from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { REPO } from './harness.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const DIST = path.join(REPO, 'dist');
const FAKEPEER = fs.readFileSync(path.join(REPO, 'tools/dev/efc/fakepeer.js'), 'utf8');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wasm': 'application/wasm', '.bin': 'application/octet-stream', '.glb': 'model/gltf-binary', '.webmanifest': 'application/manifest+json' };

/* Tiny static server on dist/ (127.0.0.1, random port). Returns { port, base, close }. */
export function startServer() {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.normalize(path.join(DIST, p));
      if (!f.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
      fs.readFile(f, (err, buf) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'content-type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
        res.end(buf);
      });
    });
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => { const port = srv.address().port; resolve({ port, base: `http://127.0.0.1:${port}/`, close: () => new Promise((r) => srv.close(r)) }); });
  });
}

/* Opens one game page in `context` at the main menu with the map built; o.settings merges into the saved settings, o.name: lobby nickname,
   o.init: extra script run before the game. Page errors are pushed to `errors` with the page name. */
export async function openNetPage(context, base, o, errors) {
  const name = o.name || 'Page';
  const settings = Object.assign({ quality: 'low', sv: 7, dynres: false, eco: false, map: 'simoun', mode: 'tdm', difficulty: 1 }, o.settings || {});
  const page = await context.newPage();
  page.efcName = name;
  page.on('pageerror', (e) => errors.push(`[${name} pageerror] ` + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|ERR_INTERNET|net::|Failed to load resource/.test(m.text())) errors.push(`[${name} console] ` + m.text()); });
  await page.route('**/*', (r) => (r.request().url().startsWith(base) ? r.continue() : r.abort()));
  await page.addInitScript(`try{if(!localStorage.getItem('dc_settings'))localStorage.setItem('dc_settings', ${JSON.stringify(JSON.stringify(settings))})}catch(e){};
    window.MATCH_COUNTDOWN = 0; window.EFC_TEST = true; window.NET_RELAY_URL = ''; window.EFC_NET_NAME = ${JSON.stringify(name)};`);
  await page.addInitScript(FAKEPEER);
  if (o.init) await page.addInitScript(o.init);
  await page.goto(base + 'index.html');
  await page.waitForFunction(() => typeof MATCH !== 'undefined' && MATCH.state === 'menu', null, { timeout: 300000, polling: 300 });
  await page.evaluate(() => mapEnsure(Settings.map));
  await page.evaluate(() => {
    GPUX.halt = true; // no rendering: the main loop returns at once (timers, menus and the network keep running)
    if (!HOSTBG.wk) HOSTBG.wk = { test: true }; // no background-tab ticker: the test alone steps the game
    if (typeof acctOnlineOk === 'function' && !acctOnlineOk()) { ACCT.state = 'off'; ACCT.user = null; } // offline account: online play allowed
    $('netName').value = window.EFC_NET_NAME; netNick();
  });
  return page;
}

/* Starts the server, a browser and two pages (host, guest). o: { map, settings, browser, init }. Returns { browser, host, guest, errors, base, close }. */
export async function openPair(o = {}) {
  const server = await startServer();
  const browser = o.browser || await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const context = await browser.newContext({ bypassCSP: true, viewport: { width: o.w || 480, height: o.h || 270 } });
  const errors = [], settings = Object.assign({ map: o.map || 'simoun' }, o.settings || {});
  const host = await openNetPage(context, server.base, { name: 'Host', settings, init: o.init }, errors);
  const guest = await openNetPage(context, server.base, { name: 'Guest', settings, init: o.init }, errors);
  return { browser, context, host, guest, errors, base: server.base, close: async () => { if (!o.browser) await browser.close(); else await context.close(); await server.close(); } };
}

async function until(page, fn, arg, timeout = 30000, what = 'condition') {
  try { await page.waitForFunction(fn, arg, { timeout, polling: 100 }); }
  catch (e) { throw new Error(`${page.efcName || 'page'}: timed out waiting for ${what}`); }
}

/* Host: opens a lobby (netHost, as "Create a lobby" does) and sets its mode and map as the lobby menus do. Returns the lobby code. */
export async function createLobby(hostPage, o = {}) {
  await hostPage.evaluate(() => netHost({}));
  await until(hostPage, () => NET.role === 'host' && NET.joined, null, 30000, 'the lobby to open');
  return hostPage.evaluate(({ mode, map }) => {
    if (map && map !== NET.cfg.map) { NET.cfg = netCfg(Object.assign({}, NET.cfg, { map })); for (const q of NET.players.values()) q.ld = 0; netLobbyChanged(); }
    if (mode && mode !== NET.cfg.mode) netSetupSet('mode', mode);
    return NET.code;
  }, { mode: o.mode, map: o.map });
}
/* Guest: joins a lobby by its code (netJoinLobby) and waits to be listed. */
export async function joinLobby(guestPage, code) {
  await guestPage.evaluate((c) => netJoinLobby(c), code);
  await until(guestPage, () => NET.role === 'client' && NET.joined && NET.players.has(NET.me), null, 30000, 'the lobby to accept the guest');
}
/* Host: launches the match (netLaunch, the "Start match" button). */
export async function launch(hostPage) { await hostPage.evaluate(() => netLaunch()); }
/* Waits through the loading phase and the class screen (menuDeploy, as the deploy button does) until the match is playing online. */
export async function waitInMatch(page, timeout = 300000) {
  const t0 = Date.now();
  for (;;) {
    const st = await page.evaluate(() => {
      if (MATCH.state === 'menu' && UI.screen === 'deploy' && UI.flow && !UI.busy) { LOCK.fallback = true; menuDeploy(); }
      return { state: MATCH.state, on: NET.on, phase: NET.phase, screen: UI.screen };
    });
    if (st.state === 'playing' && st.on) return st;
    if (Date.now() - t0 > timeout) throw new Error(`${page.efcName || 'page'}: not in the match after ${timeout / 1000} s (${JSON.stringify(st)})`);
    await new Promise((r) => setTimeout(r, 250));
  }
}
/* Steps `seconds` of game logic on every page, alternating 0.2 s slices of matchTick (30 Hz) and yielding between slices so that
   messages are delivered. `each`: optional function body run on every page after every tick (e.g. 'PL.ent.health = 100;'). */
export async function stepBoth(pages, seconds, each) {
  const slices = Math.max(1, Math.round(seconds / 0.2));
  for (let i = 0; i < slices; i++) {
    for (const p of pages) {
      await p.evaluate((each) => {
        const fn = each ? new Function(each) : null;
        for (let n = 0; n < 6; n++) {
          if (MATCH.state !== 'playing' && MATCH.state !== 'paused' && MATCH.state !== 'finish') break;
          matchTick(1 / 30, false); if (fn) fn();
        }
      }, each || '');
    }
    await new Promise((r) => setTimeout(r, 15));
  }
}
/* Waits real time (ms) so that pending messages are delivered without stepping the game. */
export function settle(ms = 300) { return new Promise((r) => setTimeout(r, ms)); }
