// Quick probe of a map build: load it, print build stats, console warnings and errors. MAP=claudov node tools/dev/efc/probe-map.mjs
import { openGame } from './harness.mjs';
const warns = [];
const { browser, page, errors } = await openGame({ settings: { map: process.env.MAP || 'claudov' } });
page.on('console', (m) => { if (m.type() === 'warning') warns.push(m.text()); });
const r = await page.evaluate(() => ({ map: MAPL.id, state: MAPL.state, col: COL.length, ramps: RAMPS.length, nav: NAV.count, tris: WORLD.tris, meshes: WORLD.meshes.length, T: MAPL.T }));
console.log(JSON.stringify(r));
await browser.close();
if (warns.length) console.log('warnings:\n' + warns.slice(0, 20).join('\n'));
if (errors.length) { console.error(errors.slice(0, 20).join('\n')); process.exit(1); }
