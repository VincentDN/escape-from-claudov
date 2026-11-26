// C0-2: scripted pointer drags between the raid panels (open crate, pockets, pack, slots, quick slots, attachments, ground).
// Real game services in a solo raid on Claudov. node tools/dev/efc/test-inventory-drag.mjs ; EFC_GRID_SHOTS=dir for screenshots
import assert from 'node:assert/strict';
import { openGame, startSolo, simRun } from './harness.mjs';

const { browser, page, errors } = await openGame({ settings: { map: 'claudov', mode: 'raid', minutes: 60 }, w: 1366, h: 900 });
// full health, and the player pinned next to the crate (the loot panel closes beyond reach, and a raid can push the player)
const KEEP = 'PL.ent.health = 100; if (window.efcTestPin) PL.ent.pos.copy(window.efcTestPin);';
const passed = [];
const ok = (name) => { passed.push(name); console.log('ok   ' + name); };
const grid = (area) => page.locator(`#efcLoot .efc-op-grid[data-op-area="${area}"]`);
const item = (scope, id) => page.locator(`${scope} [data-op-source][data-efc-id="${id}"]`).first();
// an item in the carried grids only (the crate's random contents can hold the same item ids)
const carried = (id) => item('#efcLoot #efcOpLootEquipment .efc-op-grid', id);
// scrolls every scroll box around an element by the least amount that brings rows top..bottom (page pixels, from rect) on
// screen, as a player does with the wheel; the carried grids and slots share one 48vh scroll box
async function reveal(locator, rows = (r) => r) {
  await locator.evaluate((el, rowsSrc) => {
    const rows = eval(rowsSrc);
    for (let box = el.parentElement; box && box !== document.body; box = box.parentElement) {
      if (box.scrollHeight <= box.clientHeight + 1 || !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) continue;
      const b = box.getBoundingClientRect(), c = rows(el.getBoundingClientRect(), el);
      if (c.bottom > b.bottom) box.scrollTop += c.bottom - b.bottom + 4;
      else if (c.top < b.top) box.scrollTop -= b.top - c.top + 4;
    }
  }, rows.toString());
}
// centre of cell (x, y) of a grid, from its data-op-cols and data-op-rows, once that row is on screen
async function cellPoint(gridLocator, x, y) {
  await reveal(gridLocator, `(r, g) => ({ top: r.top + ${y} * r.height / +g.dataset.opRows, bottom: r.top + ${y + 1} * r.height / +g.dataset.opRows })`);
  let box = null;
  for (let i = 0; i < 10 && !box; i++) box = (await gridLocator.boundingBox()) || (await page.waitForTimeout(100), null); // the grid may be re-rendering
  assert.ok(box, 'the target grid is on screen ' + await page.evaluate(() => JSON.stringify({ panel: EFC_UIR.panel, alive: PL.ent.alive, health: PL.ent.health, state: MATCH.state, on: EFC_UIR.on, cid: EFC_UIR.cid, cont: !!efcUirCont(), dist: efcUirCont() && efcUirDist(efcUirCont()), grids: [...document.querySelectorAll('#efcLoot .efc-op-grid')].map(g => [g.dataset.opArea, g.getBoundingClientRect().height]) })));
  const cols = +(await gridLocator.getAttribute('data-op-cols')), rows = +(await gridLocator.getAttribute('data-op-rows'));
  return [box.x + box.width * (x + 0.5) / cols, box.y + box.height * (y + 0.5) / rows];
}
async function centre(locator) { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; }
async function centreOnScreen(locator) { await reveal(locator); return centre(locator); }
// press on the source, start the drag, bring the target on screen (wheel scrolling while dragging), move in steps to the point,
// check the ghost follows, optionally act while hovering, release
async function drag(source, to, during) {
  await source.scrollIntoViewIfNeeded();
  const [sx, sy] = await centre(source);
  assert.ok(await source.evaluate((el, [x, y]) => el.contains(document.elementFromPoint(x, y)), [sx, sy]), 'the source is on screen');
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 8, sy, { steps: 2 }); // starts the drag
  if (typeof to === 'function') to = await to(); // measured once the drag has started and the target was scrolled in
  await page.mouse.move(to[0], to[1], { steps: 6 });
  const ghost = await page.locator('.efc-op-ghost').boundingBox();
  assert.ok(ghost, 'a ghost follows the pointer');
  assert.ok(to[0] >= ghost.x - 40 && to[0] <= ghost.x + ghost.width + 40 && to[1] >= ghost.y - 40 && to[1] <= ghost.y + ghost.height + 40,
    'the ghost is under the pointer ' + JSON.stringify({ to, ghost }));
  if (during) await during();
  await page.mouse.up();
  await simRun(page, 0.5, KEEP);
}
// first free cell for an item in a carried grid (area) or in a container's grid (cid)
const freeCell = (where, id) => page.evaluate(([where, id]) => {
  const g = where.cid ? (efcCall('world:list') || []).find(c => c.id === where.cid).grid : efcCall('grid:loadout', EFC.inv)[where.area];
  for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) if (efcCall('grid:fits', g, { id, n: 1 }, x, y, false)) return [x, y];
  return null;
}, [where, id]);
const entries = (area) => page.evaluate((area) => efcCall('grid:loadout', EFC.inv)[area]?.entries.map(e => ({ id: e.item.id, x: e.x, y: e.y, rotated: !!e.rotated })) || [], area);

try {
  await startSolo(page);
  await simRun(page, 2, KEEP);
  // the nearest crate with a grid, a rifle and a red dot in the bag, an empty pack
  const crate = await page.evaluate(() => {
    const p = PL.ent.pos, list = (efcCall('world:list') || []).filter(c => c.kind === 'crate' && c.grid);
    list.sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
    const c = list[0];
    PL.ent.pos.set(c.x + 0.8, c.y, c.z);
    window.efcTestPin = PL.ent.pos.clone();
    setInterval(() => { PL.ent.health = 100; PL.ent.pos.copy(window.efcTestPin); }, 20); // the live game loop also runs between steps
    // a known kit: large pack, the raid sidearm kept (the primary slot empty for check 7), a bandage, a rifle and a red dot in the bag; a known item in the crate
    const inv = efcCall('inv:new');
    inv.slots.primary = EFC.inv.slots.primary; inv.slots.sidearm = EFC.inv.slots.sidearm;
    inv.slots.pack = efcItemNorm({ id: 'pack_l', n: 1 });
    EFC.inv = inv;
    for (const id of ['med_bandage', 'w_ak47', 'part_red']) efcCall('inv:add', EFC.inv, efcItemNorm({ id, n: 1 }));
    inv.slots.primary = null; // emptied after the adds, so the rifle lands in the bag rather than in the slot
    efcCall('world:put', c.id, efcItemNorm({ id: 'loot_keys', n: 1 }));
    efcEmit('inv:changed');
    efcUirOpen('loot', c.id);
    return { id: c.id, rev: c.rev, first: 'loot_keys', has: c.items.some(i => i.id === 'loot_keys') };
  });
  assert.ok(crate.has, 'the crate holds the test item ' + JSON.stringify(crate));
  await simRun(page, 0.5, KEEP);
  crate.rev = await page.evaluate((id) => (efcCall('world:list') || []).find(c => c.id === id).rev, crate.id);

  // 1. crate grid to pockets, exact cell
  const c1 = await freeCell({ area: 'pockets' }, crate.first);
  assert.ok(c1, 'pockets have room');
  await drag(item('#efcOpLootGrid', crate.first), () => cellPoint(grid('pockets'), ...c1));
  const took = await page.evaluate((id) => (efcCall('world:list') || []).find(c => c.id === id).rev, crate.id);
  assert.ok(took > crate.rev, 'the crate revision moved on');
  assert.ok((await entries('pockets')).some(e => e.id === crate.first && e.x === c1[0] && e.y === c1[1]), 'crate item placed in pockets at the cell');
  ok('crate to pockets at an exact cell');

  // 2. pockets to pack, exact cell
  const c2 = await freeCell({ area: 'pack' }, crate.first);
  await drag(item('#efcLoot .efc-op-grid[data-op-area="pockets"]', crate.first), () => cellPoint(grid('pack'), ...c2));
  assert.ok((await entries('pack')).some(e => e.id === crate.first && e.x === c2[0] && e.y === c2[1]), 'pockets item placed in the pack at the cell');
  ok('pockets to pack at an exact cell');

  // 3. pack back to the crate grid
  const revBefore = await page.evaluate((id) => (efcCall('world:list') || []).find(c => c.id === id).rev, crate.id);
  const c3 = await freeCell({ cid: crate.id }, crate.first);
  await drag(item('#efcLoot .efc-op-grid[data-op-area="pack"]', crate.first), () => cellPoint(page.locator('#efcOpLootGrid .efc-op-grid'), ...c3));
  const back = await page.evaluate((id) => { const c = (efcCall('world:list') || []).find(c => c.id === id); return { rev: c.rev, ids: c.items.map(i => i.id) }; }, crate.id);
  assert.ok(back.rev > revBefore && back.ids.includes(crate.first), 'item back in the crate ' + JSON.stringify(back));
  ok('pack to crate grid');

  // 4. a long rifle hovering where it only fits rotated: red, R, green, release, placed rotated
  const fit = await page.evaluate(() => {
    const g = efcCall('grid:loadout', EFC.inv).pack, [w, h] = efcCall('grid:size', { id: 'w_ak47', n: 1 });
    return { cols: g.cols, rows: g.rows, w, h, x: g.cols - h, y: 0 };
  });
  assert.ok(fit.w > fit.h && fit.rows >= fit.w && fit.x >= 0, 'pack shape allows a rotated rifle ' + JSON.stringify(fit));
  const pack = grid('pack');
  await drag(item('#efcLoot .efc-op-grid[data-op-area="pockets"]', 'w_ak47').or(item('#efcLoot .efc-op-grid[data-op-area="armor"]', 'w_ak47')).first(),
    () => cellPoint(pack, fit.x, fit.y), async () => {
      assert.equal(await pack.getAttribute('data-op-drop'), 'invalid', 'rifle over the pack is red ' + JSON.stringify(fit));
      if (process.env.EFC_GRID_SHOTS) await page.screenshot({ path: process.env.EFC_GRID_SHOTS + '/raid-drag-blocked.png', timeout: 120000 });
      await page.keyboard.press('KeyR');
      assert.equal(await pack.getAttribute('data-op-drop'), 'valid');
      if (process.env.EFC_GRID_SHOTS) await page.screenshot({ path: process.env.EFC_GRID_SHOTS + '/raid-drag-valid.png', timeout: 120000 });
    });
  assert.ok((await entries('pack')).some(e => e.id === 'w_ak47' && e.x === fit.x && e.rotated), 'rifle placed rotated');
  ok('R rotates a long item to fit while dragging');

  // 5. a refused drop onto the rifle: the red dot stays where it was
  const dotBefore = (await entries('pockets')).concat(await entries('armor')).find(e => e.id === 'part_red');
  await drag(carried('part_red'), () => cellPoint(pack, fit.x, fit.y));
  const dotAfter = (await entries('pockets')).concat(await entries('armor')).find(e => e.id === 'part_red');
  assert.deepEqual(dotAfter, dotBefore, 'refused drop returns the item');
  ok('refused drop returns the item to its origin');

  // 6. bag item to quick slot 0
  await drag(carried('med_bandage'), () => centreOnScreen(page.locator('#efcLoot [data-op-target="quick"][data-op-key="0"]')));
  assert.equal(await page.evaluate(() => efcOperatorQuickList()[0]?.id), 'med_bandage');
  ok('bag item to quick slot');

  // 7. rifle to the primary slot, then the red dot onto its optic slot
  await drag(carried('w_ak47'), () => centreOnScreen(page.locator('#efcLoot [data-op-target="slot"][data-op-key="primary"]')));
  assert.equal(await page.evaluate(() => EFC.inv.slots.primary?.id), 'w_ak47');
  const optic = page.locator('#efcLoot [data-op-target="attachment"][data-op-key="optic"]');
  await drag(carried('part_red'), () => centreOnScreen(optic));
  const mounted = await page.evaluate(() => efcCall('weaponmods:slots', EFC.inv.slots.primary).find(p => p.slot === 'optic')?.item?.id);
  assert.equal(mounted, 'part_red');
  ok('rifle to the primary slot, red dot onto its optic');

  // 8. released on the "Drop here" zone under the operator (K10): the host puts it into a container within reach (here the open
  // crate), otherwise into a new drop at the player's feet
  const droppedId = 'med_bandage', bagCount = () => page.evaluate(() => efcCall('grid:loadout', EFC.inv) && EFC.inv.bag.filter(i => i.id === 'med_bandage').reduce((k, i) => k + (i.n || 1), 0));
  const inWorld = (id) => page.evaluate((id) => (efcCall('world:list') || []).reduce((n, c) => n + c.items.filter(i => i.id === id).reduce((k, i) => k + (i.n || 1), 0), 0), id); // counts units, as a drop may join a stack
  const worldBefore = await inWorld(droppedId), bagBefore = await bagCount();
  const zone = page.locator('#efcLoot [data-op-target="ground"]');
  await drag(carried(droppedId), () => centreOnScreen(zone), async () => assert.equal(await zone.getAttribute('data-op-drop'), 'valid', 'the ground zone lights green'));
  await simRun(page, 0.5, KEEP);
  assert.ok(await inWorld(droppedId) > worldBefore, 'the dropped item is in the world ' + JSON.stringify({ worldBefore, world: await inWorld(droppedId), bagBefore, bag: await bagCount() }));
  ok('released on the ground zone: dropped into the world');

  assert.deepEqual(errors, []);
  console.log(`inventory drag ok (${passed.length} checks)`);
} finally { await browser.close(); }
