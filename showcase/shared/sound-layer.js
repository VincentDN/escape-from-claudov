// One sound layer for every Partisan Project page: the music player (music.js) routed through the bench's radio and
// camp graph (bench-audio.js), plus the shared on/off, volume and track preference.
//
// The site is a shell page (index.html) that creates the layer and shows every other page in a full-screen
// frame. Pages inside the frame find the shell's layer through window.parent, so the music keeps playing
// across page changes. A page opened on its own makes a layer of its own (tests, offline copies).
//
//   const sound = soundLayer();       // same object for every caller on a page
//   sound.start(1.5); sound.stop(); sound.setVolume(0.4); sound.setTrack('duce');
//   sound.scene('bench' | 'viewer')   // where the listener is: the radio with the camp around it, or the clean track;
//                                     // the switch crossfades, the music never restarts
//   sound.subscribe(fn)               // called when another control changes the preference
import {Music, TRACKS} from './music.js';
import {createBench} from './bench-audio.js';

// v4: Partisan Project v0.3. The v3 key is read once so existing volume/on-off choices carry over.
const KEY = 'parp-music-v4',
  OLD_KEY = 'ak-customiser-music-v3';
function loadPrefs() {
  const base = {on: true, volume: 0.36, track: TRACKS[0].id};
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null') || JSON.parse(localStorage.getItem(OLD_KEY) || 'null');
    return saved ? {...base, ...saved} : base;
  } catch {
    return base;
  }
}

function createLayer() {
  const prefs = loadPrefs();
  if (!TRACKS.some(t => t.id === prefs.track)) prefs.track = TRACKS[0].id;
  let bench = null,
    where = 'viewer',
    tuned = false,
    ducked = false;
  const music = new Music({route: ctx => (bench = createBench(ctx)).radioIn});
  music.setVolume(prefs.volume);
  music.setTrack(prefs.track);
  const level = () => (prefs.on ? prefs.volume : 0);
  const mix = seconds => bench?.mix(where, level(), seconds);
  const listeners = new Set();
  return {
    music,
    prefs,
    TRACKS,
    get sceneName() {
      return where;
    },
    get bench() {
      return bench;
    },
    save() {
      try {
        localStorage.setItem(KEY, JSON.stringify(prefs));
      } catch {}
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    changed() {
      for (const fn of listeners)
        try {
          fn();
        } catch {
          listeners.delete(fn); // a dead page's listener throws
        }
    },
    // Resolves true once sound is running; false while the browser still blocks autoplay.
    start(fade = 1.5) {
      const started = music.start(fade);
      // First time on the bench: the radio tunes in before the song.
      if (where === 'bench' && !tuned) {
        tuned = true;
        bench?.tune();
      }
      mix(3);
      return started;
    },
    stop() {
      music.stop();
      bench?.mix(where, 0, 0.6);
    },
    scene(name) {
      if (name === where) return;
      const wasCampaign = where === 'campaign';
      where = name;
      if (name === 'campaign' || wasCampaign) music.setTrack(name === 'campaign' ? 'campaign' : prefs.track);
      if (where === 'bench' && music.playing && !tuned) {
        tuned = true;
        bench?.tune();
      }
      mix(1.5);
    },
    setVolume(v) {
      prefs.volume = v;
      music.setVolume(v * (ducked ? 0.6 : 1));
      mix(0.3);
    },
    duck(on) {
      ducked = !!on;
      music.setVolume(prefs.volume * (ducked ? 0.6 : 1));
    },
    setTrack(id) {
      if (where === 'campaign') return; // campaign score never overwrites the saved demo selection
      prefs.track = id;
      music.setTrack(id);
    },
  };
}

/** The layer for this page: the shell's if this page runs inside it, otherwise this window's own. */
export function soundLayer() {
  try {
    const parent = /** @type {any} */ (window.parent);
    if (parent !== window && parent.parpSound) return parent.parpSound;
  } catch {} // cross-origin parent: ignore
  const w = /** @type {any} */ (window);
  w.parpSound ??= createLayer();
  return w.parpSound;
}
