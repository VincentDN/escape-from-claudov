import assert from 'node:assert/strict';
import { openPair, createLobby, joinLobby, launch, waitInMatch, stepBoth, settle } from './net2.mjs';

const rig = await openPair({ map: 'simoun' });
try {
  const { host, guest } = rig, pages = [host, guest];
  const code = await createLobby(host, { mode: 'raid', map: 'simoun' });
  await joinLobby(guest, code);
  await launch(host);
  await Promise.all(pages.map(page => waitInMatch(page)));
  await stepBoth(pages, 0.4);
  await settle(200);
  await stepBoth(pages, 0.2);
  const sawCheck = () => guest.evaluate(() => {
    const peer = [...NET.remotes.values()].find(entity => !entity.remoteBot && !entity.netBot);
    return !!peer && !!efcWeaponCheckPose(peer);
  });
  assert.equal(await sawCheck(), true);
  await host.evaluate(() => { PL.adsWant = true; });
  await stepBoth(pages, 0.2);
  await settle(200);
  await stepBoth(pages, 0.2);
  assert.equal(await host.evaluate(() => VM.action !== 'raidCheck' && PL.ent.adsActive), true);
  assert.equal(await sawCheck(), false);
  assert.deepEqual(rig.errors, []);
  console.log('The guest sees the host weapon check start and cancel while the first aim input is handled');
} finally { await rig.close(); }
