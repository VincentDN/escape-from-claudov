// Compare the Partisan and Claudov workbench canvases in the same browser.
import assert from 'node:assert/strict';
import { launchEfcBrowser } from './harness.mjs';

const gameUrl = process.env.EFC_TEST_URL || 'http://127.0.0.1:8124/';
const sourceUrl = process.env.PARTISAN_TEST_URL || 'https://vincentdn.github.io/partisan-project/';
const baselineUrl = process.env.EFC_BASELINE_URL;
const browser = await launchEfcBrowser();

async function open(url, selector, viewport, deviceScaleFactor) {
  const page = await browser.newPage({ viewport, deviceScaleFactor });
  await page.addInitScript(() => {
    const metrics = window.menuMetrics = { frames: [], opportunities: [], reads: 0 };
    const request = window.requestAnimationFrame;
    let activeFrame;
    window.requestAnimationFrame = callback => request.call(window, (now) => {
      if (metrics.opportunities.at(-1) !== now) metrics.opportunities.push(now);
      activeFrame = now;
      try { callback(now); } finally { activeFrame = undefined; }
    });
    for (const { prototype } of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const read = prototype.readPixels;
      prototype.readPixels = function (...args) {
        metrics.reads++;
        return read.apply(this, args);
      };
      const clear = prototype.clear;
      const bind = prototype.bindFramebuffer;
      const targets = new WeakMap();
      prototype.bindFramebuffer = function (target, buffer) {
        if (target !== this.READ_FRAMEBUFFER) targets.set(this, buffer);
        return bind.call(this, target, buffer);
      };
      prototype.clear = function (mask) {
        if (activeFrame !== undefined && !targets.get(this) && metrics.frames.at(-1) !== activeFrame) {
          metrics.frames.push(activeFrame);
        }
        return clear.call(this, mask);
      };
    }
  });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const frame = page.frameLocator(selector);
  const canvas = frame.locator('#stage canvas');
  await canvas.waitFor({ timeout: 60000 });
  if (selector === '#view') {
    await frame.locator('body').press('Escape');
    await frame.locator('#stage').evaluate(() => new Promise((resolve) => {
      function wait() {
        if (window.menuMetrics.frames.length >= 3 && !document.querySelector('canvas[style*=pixelated]')) resolve();
        else requestAnimationFrame(wait);
      }
      wait();
    }));
  } else {
    await page.locator('#menuBg.intro-ready').waitFor({ timeout: 60000 });
  }
  return { page, canvas };
}

async function measure({ page, canvas }) {
  await page.mouse.move(100, 100);
  const reads = await page.evaluate(() => window.menuMetrics.reads);
  const result = await canvas.evaluate(async element => {
    const metrics = window.menuMetrics;
    const start = performance.now(), frameIndex = metrics.frames.length;
    // Sample several draws even when the browser is using a software renderer.
    await new Promise(resolve => {
      function sample() {
        const elapsed = performance.now() - start;
        if ((elapsed >= 2500 && metrics.frames.length - frameIndex >= 8) || elapsed >= 25000) resolve();
        else requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
    const frames = metrics.frames.slice(frameIndex);
    const deltas = frames.slice(1).map((time, index) => time - frames[index]);
    const ordered = [...deltas].sort((a, b) => a - b);
    const value = (q) => Math.round((ordered[Math.floor((ordered.length - 1) * q)] || 0) * 10) / 10;
    const opportunities = metrics.opportunities.filter(time => time >= start).length;
    return {
      buffer: [element.width, element.height], frames: frames.length, opportunities,
      medianMs: value(.5), p95Ms: value(.95),
    };
  });
  result.readbacks = await page.evaluate(previous => window.menuMetrics.reads - previous, reads);
  return result;
}

try {
  const viewport = { width: 480, height: 270 };
  const source = await open(sourceUrl, '#view', viewport, 2);
  const reference = await measure(source);
  await source.page.close();
  if (baselineUrl) {
    const baseline = await open(baselineUrl, '#efcIntroFrame', viewport, 2);
    console.log('Previous Claudov', await measure(baseline));
    await baseline.page.close();
  }
  const game = await open(gameUrl, '#efcIntroFrame', viewport, 2);
  const current = await measure(game);
  console.log('Partisan', reference);
  console.log('Current Claudov', current);
  assert.deepEqual(reference.buffer, [960, 540]);
  assert.deepEqual(current.buffer, reference.buffer);
  assert.equal(current.readbacks, 0, 'The opening scene should have exclusive use of the GPU');
  assert.ok(current.frames > 2 && reference.frames > 2, 'Both canvases must animate');
  assert.ok(current.frames >= current.opportunities - 1, 'Draw on every available animation frame');
  await game.page.setViewportSize({ width: 512, height: 288 });
  await game.page.frameLocator('#efcIntroFrame')
    .locator('#stage canvas[width="1024"][height="576"]').waitFor({ timeout: 60000 });
  await game.page.locator('#efcMmHideout').evaluate(button => button.click());
  await game.page.waitForFunction(() => window.menuMetrics.reads > 0, null, { timeout: 60000 });
} finally {
  await browser.close();
}
