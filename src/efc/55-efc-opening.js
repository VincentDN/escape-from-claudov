/* Partisan opening scene behind the native menu. The engine owns navigation and audio. */
const EFC_OPENING = { frame: null, ready: false };
const EFC_DEV = { taps: 0, health: false, timer: false };
function efcOpeningHide() {
  if (EFC_OPENING.frame) EFC_OPENING.frame.hidden = true;
  $('menuBg').classList.remove('intro-ready');
}
function efcOpeningScene() {
  if (UI.screen !== 'main' || UI.busy || Settings.gfxSafe || (window.EFC_TEST && !window.EFC_TEST_OPENING) || location.protocol === 'file:' || location.hash === '#bench') {
    efcOpeningHide();
    return false;
  }
  const bg = $('menuBg');
  if (!EFC_OPENING.frame) {
    const frame = document.createElement('iframe');
    frame.id = 'efcIntroFrame';
    frame.title = 'Partisan workbench scene';
    frame.tabIndex = -1;
    frame.src = 'showcase/intro/';
    EFC_OPENING.frame = frame;
    bg.append(frame);
  }
  EFC_OPENING.frame.hidden = false;
  if (!EFC_OPENING.ready) return false;
  bg.classList.remove('gl');
  bg.classList.add('intro-ready');
  MBG.live = false; MBG.drawn = '';
  return true;
}
addEventListener('message', event => {
  if (event.origin === location.origin && event.source === EFC_OPENING.frame?.contentWindow && event.data?.type === 'claudov-opening-ready') EFC_OPENING.ready = true;
});
addEventListener('pointermove', event => {
  const frame = EFC_OPENING.frame;
  if (!mbgMotion() || !EFC_OPENING.ready || !frame || frame.hidden) return;
  frame.contentWindow.postMessage({ type: 'claudov-opening-look', x: event.clientX / innerWidth * 2 - 1, y: event.clientY / innerHeight * 2 - 1 }, location.origin);
}, { passive: true });

function efcDevActive(cheat) { return !MATCH.online && MATCH.state === 'playing' && EFC_DEV[cheat]; }
efcOn('ui:init', () => {
  const dialog = $('efcDevMenu');
  $('efcBuild').addEventListener('click', () => {
    if (++EFC_DEV.taps !== 7) return;
    EFC_DEV.taps = 0;
    if (!dialog.open) dialog.showModal();
  });
  for (const [id, cheat] of [['efcDevHealth', 'health'], ['efcDevTimer', 'timer']]) {
    const input = $(id);
    input.addEventListener('change', () => { EFC_DEV[cheat] = input.checked; });
  }
});
