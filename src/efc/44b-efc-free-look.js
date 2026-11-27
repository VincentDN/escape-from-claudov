/* Hold Alt to turn the first-person camera independently of the weapon and movement heading. */
const EFC_FREE_LOOK = { active: false, yaw: 0, pitch: 0, yawLimit: 110 * Math.PI / 180, pitchLimit: 65 * Math.PI / 180 };
const efcFreeLookRelative = new THREE.Quaternion(), efcWeaponViewEuler = new THREE.Euler();
const EFC_OMNI_AIM_YAW = Math.PI / 3, EFC_OMNI_AIM_PITCH = Math.PI / 4;

function efcOmniAimYaw(entity, yaw) {
  if (!entity.efcProne || !efcRaidMode()) return yaw;
  const turn = entity.efcProneTurn;
  const center = (turn?.bodyYaw ?? entity.yaw) + (turn?.onBack ? Math.PI : 0);
  const delta = angDiff(center, yaw);
  return yaw + clamp(delta, -EFC_OMNI_AIM_YAW, EFC_OMNI_AIM_YAW) - delta;
}

function efcOmniAimPitch(entity, pitch) {
  return entity.efcProne && efcRaidMode() ? clamp(pitch, -EFC_OMNI_AIM_PITCH, EFC_OMNI_AIM_PITCH) : pitch;
}

function efcOmniAimBlocked(entity, yaw, pitch) {
  return Math.abs(efcOmniAimYaw(entity, yaw) - yaw) > 1e-6 ||
    Math.abs(efcOmniAimPitch(entity, pitch) - pitch) > 1e-6;
}

function efcFreeLookKey(event, down) {
  if (event.code !== 'AltLeft' && event.code !== 'AltRight') return false;
  if (MATCH.state === 'playing' && pointerActive() && !CHAT.open) {
    event.preventDefault();
    KEYS[event.code] = down;
  } else if (!down) {
    KEYS[event.code] = false;
  }
  return true;
}

function efcFreeLookHeld() {
  return (KEYS.AltLeft || KEYS.AltRight) && pointerActive() && !CHAT.open && !KS.map.open &&
    !PILOT.d && !MECHA_P.me && !PL.nadeState && !playHold() && !efcCall('ui:busy');
}

function efcFreeLookReset() {
  EFC_FREE_LOOK.active = false;
  EFC_FREE_LOOK.yaw = EFC_FREE_LOOK.pitch = 0;
  vmCamera.rotation.x = vmCamera.rotation.y = 0;
}

function efcFreeLookTick(yaw, pitch) {
  const look = EFC_FREE_LOOK;
  // The weapon controller can fire before applyCamera runs on this tick.
  // Remove the prior frame's visual offset before it reads the camera.
  if (look.yaw || look.pitch) {
    camera.rotation.x -= look.pitch;
    camera.rotation.y -= look.yaw;
  }
  if (!efcFreeLookHeld()) {
    efcFreeLookReset();
    return false;
  }
  look.active = true;
  look.yaw = clamp(look.yaw + yaw, -look.yawLimit, look.yawLimit);
  look.pitch = clamp(look.pitch + pitch, -look.pitchLimit, look.pitchLimit);
  look.pitch = clamp(PL.pitch + look.pitch, -1.5, 1.5) - PL.pitch;
  PL.queued = PL.held = PL.runShot = false;
  return true;
}

function efcFreeLookCamera(entity) {
  const look = EFC_FREE_LOOK;
  const yaw = efcOmniAimYaw(entity, PL.yaw) - PL.yaw;
  const pitch = efcOmniAimPitch(entity, PL.pitch) - PL.pitch;
  if (!look.yaw && !look.pitch && !yaw && !pitch) return;
  // Transform the camera's current view relative to the weapon's actual aim.
  // This also preserves the weapon's world heading when Alt moves only the view.
  efcWeaponViewEuler.copy(camera.rotation);
  efcWeaponViewEuler.x += pitch;
  efcWeaponViewEuler.y += yaw;
  efcFreeLookRelative.setFromEuler(efcWeaponViewEuler).invert();
  camera.rotation.x += look.pitch;
  camera.rotation.y += look.yaw;
  efcFreeLookRelative.multiply(camera.quaternion);
  vmCamera.quaternion.multiply(efcFreeLookRelative);
}
