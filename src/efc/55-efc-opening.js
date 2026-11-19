/* Partisan opening scene behind the native menu. The engine owns navigation and audio. */
const EFC_OPENING = { frame: null, ready: false, screen: null, paused: null };
const EFC_DEV = { taps: 0, health: false, timer: false, aggro: false };
function efcOpeningMotion() { return !matchMedia('(prefers-reduced-motion: reduce)').matches; }
function efcOpeningEnabled() {
  return !Settings.gfxSafe && (!window.EFC_TEST || window.EFC_TEST_OPENING) && location.protocol !== 'file:' && location.hash !== '#bench';
}
function efcOpeningHide() {
  if (EFC_OPENING.frame) EFC_OPENING.frame.hidden = true;
  EFC_OPENING.screen = null;
  $('menuBg').classList.remove('intro-ready');
}
function efcOpeningScene() {
  if (!efcOpeningEnabled()) {
    efcOpeningHide();
    return false;
  }
  const bg = $('menuBg');
  if (!EFC_OPENING.frame) {
    const frame = document.createElement('iframe');
    frame.id = 'efcIntroFrame';
    frame.title = 'Partisan workbench scene';
    frame.tabIndex = -1;
    frame.setAttribute('aria-hidden', 'true');
    frame.src = 'showcase/intro/';
    EFC_OPENING.frame = frame;
    bg.append(frame);
  }
  EFC_OPENING.frame.hidden = false;
  if (!EFC_OPENING.ready) return false;
  bg.classList.add('intro-ready');
  const paused = MAPL.state === 'loading' || UI.busy;
  if (EFC_OPENING.screen !== UI.screen || EFC_OPENING.paused !== paused) {
    EFC_OPENING.screen = UI.screen;
    EFC_OPENING.paused = paused;
    EFC_OPENING.frame.contentWindow.postMessage({ type: 'claudov-opening-screen', screen: UI.screen, paused }, location.origin);
  }
}
addEventListener('message', event => {
  if (event.origin === location.origin && event.source === EFC_OPENING.frame?.contentWindow && event.data?.type === 'claudov-opening-ready') EFC_OPENING.ready = true;
});
addEventListener('pointermove', event => {
  const frame = EFC_OPENING.frame;
  if (!efcOpeningMotion() || !EFC_OPENING.ready || !frame || frame.hidden) return;
  frame.contentWindow.postMessage({ type: 'claudov-opening-look', x: event.clientX / Math.max(1, innerWidth) * 2 - 1, y: event.clientY / Math.max(1, innerHeight) * 2 - 1 }, location.origin);
}, { passive: true });

function efcDevActive(cheat) { return !MATCH.online && MATCH.state === 'playing' && EFC_DEV[cheat]; }
function efcDevIgnorePlayer(ent) { return ent === PL.ent && efcDevActive('aggro'); }
efcProvide('dev:ignorePlayer', efcDevIgnorePlayer);
efcOn('ui:init', () => {
  const dialog = $('efcDevMenu');
  const status = $('efcDevStatus');
  $('efcBuild').addEventListener('click', () => {
    if (++EFC_DEV.taps !== 7) return;
    EFC_DEV.taps = 0;
    status.hidden = true;
    if (!dialog.open) dialog.showModal();
  });
  for (const [id, cheat] of [['efcDevHealth', 'health'], ['efcDevTimer', 'timer'], ['efcDevAggro', 'aggro']]) {
    const input = $(id);
    input.addEventListener('change', () => { EFC_DEV[cheat] = input.checked; });
  }
  $('efcDevResetStash').addEventListener('click', () => {
    if (!confirm('Replace your saved stash and loadout with starter gear? Loot you have collected will be lost.')) return;
    status.textContent = efcCall('stash:reset') ? 'Starter stash and loadout restored.' : 'Could not reset the saved stash.';
    status.hidden = false;
  });
});
