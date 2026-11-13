// Headless smoke test: boot the built game, start a solo match, step 30 game seconds of logic, render one real frame, fail on any page error.
// node tools/dev/efc/smoke.mjs [seconds=30] ; MAP=simoun MODE=raid SHOT=path.png
import { openGame, startSolo, simRun } from './harness.mjs';
const secs = +(process.argv[2] || 30);
const { browser, page, errors } = await openGame({ settings: { map: process.env.MAP || 'simoun', mode: process.env.MODE || 'tdm' }, w: 960, h: 540 });
await startSolo(page);
const t0 = Date.now(), ran = await simRun(page, secs, 'PL.ent.health = 100;');
await page.waitForTimeout(3000); // let a few real frames render
const r = await page.evaluate(() => ({ state: MATCH.state, mode: MATCH.mode, map: MAPL.id, time: Math.round(MATCH.time), kills: entities.reduce((s, e) => s + e.kills, 0), alive: entities.filter((e) => e.alive).length, efc: typeof EFC !== 'undefined' }));
if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
await browser.close();
console.log(JSON.stringify({ ...r, ran, wall: Math.round((Date.now() - t0) / 1000) }));
if (errors.length) { console.error(errors.slice(0, 20).join('\n')); process.exit(1); }
if (ran < Math.min(secs, 5)) { console.error('match did not run'); process.exit(1); }
console.log('smoke ok');
