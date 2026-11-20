import assert from 'node:assert/strict';
import { openGame } from './harness.mjs';

const { browser, page, errors } = await openGame({ noMap: true });
try {
  const shots = await page.evaluate(() => {
    const rifleWithOptic = weaponDef('ak47', ['red']);
    const cases = [
      ['AK-47 irons', WEAPONS.ak47, true],
      ['SKS irons', WEAPONS.sks, true],
      ['MP5 irons', WEAPONS.mp5, true],
      ['AK-47 hip fire', WEAPONS.ak47, false],
      ['SKS hip fire', WEAPONS.sks, false],
      ['AK-47 red dot', rifleWithOptic, true],
      ['Native scope', WEAPONS.l96, true],
    ];
    const random = Math.random;
    Math.random = () => 0.75;
    try {
      return cases.map(([name, def, ads]) => {
        const r = def.recoil, F = def.feel, a = (ads ? 0.55 : 1) * RECOIL.vis;
        const previous = {
          vz: r.kick * 22 * a * F.kick, vrx: r.rot * 18 * a * F.rot, vry: 0.25 * r.rot * 10 * a,
          vrz: 0.25 * r.rot * 14 * (1 + F.roll), vy: r.kick * 4 * F.kick,
          z: r.kick * 0.35 * a * F.kick, rx: r.rot * 0.25 * a * F.rot,
        };
        for (const key of Object.keys(previous)) VM.rec[key] = 0;
        vmKick(def, ads);
        return [name, Object.fromEntries(Object.entries(previous).map(([key, value]) => [key, VM.rec[key] / value]))];
      });
    } finally { Math.random = random; }
  });
  const expected = { 'AK-47 irons': 0.42, 'SKS irons': 0.30, 'MP5 irons': 0.55 };
  for (const [name, channels] of shots) {
    for (const [key, ratio] of Object.entries(channels)) {
      assert.ok(Math.abs(ratio - (expected[name] ?? 1)) < 1e-9, `${name} ${key}: ${ratio}`);
    }
  }
  assert.deepEqual(errors, []);
  console.log('Iron-sight weapon kick reduced across all channels, hip and optic baselines preserved');
} finally {
  await browser.close();
}
