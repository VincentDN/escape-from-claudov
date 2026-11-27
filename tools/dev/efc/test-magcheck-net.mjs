import assert from 'node:assert/strict';
import { openPair, createLobby, joinLobby, launch, waitInMatch, stepBoth, settle } from './net2.mjs';

const rig = await openPair({ map: 'simoun', settings: { efcWeaponCheck: false } });
try {
  const { host, guest } = rig, pages = [host, guest];
  const code = await createLobby(host, { mode: 'raid', map: 'simoun' });
  await joinLobby(guest, code);
  await launch(host);
  await Promise.all(pages.map((page) => waitInMatch(page)));

  const key = (page, down) => page.evaluate((down) => {
    document.activeElement.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code: 'KeyR', bubbles: true }));
  }, down);
  const advance = async (seconds) => {
    await stepBoth(pages, seconds, 'PL.ent.health = 100;');
    await settle(100);
    await stepBoth(pages, 0.2, 'PL.ent.health = 100;');
  };
  const observed = (page) => page.evaluate(() => {
    const peer = [...NET.remotes.values()].find((ent) => !ent.remoteBot && !ent.netBot);
    if (!peer) return null;
    const check = efcWeaponCheckPose(peer);
    return { pull: check?.magPull || 0, offset: peer.model.magParts[0]?.position.length() || 0, checking: !!check };
  });

  await advance(0.6);
  const ready = { pull: 0, offset: 0, checking: false };
  assert.deepEqual(await observed(guest), ready);
  await key(host, true);
  await advance(1.4);
  const held = await observed(guest);
  assert.equal(held.pull, 1);
  assert.ok(held.offset > 0.1);
  await advance(1.6);
  assert.deepEqual(await observed(guest), held, 'held magazine stays detached past the insertion animation length');
  await key(host, false);
  await advance(0.8);
  assert.deepEqual(await observed(guest), ready, 'the guest sees the host put the magazine back');

  await key(guest, true);
  await advance(1.4);
  assert.deepEqual(await observed(host), held, 'the host sees the guest hold the magazine');
  await guest.evaluate(() => { PL.adsWant = true; });
  await advance(0.4);
  assert.deepEqual(await observed(host), ready, 'ADS cancels the check on both clients');
  await key(guest, false);
  assert.deepEqual(rig.errors, []);
  console.log('both raid clients see held magazine detach, return and cancellation');
} finally {
  await rig.close();
}
