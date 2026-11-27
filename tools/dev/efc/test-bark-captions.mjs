import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { openGame, startSolo } from './harness.mjs';

const { browser, page, errors } = await openGame({ w: 960, h: 540, settings: { map: 'claudov', mode: 'raid' } });
try {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startSolo(page);
  await page.evaluate(() => {
    // Pause the live simulation while laying out a reproducible view and the two cue locations.
    GPUX.halt = true;
    const player = PL.ent;
    player.pos.set(29, gy0(29, 45), 45);
    player.vel.set(0, 0, 0);
    PL.yaw = -1.2;
    PL.pitch = 0.02;
    for (let i = 0; i < 8; i++) matchTick(1 / 30, false);
    const forward = camera.getWorldDirection(new V3());
    const origin = camera.position.clone();
    // Choose a clear point near the middle of the view, above ground for this UI fixture.
    let front = null;
    for (const distance of [8, 6, 4, 2, 1]) {
      const candidate = origin.clone().addScaledVector(forward, distance);
      if (lineClear(origin, candidate)) { front = candidate; break; }
    }
    if (!front) throw new Error('Expected a clear spot in front of the camera');
    const behind = origin.clone().addScaledVector(forward, -7);
    const bot = entities.find((entity) => !entity.isPlayer && entity.alive && entity.model);
    if (!bot) throw new Error('Expected a visible raid hostile');
    bot.pos.set(front.x, gy0(front.x, front.z), front.z);
    bot.yaw = PL.yaw + Math.PI;
    poseSoldier(bot, 0);
    layoutSoldier(bot.model, true);
    behind.y -= 1.9;
    HUD.msgT = 0;
    $('msg').classList.remove('show');
    window.efcCaptionTestBark = (pos, id, line) => ({ id, kind: 'spot', line, pos, voice: 'w', at: MATCH.time });
    window.efcCaptionTestFront = bot.pos.toArray();
    window.efcCaptionTestBehind = behind.toArray();
    renderFrame(0);
    efcEmit('bark', efcCaptionTestBark(efcCaptionTestFront, bot.id, 'Contact!'));
    efcEmit('bark', efcCaptionTestBark(efcCaptionTestBehind, -2, 'Moving up!'));
  });
  const speaker = page.locator('.efc-bark-caption[data-mode="speaker"]');
  const feed = page.locator('.efc-bark-caption[data-mode="feed"]');
  assert.equal(await speaker.count(), 1);
  assert.equal(await feed.count(), 1);
  assert.match(await speaker.textContent(), /Contact!/);
  assert.match(await feed.locator('b').evaluate((arrow) => arrow.style.transform), /^rotate\(/);
  assert.equal(await speaker.evaluate((caption) => getComputedStyle(caption).animationName), 'none');

  const screenshot = process.env.BARK_CAPTION_SHOT;
  if (screenshot) {
    mkdirSync(new URL('.', 'file://' + screenshot), { recursive: true });
    await page.screenshot({ path: screenshot, timeout: 120000 });
  }
  const verified = await page.evaluate(() => {
    const root = $('efcBarkCaptions');
    const settingsWasEnabled = Settings.efcBarkCaptions;
    efcEmit('bark', efcCaptionTestBark(efcCaptionTestBehind, -3, 'Reloading!'));
    efcEmit('bark', efcCaptionTestBark(efcCaptionTestBehind, -4, 'Falling back!'));
    const capped = root.querySelectorAll('.efc-bark-caption').length === 3 && !root.textContent.includes('Contact!');
    const ordered = Array.from($('efcBarkCaptionFeed').children, (row) => row.textContent.slice(1)).join('|');
    MATCH.time += 2.49;
    efcBarkCaptionUpdate();
    const stillVisible = root.querySelectorAll('.efc-bark-caption').length === 3;
    MATCH.time += 0.02;
    efcBarkCaptionUpdate();
    const expired = root.querySelectorAll('.efc-bark-caption').length === 0;
    efcEmit('bark', efcCaptionTestBark(efcCaptionTestFront, -5, 'Contact!'));
    Settings.efcBarkCaptions = false;
    efcBarkCaptionUpdate();
    efcEmit('bark', efcCaptionTestBark(efcCaptionTestBehind, -6, 'Moving up!'));
    const disabled = root.querySelectorAll('.efc-bark-caption').length === 0;
    Settings.efcBarkCaptions = settingsWasEnabled;
    return { capped, ordered, stillVisible, expired, disabled };
  });
  assert.deepEqual(verified, { capped: true, ordered: 'Moving up!|Reloading!|Falling back!', stillVisible: true, expired: true, disabled: true });
  assert.deepEqual(errors, []);
  console.log('bark captions ok');
} finally {
  await browser.close();
}
