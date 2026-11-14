// UI package test: main menu entries, Hideout moves, the raid deploy flow, the in-raid search prompt, loot and inventory panels, the summary.
// Fake ITEMS, WORLD and RAID providers are registered in the test page only. node tools/dev/efc/test-ui.mjs ; SHOTS=dir (default /tmp)
import fs from 'node:fs';
import path from 'node:path';
import { openGame, simRun, REPO } from './harness.mjs';
const SHOTS = process.env.SHOTS || '/tmp';
const fails = [];
const check = (ok, what, extra) => { console.log((ok ? 'ok   ' : 'FAIL ') + what + (extra !== undefined ? ' ' + JSON.stringify(extra) : '')); if (!ok) fails.push(what); };

// credits screen lists every source of assets/sfx/credits.json that is not plain CC0
const shell = fs.readFileSync(path.join(REPO, 'shell.html'), 'utf8');
const sfx = JSON.parse(fs.readFileSync(path.join(REPO, 'assets/sfx/credits.json'), 'utf8')).sources;
const owed = Object.keys(sfx).filter((k) => !/^CC0/.test(sfx[k].licence));
check(owed.every((k) => shell.includes(`data-src="${k}"`)), 'credits list every non-CC0 sound source', owed.filter((k) => !shell.includes(`data-src="${k}"`)));

const { browser, page, errors } = await openGame({ w: 1280, h: 720 });
try {
  // ---------- main menu ----------
  const mm = await page.evaluate(() => {
    const vis = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const btn = (t) => [...document.querySelectorAll('#scr-main button')].find((b) => b.querySelector('b') ? b.querySelector('b').firstChild.textContent.trim() === t : b.textContent.trim() === t);
    return {
      screen: UI.screen, lang: LANG,
      shown: ['Raid', 'Squad raid', 'Hideout', 'Settings', 'Credits'].map((t) => [t, vis(btn(t))]),
      hidden: [['play', $('mmPlay').closest('button')], ['classes', document.querySelector('#scr-main [data-go=classes]')], ['skins', document.querySelector('#scr-main [data-go=skins]')],
        ['news', document.querySelector('#scr-main [data-go=news]')], ['account', $('acctChip')], ['friends', $('friendsBtn')], ['community', $('commBtn')], ['ranking', $('rankBtn')],
        ['legal', document.querySelector('#scr-main [data-go=legal]')], ['pwa', $('pwaCard')], ['deck', $('deckCard')], ['whatsnew', $('whatsnew')], ['eco', $('ecoAsk')], ['install', $('pwaOffer')]].map(([k, e]) => [k, vis(e)]),
    };
  });
  check(mm.screen === 'main' && mm.lang === 'en', 'boots to the main menu in English', mm.screen + ' ' + mm.lang);
  check(mm.shown.every((x) => x[1]), 'new entries visible', mm.shown);
  check(mm.hidden.every((x) => !x[1]), 'engine entries hidden', mm.hidden.filter((x) => x[1]));
  await page.screenshot({ path: SHOTS + '/efc-ui-main.png', timeout: 300000 });

  // ---------- fake ITEMS / WORLD / RAID providers (test page only) ----------
  await page.evaluate(() => {
    const D = {
      ak: { id: 'ak', name: 'AK-74', kind: 'weapon', w: 3.4, value: 900, weapon: { wkey: 'ak' } }, pm: { id: 'pm', name: 'Service pistol', kind: 'weapon', w: 0.9, value: 150 },
      vest: { id: 'vest', name: 'Plate vest', kind: 'armor', w: 6, value: 700, armor: { tier: 2, cut: 0.3 } }, rk: { id: 'rk', name: 'Rucksack', kind: 'pack', w: 1.2, value: 300, pack: { cap: 12 } },
      a545: { id: 'a545', name: 'Rifle rounds', kind: 'ammo', w: 0.01, value: 2, stack: 120 }, band: { id: 'band', name: 'Bandage', kind: 'med', w: 0.1, value: 40, med: { heal: 20, time: 3 } },
      watch: { id: 'watch', name: 'Brass watch', kind: 'loot', w: 0.2, value: 450 }, cog: { id: 'cog', name: 'Gearbox', kind: 'loot', w: 4, value: 600 },
    };
    window.T = { calls: [] };
    const log = (n, ...a) => T.calls.push([n, ...a]);
    const S = { items: [{ id: 'ak', n: 1, mag: 30, res: 90 }, { id: 'a545', n: 60 }, { id: 'watch', n: 2 }, { id: 'rk', n: 1 }, { id: 'band', n: 3 }], loadout: { slots: { primary: null, sidearm: { id: 'pm', n: 1, mag: 8, res: 24 }, armor: { id: 'vest', n: 1 }, pack: null }, bag: [{ id: 'cog', n: 1 }] } };
    T.S = S;
    delete EFC.services['stash:equip']; // real ITEMS service: this test drives the fake stash through inv:equip
    efcProvide('item:def', (id) => D[id]);
    efcProvide('stash:get', () => S);
    efcProvide('stash:toLoadout', (i) => { log('stash:toLoadout', i); const it = S.items.splice(i, 1)[0]; if (!it) return false; S.loadout.bag.push(it); return true; });
    efcProvide('stash:toStash', (k) => { log('stash:toStash', k); const it = typeof k === 'string' ? S.loadout.slots[k] : S.loadout.bag[k]; if (!it) return false; if (typeof k === 'string') S.loadout.slots[k] = null; else S.loadout.bag.splice(k, 1); S.items.push(it); return true; });
    efcProvide('inv:equip', (inv, i) => { log('inv:equip', i); const it = inv.bag[i], s = D[it.id].kind === 'weapon' ? 'primary' : D[it.id].kind === 'armor' ? 'armor' : 'pack'; if (inv.slots[s]) return false; inv.slots[s] = it; inv.bag.splice(i, 1); return true; });
    efcProvide('inv:remove', (inv, i, n) => { log('inv:remove', i, n); return inv.bag.splice(i, 1)[0] || null; });
    efcProvide('med:use', (i) => { log('med:use', i); return true; });
    efcProvide('raid:leave', () => { log('raid:leave'); toMenu(); });
  });

  // ---------- Hideout ----------
  const ho = await page.evaluate(() => {
    uiGo('hideout');
    const n = () => ({ stash: $('efcHoStash').querySelectorAll('.efc-it').length, bag: $('efcHoLoad').querySelectorAll('[data-bag].efc-it').length, groups: [...$('efcHoStash').querySelectorAll('.efc-gh')].map((e) => e.textContent) });
    const a = n();
    $('efcHoStash').querySelector('[data-stash]').click(); // first row (the AK, under Weapons)
    const b = n(), call1 = JSON.stringify(T.calls[T.calls.length - 1]);
    const eq = $('efcHoLoad').querySelector('[data-act=equip]'); eq.click(); // equip the AK from the bag
    const c = n(), prim = !!T.S.loadout.slots.primary;
    $('efcHoLoad').querySelector('[data-slot=armor]').click(); // the vest back to the stash
    const d = n();
    return { a, b, c, d, call1, prim, tot: $('efcHoTot').textContent, armorBack: !T.S.loadout.slots.armor, focus: document.activeElement && document.activeElement.className };
  });
  check(ho.a.stash === 5 && ho.a.bag === 1 && ho.a.groups.join() === 'Weapons,Ammunition,Packs,Medical,Valuables', 'hideout renders the stash grouped by kind and the loadout', ho.a);
  check(ho.call1 === '["stash:toLoadout",0]' && ho.b.stash === 4 && ho.b.bag === 2, 'click on a stash row calls stash:toLoadout and re-renders', ho.b);
  check(ho.prim && ho.c.bag === 1, 'Equip moves a bag item into its slot', ho.c);
  check(ho.armorBack && ho.d.stash === 5, 'click on a slot calls stash:toStash and re-renders', ho.d);
  check(/Carried .* kg of .* kg/.test(ho.tot) && /Total value/.test(ho.tot), 'loadout shows weight against the limit and total value', ho.tot);
  const kb = await page.evaluate(() => { uiGo('hideout', false); return null; });
  await page.waitForTimeout(100);
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  const kb2 = await page.evaluate(() => T.calls[T.calls.length - 1]);
  check(kb2[0] === 'stash:toLoadout', 'arrows and Enter move a stash row', kb2);
  await page.evaluate(() => { $('efcHoStash').scrollTop = 0; });
  await page.screenshot({ path: SHOTS + '/efc-ui-hideout.png', timeout: 300000 });

  // ---------- Credits ----------
  const cr = await page.evaluate(() => { uiGo('credits'); const t = $('scr-credits').innerText; uiBack(); return { riposte: /Riposte: Frontline 5\.6\.0/.test(t) && /MIT/.test(t), three: /three\.js/.test(t), repo: /github\.com\/VincentDN\/escape-from-claudov/.test(t), back: UI.screen }; });
  check(cr.riposte && cr.three && cr.repo, 'credits screen', cr);

  // ---------- Raid: map choice, loading, deploy ----------
  await page.evaluate(() => { uiOpen('main'); uiGo('raid'); });
  const rs = await page.evaluate(() => ({ prev: $('efcRaidPrev').textContent, rows: [...$('efcRaidList').querySelectorAll('.lrow')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()), kit: $('efcRaidStage').textContent.includes('Plate vest') || $('efcRaidStage').textContent.includes('Service pistol') }));
  check(/Simoun|Claudov/.test(rs.prev) && rs.rows.some((r) => /Map/.test(r)) && rs.kit, 'raid screen shows the map and the loadout', rs);
  await page.evaluate(() => { LOCK.fallback = true; $('efcRaidGo').click(); });
  await page.waitForFunction(() => UI.screen === 'deploy' && !UI.busy, null, { timeout: 120000, polling: 200 });
  const dp = await page.evaluate(() => ({ raid: $('scr-deploy').classList.contains('raid'), mode: Settings.mode, kit: $('efcDepKit').getClientRects().length > 0, picker: $('cpDeploy').getClientRects().length > 0, h2: $('scr-deploy').querySelector('h2').textContent }));
  check(dp.raid && dp.mode === 'raid' && dp.kit && !dp.picker && dp.h2 === 'Ready to deploy', 'deploy screen in its raid view, Settings.mode raid', dp);
  // the panels are tested against fakes: run the match as tdm so the real RAID, WORLD and Warden code stays inert
  await page.evaluate(() => { Settings.mode = 'tdm'; menuDeploy(); });
  await page.waitForFunction(() => MATCH.state === 'playing', null, { timeout: 60000, polling: 200 });
  await simRun(page, 1, 'PL.ent.health = 100;');

  // ---------- In raid: prompt, F hold, loot panel ----------
  await page.evaluate(() => {
    const p = PL.ent.pos;
    T.box = { id: 7, kind: 'crate', name: 'Tool crate', x: p.x + 0.5, y: p.y, z: p.z, yaw: 0, items: [{ id: 'watch', n: 1 }, { id: 'band', n: 2 }, { id: 'a545', n: 30 }] };
    EFC.inv = { slots: { primary: { id: 'ak', n: 1, mag: 30, res: 60 }, sidearm: null, armor: null, pack: null }, bag: [{ id: 'band', n: 1 }, { id: 'cog', n: 1 }] };
    efcProvide('world:list', () => [T.box]);
    efcProvide('world:near', (pos, r) => (Math.hypot(T.box.x - pos.x, T.box.z - pos.z) <= r ? T.box : null));
    efcProvide('world:take', (id, i) => { T.calls.push(['world:take', id, i]); const it = T.box.items.splice(i, 1)[0]; if (it) { EFC.inv.bag.push(it); efcEmit('world:changed', id); efcEmit('inv:changed'); } });
    efcProvide('world:put', (id, it) => { T.calls.push(['world:put', id, it && it.id]); if (id === T.box.id) { T.box.items.push(it); efcEmit('world:changed', id); } });
    efcProvide('med:state', () => T.med || null);
    efcEmit('raid:begin');
    efcEmit('tick', 1 / 30);
  });
  const pr = await page.evaluate(() => ({ show: $('efcPrompt').classList.contains('show'), text: $('efcPromptT').textContent }));
  check(pr.show && /Search Tool crate/.test(pr.text), 'search prompt near a container', pr);
  await page.keyboard.down('KeyF');
  await simRun(page, 1, 'PL.ent.health = 100; efcEmit("tick", 1 / 30);');
  const mid = await page.evaluate(() => ({ text: $('efcPromptT').textContent, bar: $('efcPromptBar').style.transform, open: !$('efcLoot').classList.contains('hidden'), knife: PL.knifeT || 0 }));
  check(/Searching/.test(mid.text) && !mid.open && mid.knife === 0, 'holding F shows search progress, no knife', mid);
  await simRun(page, 1.2, 'PL.ent.health = 100; efcEmit("tick", 1 / 30);');
  await page.keyboard.up('KeyF');
  const lo = await page.evaluate(() => ({ open: !$('efcLoot').classList.contains('hidden'), busy: efcCall('ui:busy'), rows: $('efcLootList').querySelectorAll('.efc-it').length, bag: $('efcLootBag').querySelectorAll('.efc-it').length, title: $('efcLootTitle').textContent, focus: document.activeElement && document.activeElement.dataset.take }));
  check(lo.open && lo.busy === true && lo.rows === 3 && lo.bag === 2 && lo.title === 'Tool crate', 'F hold opens the loot panel, ui:busy true', lo);
  // released early: cancelled (checked on a second container approach later); now take with a click, then with F
  const tk = await page.evaluate(() => { $('efcLootList').querySelector('[data-take="0"]').click(); return { call: T.calls[T.calls.length - 1], rows: $('efcLootList').querySelectorAll('.efc-it').length, bag: $('efcLootBag').querySelectorAll('.efc-it').length }; });
  check(JSON.stringify(tk.call) === '["world:take",7,0]' && tk.rows === 2 && tk.bag === 3, 'click takes the item through world:take, both lists update', tk);
  await page.evaluate(() => $('efcLootList').querySelector('.efc-it').focus());
  await page.keyboard.press('KeyF');
  const tf = await page.evaluate(() => ({ call: T.calls[T.calls.length - 1], rows: $('efcLootList').querySelectorAll('.efc-it').length }));
  check(tf.call[0] === 'world:take' && tf.rows === 1, 'F takes the selected item', tf);
  // no firing or turning while the panel is open (fallback aim: the engine would read the mouse)
  const guard = await page.evaluate(() => { const y = PL.yaw; for (const el of [canvas, $('efcLoot')]) { el.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true })); el.dispatchEvent(new MouseEvent('mousemove', { movementX: 300, bubbles: true })); } /* real events target an element, so the window capture guard runs first */ return { held: PL.held, paused: MATCH.state }; });
  await simRun(page, 0.2, 'PL.ent.health = 100; efcEmit("tick", 1 / 30);');
  check(guard.held === false && guard.paused === 'playing', 'mouse does not fire while busy, match not paused', guard);
  await page.evaluate(() => { $('efcLootBag').querySelector('.efc-it').scrollIntoView(); });
  await page.screenshot({ path: SHOTS + '/efc-ui-loot.png', timeout: 300000 });
  await page.keyboard.press('Tab');
  const cl = await page.evaluate(() => ({ open: !$('efcLoot').classList.contains('hidden'), busy: efcCall('ui:busy'), board: !!HUD.board }));
  check(!cl.open && cl.busy === false && !cl.board, 'Tab closes the loot panel, ui:busy false', cl);

  // ---------- Inventory (Tab) ----------
  await page.keyboard.press('Tab');
  const iv = await page.evaluate(() => ({ open: !$('efcInv').classList.contains('hidden'), busy: efcCall('ui:busy'), slots: $('efcInvList').querySelectorAll('[data-slot].efc-it').length, bag: $('efcInvList').querySelectorAll('[data-bag].efc-it').length, acts: [...$('efcInvList').querySelectorAll('[data-act]')].map((b) => b.dataset.act + (b.disabled ? '-' : '')).join(','), w: $('efcInvW').textContent }));
  check(iv.open && iv.busy === true && iv.slots === 1 && iv.bag === 4, 'Tab opens the inventory, ui:busy true', iv);
  const ia = await page.evaluate(() => {
    $('efcInvList').querySelector('[data-bag="0"][data-act=use]').click();
    const use = T.calls[T.calls.length - 1];
    const n0 = EFC.inv.bag.length; $('efcInvList').querySelector('[data-bag="1"][data-act=drop]').click();
    return { use, drop: T.calls.slice(-2), n: EFC.inv.bag.length, n0 };
  });
  check(JSON.stringify(ia.use) === '["med:use",0]' && ia.drop[1][0] === 'world:put' && ia.drop[1][1] === null && ia.n === ia.n0 - 1, 'inventory row actions use (med:use) and drop (world:put null)', ia);
  await page.evaluate(() => { T.med = { name: 'Bandage', t: 1, time: 3 }; efcEmit('tick', 1 / 30); });
  const hl = await page.evaluate(() => ({ show: $('efcHeal').classList.contains('show'), text: $('efcHealT').textContent }));
  check(hl.show && /Bandage/.test(hl.text), 'heal progress shown while med:state is active', hl);
  await page.keyboard.press('Tab');
  const ic = await page.evaluate(() => ({ open: !$('efcInv').classList.contains('hidden'), busy: efcCall('ui:busy') }));
  check(!ic.open && ic.busy === false, 'Tab closes the inventory', ic);

  // loot panel closes when the player walks away; an early release cancels the search
  const away = await page.evaluate(() => {
    T.med = null; efcUirOpen('loot', 7); const a = !$('efcLoot').classList.contains('hidden');
    T.box.x += 10; efcEmit('tick', 1 / 30); const b = $('efcLoot').classList.contains('hidden');
    T.box.x -= 10; efcEmit('tick', 1 / 30); return { a, b };
  });
  check(away.a && away.b, 'loot panel closes beyond interactR + 1 m', away);
  await page.keyboard.down('KeyF'); await simRun(page, 0.5, 'PL.ent.health = 100; efcEmit("tick", 1 / 30);'); await page.keyboard.up('KeyF'); await simRun(page, 2.5, 'PL.ent.health = 100; efcEmit("tick", 1 / 30);');
  const cancel = await page.evaluate(() => ({ open: !$('efcLoot').classList.contains('hidden'), text: $('efcPromptT').textContent }));
  check(!cancel.open && /^FSearch/.test(cancel.text), 'releasing F early cancels the search', cancel);

  // ---------- Summary ----------
  await page.evaluate(() => efcEmit('raid:over', { result: 'extracted', kills: 3, time: 754, extract: 'North gate', items: [{ id: 'watch', n: 1 }, { id: 'cog', n: 1 }], value: 1050 }));
  const sm = await page.evaluate(() => ({ open: !$('efcSum').classList.contains('hidden'), title: $('efcSumTitle').textContent, text: $('efcSum').innerText, prompt: $('efcPrompt').classList.contains('show') }));
  check(sm.open && sm.title === 'Extracted' && /12:34/.test(sm.text) && /North gate/.test(sm.text) && /1,050/.test(sm.text) && !sm.prompt, 'raid:over shows the summary', sm);
  const lv = await page.evaluate(() => { $('efcSumHide').click(); return { call: T.calls[T.calls.length - 1], screen: UI.screen, state: MATCH.state, hidden: $('efcSum').classList.contains('hidden') }; });
  check(lv.call[0] === 'raid:leave' && lv.screen === 'hideout' && lv.state === 'menu' && lv.hidden, 'Hideout button calls raid:leave and opens the Hideout', lv);
  const dd = await page.evaluate(() => { efcEmit('raid:over', { result: 'dead', kills: 0, time: 61, extract: '', items: [], value: 0 }); const r = { title: $('efcSumTitle').textContent, lost: /Everything you carried is lost/.test($('efcSum').innerText) }; efcSumHide(); return r; });
  check(dd.title === 'Killed in action' && dd.lost, 'death summary says everything is lost', dd);
} catch (e) {
  fails.push('exception: ' + e.message); console.error(e);
}
await browser.close();
if (errors.length) { console.error(errors.slice(0, 20).join('\n')); fails.push('page errors'); }
console.log(fails.length ? `test-ui: ${fails.length} failure(s)` : 'test-ui ok');
process.exit(fails.length ? 1 : 0);
