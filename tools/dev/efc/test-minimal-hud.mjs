import assert from 'node:assert/strict';
import { openGame, startSolo } from './harness.mjs';

const { browser, page, errors } = await openGame();
try {
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  await startSolo(page);
  const result = await page.evaluate(() => {
    const display = (selector) => getComputedStyle(document.querySelector(selector)).display !== 'none';
    const ammo = () => ['#wname', '#pips', '.ammo .nums'].map(display);
    const extracts = () => ['#efcRaidHud > :first-child', '#efcRaidHud .efc-ext'].map(display);
    const toggle = [...document.querySelectorAll('label.orow')].find((row) => row.textContent.trim() === 'Minimal raid HUD')
      .querySelector('input[type=checkbox]');

    const defaults = { setting: toggle.checked, ammo: ammo(), extracts: extracts(),
      cues: ['#nades', '#xhair', '#hp', '#efcRaidHud .efc-sqs'].map(display) };
    $('efcRaidBar').classList.add('show');
    const extracting = extracts();
    $('efcRaidBar').classList.remove('show');
    $('tacmap').classList.add('show');
    const mapOpen = extracts();
    $('tacmap').classList.remove('show');

    toggle.click();
    const full = { setting: toggle.checked, ammo: ammo(), extracts: extracts(),
      saved: JSON.parse(localStorage.getItem('dc_settings')).efcHudMinimal };
    toggle.click();
    toMenu();
    const outsideRaid = ammo();
    toggle.click();
    return { defaults, extracting, mapOpen, full, outsideRaid };
  });
  assert.deepEqual(result.defaults, {
    setting: true, ammo: [false, false, false], extracts: [false, false], cues: [true, true, true, true],
  });
  assert.deepEqual(result.extracting, [true, true]);
  assert.deepEqual(result.mapOpen, [true, true]);
  assert.deepEqual(result.full, { setting: false, ammo: [true, true, true], extracts: [true, true], saved: false });
  assert.deepEqual(result.outsideRaid, [true, true, true]);
  await page.reload();
  await page.waitForFunction(() => typeof MATCH !== 'undefined' && MATCH.state === 'menu', null, { timeout: 300000 });
  assert.equal(await page.evaluate(() => Settings.efcHudMinimal), false);
  assert.deepEqual(errors, []);
  console.log('minimal raid HUD default, cues, visibility, toggle and persistence ok');
} finally {
  await browser.close();
}
