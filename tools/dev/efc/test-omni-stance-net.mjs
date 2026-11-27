// Drive the real presence exchange in both directions with the local two-client rig.
import { createLobby, joinLobby, launch, openPair, stepBoth, waitInMatch } from './net2.mjs';

const rig = await openPair({ map: 'claudov' });
try {
  const code = await createLobby(rig.host, { map: 'claudov', mode: 'raid' });
  await joinLobby(rig.guest, code);
  await launch(rig.host);
  await Promise.all([waitInMatch(rig.host), waitInMatch(rig.guest)]);
  await stepBoth([rig.host, rig.guest], 1, 'PL.ent.health = 100;');
  for (const [owner, observer] of [[rig.guest, rig.host], [rig.host, rig.guest]]) {
    const id = await owner.evaluate(() => NET.me);
    async function expectPose(state, side = 0, heading = null) {
      let local, remote;
      for (let attempt = 0; attempt < 12; attempt++) {
        await stepBoth([owner, observer], 0.2, 'PL.ent.health = 100;');
        local = await owner.evaluate(() => ({
          state: efcOmniState(PL.ent), turn: PL.ent.efcProneTurn || null,
        }));
        remote = await observer.evaluate((id) => {
          const entity = NET.remotes.get(id);
          return entity ? { state: efcOmniState(entity), turn: entity.efcProneTurn || null } : null;
        }, id);
        if (local.state !== state || remote?.state !== state) continue;
        const matched = state === 'stand' ? !local.turn && !remote.turn :
          local.turn && remote.turn && local.turn.side === side && remote.turn.side === side &&
          local.turn.onBack === remote.turn.onBack &&
          (heading === null || Math.abs(Math.sin((local.turn.bodyYaw - heading) / 2)) < 0.001) &&
          Math.abs(Math.sin((local.turn.bodyYaw - remote.turn.bodyYaw) / 2)) < 0.001;
        if (matched) {
          console.log(`PASS ${owner.efcName} -> ${observer.efcName}: ${state}${side ? '/' + side : ''}`);
          return;
        }
      }
      throw new Error(`${owner.efcName} -> ${observer.efcName}: expected ${state}/${side}, got ${JSON.stringify({ local, remote })}`);
    }

    await owner.evaluate(() => { KEYS.KeyC = true; });
    await expectPose('prone');
    await owner.evaluate(() => { KEYS.KeyC = false; PL.yaw = PL.ent.efcProneTurn.anchorYaw + Math.PI; });
    await expectPose('supine');
    await owner.evaluate(() => { KEYS.LeanL = true; });
    await expectPose('side', -1);
    await owner.evaluate(() => { KEYS.LeanL = false; KEYS.LeanR = true; });
    await expectPose('side', 1);
    await owner.evaluate(() => { KEYS.LeanR = false; PL.yaw = PL.ent.efcProneTurn.anchorYaw; });
    await expectPose('prone');
    await owner.evaluate(() => { KEYS.Space = true; });
    await expectPose('stand');
    await owner.evaluate(() => { KEYS.Space = false; });

    if (owner === rig.guest) {
      for (let direction = 0; direction < 8; direction++) {
        const heading = direction * Math.PI / 4;
        await owner.evaluate((yaw) => { PL.yaw = yaw; KEYS.KeyC = true; }, heading);
        await expectPose('prone', 0, heading);
        await owner.evaluate(() => { KEYS.KeyC = false; });
        await stepBoth([owner, observer], 0.2, 'PL.ent.health = 100;');
        await owner.evaluate(() => { KEYS.Space = true; });
        await expectPose('stand');
        await owner.evaluate(() => { KEYS.Space = false; });
      }
      console.log('PASS stance body yaw across all eight headings');
    }
  }
  if (rig.errors.length) throw new Error(rig.errors.join('\n'));
  console.log('omni stance network ok');
} finally {
  await rig.close();
}
