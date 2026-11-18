// The top bar shared by every Partisan Project page: a thin strip of dark-green Nokia LCD with the lambda mark (back to the opening
// scene), INDEX and GAME DESIGN DOC, and a small music player that drops down from one button. It replaces each page's
// own header and music controls.
//
//   import {mountTopBar} from '../shared/topbar.js';
//   mountTopBar({title: 'Weapon Workbench', scene: 'viewer', current: 'workbench'});
import {bindMusicUI} from './music-ui.js';
import {TRACKS} from './music.js';

const root = new URL('../', import.meta.url);
const href = path => new URL(path, root).href;

/**
 * @param {{title?: string, scene?: 'bench'|'viewer', current?: 'index'|'doc'|'intro'|string, overlay?: boolean, sticky?: boolean, replaceHeader?: boolean, light?: boolean}} [opts]
 *   light: the pale-green version, for the game design doc whose own bar is already dark
 *   current: which button is the page you are on (shown pressed instead of a link)
 */
export function mountTopBar({
  title = '',
  scene = 'viewer',
  current = '',
  overlay = false,
  sticky = false,
  replaceHeader = true,
  light = false,
  tracks = TRACKS,
  sound,
} = {}) {
  if (!document.querySelector('link[data-pbar]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href('shared/topbar.css');
    link.dataset.pbar = '';
    document.head.append(link);
  }
  const bar = document.createElement('nav');
  bar.className = ['pbar', overlay && 'overlay', sticky && 'sticky', light && 'light'].filter(Boolean).join(' ');
  bar.setAttribute('aria-label', 'Partisan Project');
  const link = (id, label, path, cls = '', attrs = '') =>
    current === id
      ? `<a class="${cls}" aria-current="page" ${attrs}>${label}</a>`
      : `<a class="${cls}" href="${href(path)}" ${attrs}>${label}</a>`;
  // The lambda (same shape as the favicon).
  const lambda =
    '<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="square"><path d="M8 5 25 27M17.4 16.8 8 27"/></svg>';
  bar.innerHTML =
    link(
      'intro',
      `${lambda}<span class="name">Partisan Project</span>`,
      'intro/',
      'brand',
      'title="Return to home" aria-label="Partisan Project: return to home"',
    ) +
    link('index', 'Claudov', '../') +
    link('doc', 'Weapon Workbench', 'workbench/stg44/') +
    '<span class="spacer"></span>' +
    `<span class="music-wrap"><button id="music-menu" aria-haspopup="true" aria-expanded="false" aria-controls="music-player" title="Music"><span class="dot" aria-hidden="true"></span>♪<span class="sr-only"> Music player</span></button>` +
    `<div class="player" id="music-player" role="group" aria-label="Music player" hidden>` +
    `<div class="row"><button id="music-toggle" aria-pressed="false" aria-label="Background music">Music</button></div>` +
    `<div class="tracks">${tracks.filter(t =>
      new URLSearchParams(location.search).has('campaign') ? t.id === 'campaign' : t.id !== 'campaign',
    )
      .map(t => `<button data-track="${t.id}" aria-pressed="false">${t.label || t.id}</button>`)
      .join('')}</div>` +
    `<label>Vol<input id="music-volume" type="range" min="0" max="100" step="1" value="36" aria-label="Music volume"><output id="music-level">36%</output></label></div></span>`;
  const old = replaceHeader && document.querySelector('body > header');
  if (old) old.replaceWith(bar);
  else document.body.prepend(bar);

  // The drop-down player.
  const trigger = bar.querySelector('#music-menu'),
    panel = bar.querySelector('#music-player');
  const setOpen = open => {
    panel.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
  };
  trigger.addEventListener('click', () => setOpen(panel.hidden));
  document.addEventListener('pointerdown', e => {
    if (!panel.hidden && !bar.querySelector('.music-wrap').contains(e.target)) setOpen(false);
  });
  bar.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !panel.hidden) {
      e.stopPropagation(); // closes the music menu only, not a map panel or the fight's pause behind it
      setOpen(false);
      trigger.focus();
    }
  });
  sound = bindMusicUI({scene, sound});
  // The trigger shows whether the music is on.
  const mirror = () => (bar.dataset.music = sound.prefs.on ? 'on' : 'off');
  mirror();
  sound.subscribe(mirror);
  trigger.addEventListener('click', mirror);
  panel.addEventListener('click', () => setTimeout(mirror, 0));
  return sound;
}
