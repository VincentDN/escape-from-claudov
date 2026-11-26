// Set FONT_SCREENSHOTS=docs/fonts to refresh the three reference screenshots.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { openGame, startSolo } from './harness.mjs';
import { createLobby, openPair } from './net2.mjs';

const sizes = [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }];
const screenshots = process.env.FONT_SCREENSHOTS;
let failed = 0;
const activate = async (page, selector) => {
  const control = page.locator(selector);
  await control.waitFor({ state: 'visible', timeout: 45_000 });
  await control.evaluate((button) => button.click());
};
const screen = async (page, name, root, shot) => {
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.locator(root).waitFor({ state: 'visible', timeout: 45_000 });
    const results = await page.evaluate(async (root) => {
      await document.fonts.ready;
      const target = document.querySelector(root);
      await Promise.allSettled(target.getAnimations({ subtree: true }).filter(animation =>
        Number.isFinite(animation.effect?.getComputedTiming().endTime)).map(animation => animation.finished));
      const candidates = [target, ...target.querySelectorAll('*')].filter((element) =>
        element instanceof HTMLElement && element.checkVisibility({ visibilityProperty: true }) &&
        getComputedStyle(element).fontFamily.split(',').some((name) => name.trim().replace(/^["']|["']$/g, '') === 'Inter'));
      return {
        total: candidates.length,
        fonts: [...document.fonts].filter((face) => face.family === 'Inter' && face.status === 'loaded').map((face) => face.weight),
        overflow: candidates.filter((element) => element.scrollWidth > element.clientWidth + 1).map((element) => ({
          selector: element.id ? '#' + element.id : element.tagName.toLowerCase() + (element.classList.length ? '.' + [...element.classList].join('.') : ''),
          sample: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 65),
          client: element.clientWidth,
          scroll: element.scrollWidth,
        })),
      };
    }, root);
    const label = `${name} at ${size.width}×${size.height}`;
    if (!results.fonts.length || !results.total || results.overflow.length) {
      console.error('FAIL', label, JSON.stringify(results));
      failed++;
    } else {
      console.log('PASS', label, `(${results.total} Inter elements)`);
    }
    if (shot && screenshots && size.width === sizes[0].width) {
      await mkdir(screenshots, { recursive: true });
      await page.screenshot({ path: join(screenshots, shot + '.png'), timeout: 120_000 });
    }
  }
};
const { page, browser } = await openGame({ w: 1280, h: 720, settings: { map: 'claudov', mode: 'raid' } });
try {
  await screen(page, 'main menu', '#scr-main', 'main-menu');
  for (const [name, button, root, shot] of [
    ['hideout', '#efcMmHideout', '#scr-hideout', 'hideout'],
    ['settings', '#efcMmSettings', '#scr-options'],
    ['credits', '#efcCreditsBtn', '#scr-credits'],
  ]) {
    await activate(page, button);
    await screen(page, name, root, shot);
    await activate(page, root + ' [data-back]');
  }
  await startSolo(page);
  await screen(page, 'raid HUD', '#hud', 'raid-hud');
  await page.keyboard.press('Tab');
  await screen(page, 'operator inventory', '#efcInv');
  await page.keyboard.press('Tab');
  await page.evaluate(() => endMatch());
  await screen(page, 'summary', '#end');
} finally {
  await browser.close();
}
const rig = await openPair({ map: 'claudov' });
try {
  await activate(rig.host, '#efcMmSquad');
  await rig.host.locator('#scr-multi').waitFor({ state: 'visible', timeout: 45_000 });
  await createLobby(rig.host, { map: 'claudov', mode: 'raid' });
  await screen(rig.host, 'lobby', '#scr-multi.lobby');
} finally {
  await rig.close();
}

console.log(failed ? `${failed} font checks failed` : 'font overflow checks passed');
if (failed) process.exitCode = 1;
