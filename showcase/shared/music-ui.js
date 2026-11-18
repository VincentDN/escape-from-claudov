// Wires the standard music controls found on Partisan Project demo pages to the shared sound layer:
//   #music-toggle (♪ button), [data-track] buttons, #music-volume slider, #music-level readout.
// Music starts on by default at a low volume; where the browser blocks autoplay it starts on the
// first click or key press. The choice persists per browser (sound-layer.js).
import './frame.js';
import {soundLayer} from './sound-layer.js';

/** @param {{scene?: 'bench' | 'viewer'}} [options] bench: the music comes out of the old radio with the camp around it; viewer: clean. */
export function bindMusicUI({scene = 'viewer', sound = soundLayer()} = {}) {
  const prefs = sound.prefs;
  const campaign = new URLSearchParams(location.search).has('campaign');
  sound.scene(campaign ? 'campaign' : scene);
  const toggle = document.querySelector('#music-toggle'),
    volume = document.querySelector('#music-volume');
  const FADE = 1.5;
  const show = () => {
    toggle?.setAttribute('aria-pressed', String(prefs.on));
    for (const b of document.querySelectorAll('[data-track]'))
      b.setAttribute('aria-pressed', String(b.dataset.track === sound.music.track));
    if (volume) volume.value = String(Math.round(prefs.volume * 100));
    const level = document.querySelector('#music-level');
    if (level) level.textContent = Math.round(prefs.volume * 100) + '%';
  };
  const save = () => {
    sound.save();
    sound.changed();
  };
  show();
  let unsubscribe = sound.subscribe(show);
  addEventListener('pagehide', () => unsubscribe());
  addEventListener('pageshow', e => {
    if (e.persisted) {
      unsubscribe = sound.subscribe(show);
      sound.scene(campaign ? 'campaign' : scene);
      show();
    }
  });

  const stopWaiting = () => {
    removeEventListener('pointerdown', firstGesture, true);
    removeEventListener('keydown', firstGesture, true);
  };
  function firstGesture(e) {
    if (e.target === toggle || e.target.closest?.('[data-track]')) return;
    stopWaiting();
    if (prefs.on) sound.start(FADE);
  }
  addEventListener('pointerdown', firstGesture, true);
  addEventListener('keydown', firstGesture, true);
  if (prefs.on)
    sound.start(FADE).then(playing => {
      if (playing) stopWaiting();
    });

  if (toggle)
    toggle.onclick = () => {
      // Music "on" but still blocked by autoplay policy: the button starts it rather than switching it off.
      if (prefs.on && !sound.music.audible()) {
        stopWaiting();
        sound.start(FADE);
        return;
      }
      prefs.on = !prefs.on;
      prefs.on ? sound.start(0.4) : sound.stop();
      stopWaiting();
      save();
      show();
    };
  for (const b of document.querySelectorAll('[data-track]'))
    b.onclick = () => {
      sound.setTrack(b.dataset.track);
      if (!prefs.on) {
        prefs.on = true;
        sound.start(0.4);
      }
      save();
      show();
    };
  if (volume)
    volume.oninput = () => {
      sound.setVolume(Number(volume.value) / 100);
      save();
      show();
    };
  return sound;
}
