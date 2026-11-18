// Opening scene and developer entry points on the real Claudov root.
import assert from 'node:assert/strict';
import { openGame, startSolo } from './harness.mjs';

const { browser, page, errors } = await openGame({ w: 1280, h: 720, noMap: true, init: 'window.EFC_TEST_OPENING = true;' });
try {
  if (!process.env.EFC_TEST_URL) throw new Error('Serve dist over HTTP and set EFC_TEST_URL');
  await page.waitForSelector('#menuBg.intro-ready', {timeout: 120000});
  assert.ok(await page.frameLocator('#efcIntroFrame').locator('canvas').isVisible());
  assert.ok(await page.getByRole('button', {name: 'Raid Solo raid against the Wardens'}).isVisible());
  assert.equal(await page.getByRole('link', {name: 'Opening Scene', exact: true}).count(), 0);
  assert.equal(await page.getByRole('link', {name: 'Weapon Workbench', exact: true}).count(), 0);
  await page.evaluate(() => uiGo('hideout'));
  assert.ok(await page.locator('#efcIntroFrame').isHidden());
  await page.evaluate(() => uiGo('main'));
  await page.waitForSelector('#menuBg.intro-ready');
  const build = page.getByRole('button', { name: /^Build [0-9a-f]+/ });
  for (let i = 0; i < 6; i++) await build.click();
  assert.ok(await page.getByRole('dialog', { name: 'Developer menu' }).isHidden());
  await build.click();
  const dialog = page.getByRole('dialog', { name: 'Developer menu' });
  assert.ok(await dialog.isVisible());
  await dialog.getByRole('checkbox', { name: 'Invulnerability' }).check();
  await dialog.getByRole('checkbox', { name: 'Freeze raid timer' }).check();
  assert.equal(await dialog.getByRole('link', { name: 'Module index' }).getAttribute('href'), 'showcase/modules/');
  const modules = await page.request.get(new URL('showcase/modules/', process.env.EFC_TEST_URL).href);
  assert.ok(modules.ok() && (await modules.text()).includes('StG 44 weapon workbench'));
  await dialog.getByRole('button', { name: 'Close' }).click();
  assert.ok(await dialog.isHidden());
  assert.match(await page.evaluate(() => MUS.url), /campaign-acoustic-guitars\.mp3$/);
  await page.waitForFunction(() => MUS.el?.els.some(audio => !audio.paused));
  await page.evaluate(() => uiGo('hideout'));
  await page.waitForFunction(() => EFC_OPENING.frame.hidden);
  await page.evaluate(() => mapEnsure(Settings.map));
  await startSolo(page);
  const state = await page.evaluate(() => {
    const p = PL.ent, hp = p.health, left = MATCH.timeLeft;
    p.protT = 0;
    applyDamage(p, 40, null, 'test', false, new V3());
    matchTick(1 / 30, false);
    const solo = { undamaged: p.health === hp, frozen: MATCH.timeLeft === left };
    MATCH.online = true;
    const online = efcDevActive('health') || efcDevActive('timer');
    MATCH.online = false;
    return { ...solo, online };
  });
  assert.deepEqual(state, {undamaged: true, frozen: true, online: false});
  assert.deepEqual(errors, []);
  await page.goto(new URL('showcase/intro/', process.env.EFC_TEST_URL).href, {waitUntil: 'commit'});
  await page.waitForURL(process.env.EFC_TEST_URL, {waitUntil: 'commit'});
  console.log('root scene, menu navigation, seven-tap developer door, solo cheats, soundtrack and legacy redirect passed');
} finally {
  await browser.close();
}
