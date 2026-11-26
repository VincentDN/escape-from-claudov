// Capture the first- and third-person raid weapon checks. Run after python3 build.py.
import fs from 'node:fs';
import path from 'node:path';
import { REPO } from './harness.mjs';
import { createLobby, joinLobby, launch, openPair, stepBoth, waitInMatch } from './net2.mjs';

const MAP = 'claudov';
const OUT = path.join(REPO, 'docs/weapon-check');
const WEAPONS = [
  ['ak47', 'mag', 'AK-47'],
  ['l96', 'bolt', 'L96'],
  ['sks', 'sks', 'SKS'],
  ['rem870', 'pump', 'Remington 870'],
];

const rig = await openPair({ map: MAP });
try {
  const code = await createLobby(rig.host, { map: MAP, mode: 'raid' });
  await joinLobby(rig.guest, code);
  await launch(rig.host);
  await Promise.all([waitInMatch(rig.host), waitInMatch(rig.guest)]);
  await stepBoth([rig.host, rig.guest], 1, 'PL.ent.health = 100;');
  const guestId = await rig.guest.evaluate(() => NET.me);
  await rig.host.waitForFunction((id) => !!NET.remotes.get(id)?.model, guestId, { timeout: 30000 });
  fs.mkdirSync(OUT, { recursive: true });
  for (const weapon of WEAPONS) {
    const [id, family] = weapon;
    const png = await rig.host.evaluate(([guestId, [weapon, kind, name]]) => {
      const W = 360, H = 202, LABEL = 24, times = [0, 0.35, 0.60, 1];
      const sheet = document.createElement('canvas');
      sheet.width = W * times.length;
      sheet.height = (H + LABEL) * 2;
      const ctx = sheet.getContext('2d');
      ctx.fillStyle = '#161a21';
      ctx.fillRect(0, 0, sheet.width, sheet.height);
      ctx.fillStyle = '#edf0f5';
      ctx.font = '14px system-ui, sans-serif';

      const stage = new THREE.Scene();
      stage.background = new THREE.Color().setRGB(0.25, 0.29, 0.35);
      stage.add(new THREE.HemisphereLight(0xf1f5ff, 0x8e8290, 1.0));
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
      keyLight.position.set(3, 5, -4);
      stage.add(keyLight);
      const portrait = new THREE.PerspectiveCamera(32, W / H, 0.03, 20);
      portrait.position.set(1.7, 1.50, -2.05);
      portrait.lookAt(0, 1.22, -0.15);

      const remote = NET.remotes.get(guestId);
      const root = remote.model.root;
      const parent = root.parent, pos = remote.pos.clone(), yaw = remote.yaw;
      const rendererSize = renderer.getSize(new THREE.Vector2());
      const pixelRatio = renderer.getPixelRatio();
      const vmBackground = vmScene.background;
      const colorSpace = renderer.outputColorSpace;
      const viewLight = new THREE.DirectionalLight(0xffffff, 3);
      viewLight.position.set(1.5, 2, 0.6);
      const view = vmCamera.clone();
      const capture = (scene, camera, row, column) => {
        renderer.render(scene, camera);
        const x = column * W, y = row * (H + LABEL);
        const view = row === 0 ? 'First person' : 'Third person';
        ctx.fillText(`${name} · ${view} · ${Math.round(times[column] * 100)}%`, x + 9, y + 17);
        ctx.drawImage(renderer.domElement, x, y + LABEL, W, H);
      };

      try {
        renderer.setPixelRatio(1);
        renderer.setSize(W, H, false);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        vmScene.background = stage.background;
        vmScene.add(viewLight);
        PL.ent.arms = makeArms([weapon]);
        efcWeaponCheckCancel();
        vmEquip(curW().def);
        const step = (dt) => {
          PL.ent.health = 100;
          matchTick(dt, false);
        };
        for (let i = 0; i < 12; i++) step(1 / 30);
        if (VM.curDef?.id !== weapon || efcWeaponCheckKind(curW().def) !== kind) {
          throw new Error(`Unexpected viewmodel weapon for ${weapon}`);
        }
        const duration = EFC_WEAPON_CHECK_TIMELINES[kind].dur;
        vmStartAction('raidCheck', duration, { kind });
        let elapsed = 0;
        for (const [column, fraction] of times.entries()) {
          const target = duration * fraction;
          while (target - elapsed > 1e-8) {
            const dt = Math.min(1 / 30, target - elapsed);
            step(dt);
            elapsed += dt;
          }
          if (fraction < 1 && VM.action !== 'raidCheck') {
            throw new Error(`Weapon check ended early for ${weapon} at ${fraction}`);
          }
          view.copy(vmCamera);
          view.aspect = W / H;
          view.fov = 64;
          view.rotateX(-0.30);
          view.updateProjectionMatrix();
          capture(vmScene, view, 0, column);
        }

        remote.pos.set(0, 0, 0);
        remote.yaw = 0;
        setSoldierGun(remote.model, weapon);
        stage.add(root);
        efcWeaponCheckRemote(remote, { on: true, kind });
        for (const [column, fraction] of times.entries()) {
          remote.efcWeaponCheck.start = MATCH.time - duration * fraction;
          poseSoldier(remote, 0);
          layoutSoldier(remote.model, true);
          capture(stage, portrait, 1, column);
        }
        return sheet.toDataURL('image/png').split(',')[1];
      } finally {
        efcWeaponCheckCancel();
        efcWeaponCheckRemote(remote, { on: false });
        remote.pos.copy(pos);
        remote.yaw = yaw;
        parent.add(root);
        vmScene.background = vmBackground;
        vmScene.remove(viewLight);
        renderer.outputColorSpace = colorSpace;
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(rendererSize.x, rendererSize.y, false);
      }
    }, [guestId, weapon]);
    const data = Buffer.from(png, 'base64');
    if (data.length >= 600_000) throw new Error(`${id} sheet exceeds 600 KB`);
    const file = path.join(OUT, `${family}.png`);
    fs.writeFileSync(file, data);
    console.log(`wrote ${path.relative(REPO, file)} (${data.length} bytes)`);
  }
  if (rig.errors.length) throw new Error(rig.errors.slice(0, 10).join('\n'));
} finally {
  await rig.close();
}
