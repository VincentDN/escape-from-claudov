// Background music player. The "Ambient loop" track is original, synthesised live with Web Audio.
// 86 BPM, 8 bars: Am9 | Am9 | Fmaj7 | Fmaj7 | Cmaj7 | Cmaj7 | Em7 | Em7, then repeat.
// Layers: detuned saw pad, sine bass, delayed triangle arpeggio, soft kick/hat/rim, shared reverb.
// scheduleBar() is pure scheduling, so the same score renders offline for previews.
const BPM = 86,
  BEAT = 60 / BPM,
  BAR = BEAT * 4,
  BARS = 8;
const midi = n => 440 * 2 ** ((n - 69) / 12);
// Chord tones as MIDI notes (pad voicing) and the bass root.
const CHORDS = [
  {root: 45, pad: [57, 60, 64, 67, 71]}, // Am9
  {root: 41, pad: [57, 60, 64, 65, 69]}, // Fmaj7
  {root: 48, pad: [55, 59, 60, 64, 67]}, // Cmaj7
  {root: 40, pad: [55, 59, 62, 64, 67]}, // Em7
];
const ARP = [0, 2, 1, 3, 2, 4, 3, 1]; // indexes into the pad voicing, one per 8th note

function reverbImpulse(ctx, seconds = 2.8) {
  const length = Math.floor(ctx.sampleRate * seconds),
    buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  }
  return buffer;
}
function noiseBuffer(ctx) {
  const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate),
    d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

// Shared effect graph: dry + reverb + arp delay into a gentle compressor.
export function createGraph(ctx, destination) {
  const out = ctx.createDynamicsCompressor();
  out.threshold.value = -18;
  out.ratio.value = 3;
  out.connect(destination);
  const reverb = ctx.createConvolver();
  reverb.buffer = reverbImpulse(ctx);
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  reverb.connect(wet).connect(out);
  const delay = ctx.createDelay(1);
  delay.delayTime.value = BEAT * 0.75;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.38;
  const delayTone = ctx.createBiquadFilter();
  delayTone.type = 'lowpass';
  delayTone.frequency.value = 2200;
  delay.connect(delayTone).connect(feedback).connect(delay);
  delayTone.connect(out);
  delayTone.connect(reverb);
  return {ctx, out, reverb, delay, noise: noiseBuffer(ctx)};
}

function envelope(param, t, attack, peak, hold, release) {
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(peak, t + attack);
  param.setValueAtTime(peak, t + attack + hold);
  param.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
}
function voice(g, {type, freq, detune = 0, t, attack, peak, hold, release, filter, sends = []}) {
  const {ctx} = g,
    osc = ctx.createOscillator(),
    amp = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  let node = osc;
  if (filter) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filter;
    node.connect(f);
    node = f;
  }
  node.connect(amp);
  amp.connect(g.out);
  for (const s of sends) amp.connect(s);
  envelope(amp.gain, t, attack, peak, hold, release);
  osc.start(t);
  osc.stop(t + attack + hold + release + 0.05);
}
function drum(g, t, kind) {
  const {ctx} = g,
    amp = ctx.createGain();
  amp.connect(g.out);
  if (kind === 'kick') {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    o.connect(amp);
    envelope(amp.gain, t, 0.003, 0.5, 0.02, 0.3);
    o.start(t);
    o.stop(t + 0.4);
    return;
  }
  const src = ctx.createBufferSource(),
    f = ctx.createBiquadFilter();
  src.buffer = g.noise;
  src.connect(f).connect(amp);
  if (kind === 'hat') {
    f.type = 'highpass';
    f.frequency.value = 7000;
    envelope(amp.gain, t, 0.002, 0.05, 0, 0.05);
  } else {
    f.type = 'bandpass';
    f.frequency.value = 1800;
    f.Q.value = 1.2;
    amp.connect(g.reverb);
    envelope(amp.gain, t, 0.002, 0.09, 0, 0.12);
  }
  src.start(t, Math.random() * 0.5);
  src.stop(t + 0.3);
}

// Schedule bar `index` (0..7 loops) starting at time t.
export function scheduleBar(g, index, t) {
  const chord = CHORDS[Math.floor((index % BARS) / 2)],
    firstOfPair = index % 2 === 0;
  // Pad: sustained across the chord's two bars.
  if (firstOfPair)
    for (const n of chord.pad)
      for (const d of [-7, 7])
        voice(g, {
          type: 'sawtooth',
          freq: midi(n),
          detune: d,
          t,
          attack: 1.4,
          peak: 0.018,
          hold: BAR * 2 - 2,
          release: 1.6,
          filter: 900,
          sends: [g.reverb],
        });
  // Bass: root on 1 and the "and" of 2, fifth on 4.
  for (const [beat, semi, len] of [
    [0, 0, 1.4],
    [1.5, 0, 0.4],
    [3, 7, 0.8],
  ])
    voice(g, {
      type: 'sine',
      freq: midi(chord.root + semi),
      t: t + beat * BEAT,
      attack: 0.02,
      peak: 0.22,
      hold: len * BEAT * 0.6,
      release: 0.25,
      filter: 400,
    });
  // Arp: 8ths, up an octave, into the delay.
  ARP.forEach((i, k) =>
    voice(g, {
      type: 'triangle',
      freq: midi(chord.pad[i] + 12),
      t: t + (k * BEAT) / 2,
      attack: 0.005,
      peak: k % 2 ? 0.035 : 0.05,
      hold: 0.02,
      release: 0.35,
      filter: 3000,
      sends: [g.delay, g.reverb],
    }),
  );
  // Drums: soft kick on 1 and 3, rim on 4, hats on the off-beats (lighter in the first bar of a pair).
  drum(g, t, 'kick');
  drum(g, t + 2 * BEAT, 'kick');
  drum(g, t + 3 * BEAT, 'rim');
  for (let k = 0; k < 8; k++) if (k % 2 || !firstOfPair) drum(g, t + (k * BEAT) / 2, 'hat');
}
// Background tabs throttle timers to about once a second, so the synth schedules 3 s ahead
// and keeps playing while the tab is out of focus.
const LOOKAHEAD = 3;

// Tracks: an audio file (looped) or the synthesised loop above. Both play through one master
// gain, so volume and fades are shared. The file only downloads once music starts. File paths
// resolve from this module, so other pages (the workbench intro) can play them too.
export const TRACKS = [
  {
    id: 'duce',
    label: 'The Duce Puts On His Uniform',
    src: new URL('../assets/audio/duce-uniform.mp3', import.meta.url).href,
  },
  {id: 'abdulena', label: 'Abdulena', src: new URL('../assets/audio/abdulena.mp3', import.meta.url).href},
  {id: 'ambient', label: 'Ambient loop'},
  {
    id: 'campaign',
    label: 'Campaign · acoustic guitars',
    src: new URL('../assets/audio/campaign-acoustic-guitars.mp3', import.meta.url).href,
  },
];

// Handoff between pages: the workbench intro saves where the file track is before it navigates
// to the customiser, which picks up from there if it starts within a few seconds.
const HANDOFF_KEY = 'ak-music-handoff';
function resumeFrom(audio, track) {
  let saved = null;
  try {
    saved = JSON.parse(sessionStorage.getItem(HANDOFF_KEY) || 'null');
    sessionStorage.removeItem(HANDOFF_KEY);
  } catch {}
  if (saved?.track === track && Date.now() - saved.saved < 15000) audio.currentTime = saved.at;
}

// Live player: one AudioContext, switchable tracks; keeps playing in background tabs.
export class Music {
  // `route(ctx)` optionally returns the node the master gain feeds instead of the speakers
  // (the workbench plays the music through its radio chain).
  /** @param {{route?: (ctx: AudioContext) => AudioNode}} [options] */
  constructor({route} = {}) {
    this.volume = 0.36;
    this.playing = false;
    this.track = TRACKS[0].id;
    this.route = route;
  }
  setup() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.route?.(this.ctx) || this.ctx.destination);
    this.mainGain = this.ctx.createGain(); // the recording
    this.mainGain.connect(this.master);
    this.graph = null;
    this.bar = 0;
    this.next = this.ctx.currentTime + 0.1;
  }
  file() {
    return TRACKS.find(t => t.id === this.track)?.src;
  }
  // Start the current track's source (the master gain is handled by start/stop).
  play() {
    const src = this.file();
    if (src) {
      if (!this.audio) {
        this.audio = new Audio();
        this.audio.loop = true;
        this.audio.preload = 'none';
        this.ctx.createMediaElementSource(this.audio).connect(this.mainGain);
      }
      if (this.audio.src !== src) {
        this.audio.src = src;
        resumeFrom(this.audio, this.track);
      }
      return this.audio.play().then(
        () => true,
        () => false,
      ); // false: blocked until a user gesture
    } else {
      this.graph ||= createGraph(this.ctx, this.master);
      if (this.next < this.ctx.currentTime) this.next = this.ctx.currentTime + 0.05;
      this.timer ??= setInterval(() => {
        if (this.next < this.ctx.currentTime) this.next = this.ctx.currentTime + 0.05;
        while (this.next < this.ctx.currentTime + LOOKAHEAD) {
          scheduleBar(this.graph, this.bar++, this.next);
          this.next += BAR;
        }
      }, 200);
      return Promise.resolve(true);
    }
  }
  halt() {
    this.audio?.pause();
    clearInterval(this.timer);
    this.timer = null;
    this.graph?.out.disconnect(); // silence scheduled notes and reverb from the previous score
    this.graph = null;
    this.bar = 0;
    if (this.ctx) this.next = this.ctx.currentTime + 0.05;
  }
  // Resolves true once sound is actually running; false if the browser is still blocking autoplay.
  // `fade` is the fade-in time constant in seconds (about 3× that to reach full volume).
  async start(fade = 0.4) {
    this.setup();
    this.playing = true;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setValueAtTime(this.master.gain.value, this.ctx.currentTime);
    this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, fade);
    const [, source] = await Promise.all([this.ctx.resume().catch(() => {}), this.play()]);
    return this.ctx.state === 'running' && source;
  }
  stop() {
    if (!this.ctx) return;
    this.playing = false;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(0, now, 0.25);
    // Let the fade finish, then pause the source and suspend.
    setTimeout(() => {
      if (!this.playing) {
        this.halt();
        this.ctx.suspend();
      }
    }, 900);
  }
  setTrack(id) {
    if (!TRACKS.some(t => t.id === id) || id === this.track) return;
    this.track = id;
    if (!this.playing) {
      this.halt(); // also stop a source still fading out after mute
      return;
    }
    // Stop the old source before starting the new one; no delayed switch can restart a stale track.
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(0, now);
    this.halt();
    this.play();
    this.master.gain.setTargetAtTime(this.volume, now, 0.3);
  }
  // True when sound is actually coming out (not just switched on but blocked by autoplay rules).
  audible() {
    return this.playing && this.ctx?.state === 'running' && (!this.file() || (!!this.audio && !this.audio.paused));
  }
  handoff() {
    if (this.audio && !this.audio.paused)
      try {
        sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({track: this.track, at: this.audio.currentTime, saved: Date.now()}));
      } catch {}
  }
  setVolume(v) {
    this.volume = v;
    if (this.playing) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  }
}
