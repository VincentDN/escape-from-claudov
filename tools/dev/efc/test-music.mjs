// P5 music test: the files (decode, loop seams, peaks, size, credits) with ffmpeg, then the game (menu theme, raid beds, stings,
// music volume 0, Claudov harbour layer, missing files) by stepping the logic on Claudov. Exits non-zero on failure.
// node tools/dev/efc/test-music.mjs   (needs ffmpeg and a built dist/)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { openGame, startSolo, simRun, REPO, launchEfcBrowser } from './harness.mjs';

let fails = 0;
const check = (name, ok, info) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' ' + JSON.stringify(info) : '')); if (!ok) fails++; };
const DIR = path.join(REPO, 'assets/music');
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.ogg')).sort();
const LOOPS = /^(menu-theme|bed-)/;
const RATE = 48000;

// ---------- (1) files ----------
const decode = (f) => { // interleaved stereo float32 at 48 kHz
  const b = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(DIR, f), '-f', 'f32le', '-ac', '2', '-ar', String(RATE), '-'], { maxBuffer: 1 << 30 });
  return new Float32Array(b.buffer, b.byteOffset, b.byteLength >> 2);
};
const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
const rms = (s, a, n) => { let q = 0; for (let i = a * 2; i < (a + n) * 2; i++) q += s[i] * s[i]; return Math.sqrt(q / (n * 2)); };
let total = 0;
for (const f of files) {
  total += fs.statSync(path.join(DIR, f)).size;
  let s; try { s = decode(f); } catch (e) { check('(1) decodes: ' + f, false, String(e).slice(0, 200)); continue; }
  const frames = s.length / 2; let peak = 0; for (let i = 0; i < s.length; i++) peak = Math.max(peak, Math.abs(s[i]));
  check('(1) decodes: ' + f, frames > RATE, { seconds: +(frames / RATE).toFixed(1) });
  check('(1) peak below 0 dBFS: ' + f, peak < 0.999, { peakDb: +db(peak).toFixed(2) });
  if (!LOOPS.test(f)) continue;
  // loop seam: the last 50 ms run into the first 50 ms without a jump in level or in the waveform
  const n = RATE / 20, head = rms(s, 0, n), tail = rms(s, frames - n, n);
  let jump = 0, step = 0; for (let c = 0; c < 2; c++) jump = Math.max(jump, Math.abs(s[c] - s[(frames - 1) * 2 + c]));
  for (let i = 2; i < n * 4; i++) step = Math.max(step, Math.abs(s[i] - s[i - 2])); // largest sample-to-sample step near the start
  const ld = Math.abs(db(head) - db(tail));
  check('(1) loop seam has no level jump (first vs last 50 ms): ' + f, ld < 3, { headDb: +db(head).toFixed(1), tailDb: +db(tail).toFixed(1) });
  check('(1) loop seam has no waveform jump: ' + f, jump <= Math.max(step * 1.5, 0.01), { jump: +jump.toFixed(4), maxStep: +step.toFixed(4) });
  const dur = frames / RATE;
  if (f.startsWith('menu-theme')) check('(1) menu theme is 2 to 4 minutes', dur >= 120 && dur <= 240, { seconds: +dur.toFixed(1) });
}
check('(1) total under 12 MB', total < 12e6, { MB: +(total / 1e6).toFixed(2) });
const cred = JSON.parse(fs.readFileSync(path.join(DIR, 'credits.json'), 'utf8'));
const ids = new Set(cred.sons.map((x) => x.id));
check('(1) every file has a credits entry', files.every((f) => ids.has(f.slice(0, -4))), files.filter((f) => !ids.has(f.slice(0, -4))));
check('(1) every credits entry has a file and a source with url and licence', cred.sons.every((x) => files.includes(x.id + '.ogg') && cred.sources[x.source] && /^https:\/\//.test(cred.sources[x.source].url) && /^CC/.test(cred.sources[x.source].licence)));
check('(1) four beds/menu loops, four stings', files.filter((f) => LOOPS.test(f)).length === 4 && files.filter((f) => f.startsWith('sting-')).length === 4);

// ---------- (2) game ----------
const browser = await launchEfcBrowser(['--autoplay-policy=no-user-gesture-required']);
const { page, errors } = await openGame({ browser, settings: { map: 'claudov', mode: 'raid' } });
const ev = (fn, arg) => page.evaluate(fn, arg);
const KEEP = 'PL.ent.health = 100;';
const calls = () => ev(() => efcCall('music:calls'));
async function fresh() {
  await ev(() => { if (MATCH.state !== 'menu') efcCall('raid:leave'); EFCM.calls.length = 0; });
  await startSolo(page);
}

// (a) menu theme starts in the menu, through the looper, at Settings.music x volume
let r = await ev(() => { Settings.music = 0.6; Settings.volume = 1; initAudio(); for (let i = 0; i < 40; i++) musicTick(0.1); return { url: MUS.url, el: !!MUS.el, playing: MUS.el && MUS.el.playing, vol: MUS.vol, two: MUS.el && MUS.el.els.length }; });
check('(a) menu theme starts in the menu', /music\/menu-theme\.\w+\.ogg$/.test(r.url) && r.playing && r.vol > 0.3 && r.two === 2, r);
r = await ev(() => { efcCall('music:menu', false); for (let i = 0; i < 40; i++) musicTick(0.1); const o = { vol: MUS.vol, playing: MUS.el.playing }; efcCall('music:menu', true); return o; });
check('(a) radio switch (music:menu false) fades the theme out', r.vol < 0.01 && !r.playing, r);

// (b) a bed starts within 60 game seconds of the raid start, on the ducked bus, and the menu theme is off
await fresh();
let ran = await simRun(page, 60, KEEP);
r = await ev(() => ({ calls: efcCall('music:calls'), live: EFCM.live, bed: EFCM.bed && { id: EFCM.bedId, playing: EFCM.bed.playing, routed: !!EFCM.bed.g }, out: !!EFCM.out, map: CURMAP.id }));
const bed = r.calls.find((c) => c.what === 'bed');
check('(b) raid on Claudov', r.map === 'claudov' && ran >= 59, { map: r.map, ran });
check('(b) a bed starts within 60 game seconds, not at once', bed && bed.t >= 15 && bed.t <= 60, bed);
check('(b) the bed plays through the ducked mix bus', r.bed && r.bed.playing && r.bed.routed && r.out, r.bed);
r = await ev(() => { for (let i = 0; i < 40; i++) musicTick(0.1); return { vol: MUS.vol }; });
check('(b) the menu theme is silent during the raid', r.vol < 0.01, r);

// (c) harbour layer on Claudov: chains, rigging and bell scheduled into the ambience output (the map's sound pack loads asynchronously)
await page.waitForFunction(() => !!EFCM.hb, null, { timeout: 60000, polling: 200 }).catch(() => {});
await simRun(page, 45, KEEP + ' ambTick(1 / 30);'); // ambTick runs in the frame loop (sfxTick), which simRun does not step
r = await ev(() => ({ hb: !!EFCM.hb, chains: EFCM.hb ? EFCM.hb.chains.length : 0, rig: sfxHas('a_rigging'), bell: sfxHas('a_buoybell') }));
let c = await calls();
const hb = c.filter((x) => x.what === 'harbour').map((x) => x.id);
check('(c) harbour layer running on Claudov', r.hb && r.chains === 2, r);
check('(c) harbour sounds fire (chain, rigging, bell)', hb.includes('chain') && (hb.includes('a_rigging') || !r.rig) && (hb.includes('a_buoybell') || !r.bell), { hb, pack: r });

// (d) stings: late extract opening, extraction started, extracted; then the bed stops
r = await ev(() => { MATCH.timeLeft = EFC_RAID.len - 598; return efcCall('raid:state').extracts.map((x) => ({ id: x.id, open: x.open, openAt: x.openAt })); });
await simRun(page, 3, KEEP);
c = await calls();
check('(d) late extract opening sting', c.some((x) => x.what === 'sting' && x.kind === 'late'), c.filter((x) => x.what === 'sting'));
const ex = await ev(() => efcCall('raid:state').extracts.find((x) => x.open && x.openAt === 0));
const at = (x, z) => `${KEEP} PL.ent.pos.set(${x}, gy0(${x}, ${z}), ${z}); PL.ent.vel.set(0, 0, 0);`;
await simRun(page, 2, at(ex.x, ex.z));
c = await calls();
check('(d) extraction started sting', c.some((x) => x.what === 'sting' && x.kind === 'start'), c.filter((x) => x.what === 'sting'));
await simRun(page, 8, at(ex.x, ex.z));
c = await calls();
r = await ev(() => ({ state: efcCall('raid:state').state, live: EFCM.live, bed: !!EFCM.bed }));
check('(d) extracted sting', r.state === 'out' && c.some((x) => x.what === 'sting' && x.kind === 'out'), { r, stings: c.filter((x) => x.what === 'sting') });
check('(d) music stops on raid end', !r.live && !r.bed && c.some((x) => x.what === 'bedStop'), r);

// (e) killed sting, once
await fresh();
await simRun(page, 50, KEEP);
await ev(() => { const b = entities.find((e) => !e.isPlayer && e.alive); applyDamage(PL.ent, 500, b, 'test', false); });
await simRun(page, 15);
c = await calls();
check('(e) killed sting, once', c.filter((x) => x.what === 'sting' && x.kind === 'dead').length === 1, c.filter((x) => x.what === 'sting'));
r = await ev(() => ({ live: EFCM.live, bed: !!EFCM.bed }));
check('(e) music stops on death', !r.live && !r.bed, r);

// (f) music volume 0: no bed, no sting, no menu theme
await ev(() => { Settings.music = 0; });
await fresh();
await simRun(page, 90, KEEP);
const ex2 = await ev(() => efcCall('raid:state').extracts.find((x) => x.open));
await simRun(page, 10, at(ex2.x, ex2.z));
c = await calls();
check('(f) music volume 0: nothing plays', !c.some((x) => x.what === 'bed' || x.what === 'sting') && c.some((x) => x.what === 'skip'), c.map((x) => x.what + ':' + x.id));
r = await ev(() => { efcCall('raid:leave'); MATCH.state = 'menu'; for (let i = 0; i < 40; i++) musicTick(0.1); return { vol: MUS.vol, playing: MUS.el.playing }; });
check('(f) music volume 0: menu theme silent and paused', r.vol < 0.01 && !r.playing, r);

// (g) missing music files: the raid runs, nothing breaks
await ev(() => { Settings.music = 0.6; efcMusicSetUrls({ 'bed-drone': 'music/missing.ogg', 'bed-machines': 'music/missing2.ogg', 'sting-extract-start': 'music/missing3.ogg' }); });
await fresh();
ran = await simRun(page, 70, KEEP);
const ex3 = await ev(() => efcCall('raid:state').extracts.find((x) => x.open));
await simRun(page, 10, at(ex3.x, ex3.z));
await ev(() => efcMusicSetUrls({}));
await fresh();
ran += await simRun(page, 70, KEEP);
r = await ev(() => ({ state: MATCH.state, calls: EFCM.calls.length }));
check('(g) raids run with music files missing or no music table', ran > 130 && errors.length === 0, { ran, errors: errors.slice(0, 3) });

check('no page errors', errors.length === 0, errors.slice(0, 5));
await browser.close();
console.log(fails ? `${fails} FAILED` : 'all music checks passed');
process.exit(fails ? 1 : 0);
