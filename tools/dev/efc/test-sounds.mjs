// P2 sounds test (docs/audio-events.md): every audited event resolves to a loaded sample, no sample clips, the new packs' levels sit
// within 6 dB of their median, a full reload per family triggers its sounds in order at the choreography's times, inventory foley
// plays from events, and the game runs with the new packs missing (fallback to the engine's sounds).
// node tools/dev/efc/test-sounds.mjs   (needs a build: python3 build.py)
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { openGame, startSolo, simRun, REPO, launchEfcBrowser } from './harness.mjs';
let fails = 0, passes = 0;
const ok = (c, msg) => { if (c) passes++; else { fails++; console.error('FAIL ' + msg); } };
const launch = () => launchEfcBrowser(['--autoplay-policy=no-user-gesture-required']);
const familyCodes = { R: 'rifle', S: 'smg', P: 'pistol', N: 'sniper', T: 'shotgun' };
const shotList = fs.readFileSync(path.join(REPO, 'docs/weapon-foley-shot-list.md'), 'utf8');
const expectedFoley = [...shotList.matchAll(/^\| `(\w+)` \| ([RSPNT ]+) \| \d+ \|/gm)]
  .flatMap(([, cue, families]) => families.split(' ').map((family) => `wf_${familyCodes[family]}_${cue}`)).sort();

/* In the page: start audio, load the game packs, wait until each is ready or failed */
const bootAudio = () => (async () => {
  initAudio(); sfxBootGame();
  const keys = SFX_GAME.filter((k) => SFX_PACKS[k]);
  for (let i = 0; i < 600; i++) {
    if (keys.every((k) => SFX.state.get(k) && SFX.state.get(k).s !== 'loading')) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  return Object.fromEntries(keys.map((k) => [k, SFX.state.get(k) ? SFX.state.get(k).s : 'none']));
})();

// ---------- 1. events resolve, clipping, levels ----------
{
  const browser = await launch();
  const { page, errors } = await openGame({ browser });
  const st = await page.evaluate(bootAudio);
  ok(st.handling === 'ready' && st.ballistics === 'ready' && st.armes === 'ready' && st.foley === 'ready', 'packs ready ' + JSON.stringify(st));
  ok(st.weapon_foley === 'ready', 'weapon Foley pack ready ' + JSON.stringify(st));
  const R = await page.evaluate(() => {
    const out = { missing: [], clip: [], levels: {}, events: 0 };
    out.banks = [];
    out.recorded = Object.fromEntries([...(SFX.of.get('weapon_foley') || [])].map((id) => [id, SFX.bank.get(id).length]));
    const need = (ev, ids) => { out.events++; out.banks.push(...ids); if (!ids.some((id) => sfxHas(id))) out.missing.push(ev + ' -> ' + ids.join('|')); };
    // handling events (every EFC_HANDLING key is an event of the audit)
    for (const k of Object.keys(EFC_HANDLING)) need('handling ' + k, [EFC_HANDLING[k][0][0]]);
    for (const k of Object.keys(EFC_HANDLING)) for (const l of EFC_HANDLING[k]) { out.banks.push(l[0]); if (!sfxHas(l[0])) out.missing.push('layer ' + k + ' ' + l[0]); }
    for (const p of ['handling', 'ballistics', 'weapon_foley']) out.banks.push(...(SFX.of.get(p) || []));
    for (const id of ['f_magout_rifle', 'f_magout_smg', 'f_magout_pistol', 'f_magin_rifle', 'f_magin_smg', 'f_magin_pistol', 'f_slap', 'f_charge_rifle', 'f_slide_pistol', 'f_bolt', 'f_pump', 'f_shell', 'f_draw', 'f_stow', 'f_ads', 'f_dry', 'f_pickup']) need('old ' + id, [id]);
    for (const k of ['knife', 'pin', 'spoon', 'throw', 'windup', 'magdrop']) need('engine ' + k, [mechId(k, 'rifle')]);
    // firing per sound profile: first person, near, far, suppressed
    for (const [k, S] of Object.entries(GUNSND)) {
      if (k.endsWith('_s')) continue;
      need('fire pov ' + k, [S.pov2 || 'g_' + S.bank + '_pov']); need('fire near ' + k, ['g_' + S.bank + '_near']); need('fire far ' + k, ['g_far_' + S.cls]);
    }
    for (const id of ['g_sup_near', 'g_sup_far', 'g_sup_pistol_pov', 'g_sup_rifle_pov', 'f_shells', 'pt_ric', 'i_ric', 'pt_flyby', 'i_whiz']) need(id, [id]);
    for (const sf of ['concrete', 'dirt', 'grass', 'snow', 'wood', 'boards', 'metal', 'grating']) need('casing ' + sf, [sfxCasingId(sf)]);
    // clipping: every sample of every loaded bank used above, plus the new packs
    const used = new Set(out.banks);
    const stat = (e) => {
      const d = e.b.getChannelData(0), sr = e.b.sampleRate, i0 = Math.floor(e.o * sr), n = Math.min(d.length - i0, Math.ceil(e.d * sr));
      let pk = 0; const env = new Float32Array(n), w = Math.round(sr * 0.005); let acc = 0;
      const a = new Float32Array(n); for (let i = 0; i < n; i++) { a[i] = Math.abs(d[i0 + i]); if (a[i] > pk) pk = a[i]; }
      for (let i = 0; i < n + w; i++) { if (i < n) acc += a[i]; if (i - w >= 0) acc -= a[i - w]; const j = i - (w >> 1); if (j >= 0 && j < n) env[j] = acc / w; }
      let em = 0; for (let i = 0; i < n; i++) if (env[i] > em) em = env[i];
      let s = 0, c = 0; for (let i = 0; i < n; i++) if (env[i] > em * 0.05) { s += d[i0 + i] * d[i0 + i]; c++; }
      return { pk: 20 * Math.log10(pk + 1e-12), rms: 10 * Math.log10(s / Math.max(1, c) + 1e-12) };
    };
    for (const g of used) for (const [i, e] of (SFX.bank.get(g) || []).entries()) { const s = stat(e); if (s.pk >= 0) out.clip.push(g + '#' + i + ' ' + s.pk.toFixed(2)); }
    for (const p of ['handling', 'ballistics', 'weapon_foley']) {
      const L = []; for (const g of SFX.of.get(p) || []) for (const [i, e] of SFX.bank.get(g).entries()) L.push([g + '-' + (i + 1), stat(e)]);
      const sorted = L.map((x) => x[1].rms).sort((a, b) => a - b), med = sorted[sorted.length >> 1];
      const tolerance = p === 'weapon_foley' ? 2 : 6;
      out.levels[p] = { n: L.length, median: +med.toFixed(1), tolerance, out: L.filter((x) => Math.abs(x[1].rms - med) > tolerance).map((x) => x[0] + ' ' + x[1].rms.toFixed(1)),
        spread: +(sorted[sorted.length - 1] - sorted[0]).toFixed(1), maxPeak: +Math.max(...L.map((x) => x[1].pk)).toFixed(2) };
    }
    return out;
  });
  ok(!R.missing.length, 'events without a loaded sample: ' + R.missing.join(', '));
  ok(!R.clip.length, 'clipping samples: ' + R.clip.join(', '));
  ok(expectedFoley.length === 76 && Object.keys(R.recorded).sort().join() === expectedFoley.join() &&
     Object.values(R.recorded).every((count) => count === 4), 'every shot-list bank loads four takes');
  for (const [p, L] of Object.entries(R.levels)) {
    ok(L.n > 0 && !L.out.length, `${p}: levels more than ${L.tolerance} dB from the median ${L.median} dB: ${L.out.join(', ')}`);
    console.log(`${p}: ${L.n} samples, active RMS median ${L.median} dBFS, spread ${L.spread} dB, highest peak ${L.maxPeak} dBFS`);
  }
  console.log(`${R.events} audited events resolve to a loaded sample`);

  // ---------- 2. reload choreography timing, one weapon per family ----------
  await startSolo(page);
  await simRun(page, 1, 'PL.ent.health = 100;');
  const holster = await page.evaluate(() => {
    const player = PL.ent, arms = player.arms;
    const fam = VM.curDef?.fam || 'rifle';
    EFC_SND.log = [];
    const target = arms.slots.findIndex((_, i) => i !== arms.cur);
    const started = ctlSwitch(player, target);
    const repeated = ctlSwitch(player, target);
    efcEmit('tick', 1 / 30);
    const takes = EFC_SND.log.filter((event) => event.kind === 'stow').map((event) => event.id);
    EFC_SND.log = null;
    arms.switching = 0;
    return { mode: MATCH.mode, started, repeated, takes, fam };
  });
  ok(holster.mode === 'raid' && holster.started && !holster.repeated && holster.takes.join() === `wf_${holster.fam}_stow`,
    'Raid switch plays the holster once ' + JSON.stringify(holster));
  const T = await page.evaluate(() => {
    const rec = [], orig = efcHandlingPlay;
    efcHandlingPlay = (kind, delay, pos, fam) => { const r = orig(kind, delay, pos, fam); rec.push({ kind, delay: delay || 0, ts: VM.rlS, played: r, at: rec.at }); return r; };
    EFC_SND.log = [];
    const SND = { magout: ['magout'], insert: ['magin', 'slap'], slide: ['charge'], catch: ['charge'], boltsnd: ['bolt'], boltfwd: ['charge'], shellin: ['shell'], draw: ['draw'], pumpsnd: ['pump'] };
    const res = [];
    const run = (wk, name, empty, table) => {
      const def = WEAPONS[wk]; vmEquip(def); VM.action = null;
      rec.length = 0; EFC_SND.log.length = 0;
      const D = { empty }, dt = 1 / 240, n = Math.ceil(table.dur / dt);
      for (let i = 0; i <= n; i++) { rec.at = i * dt; vmChoreo(name, Math.min(1, (i * dt) / table.dur), D, VM.curDef, VM.cur); }
      const exp = [];
      for (const [t0, ev] of table.ev) for (const k of SND[ev] || []) exp.push({ k, t0 });
      const got = rec.map((r) => r.kind), want = exp.map((e) => e.k);
      // sound time on the choreography clock: the clock at the firing step, plus the call's delay
      const late = exp.map((e, i) => (rec[i] ? +(rec[i].ts - e.t0).toFixed(3) : null));
      // decisive transient of click, clunk and hit takes: first sample at half the take's peak, in seconds after the take's start
      const attack = (e) => { const d = e.b.getChannelData(0), sr = e.b.sampleRate, i0 = Math.floor(e.o * sr), n = Math.min(d.length - i0, Math.ceil(e.d * sr));
        let m = 0; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(d[i0 + i])); for (let i = 0; i < n; i++) if (Math.abs(d[i0 + i]) >= m * 0.5) return i / sr; return 0; };
      const firstPk = EFC_SND.log.filter((l) => /^hf_(click|clunk|hit)$|^wf_/.test(l.id)).map((l) => +(attack(l.e) / l.rate).toFixed(4));
      const banks = EFC_SND.log.map((l) => l.id);
      res.push({ wk, name, empty, want, got, played: rec.every((r) => r.played), late, firstPk, banks });
    };
    const F = { rifle: 'm4', smg: 'mp5', pistol: 'm9', sniper: 'l96' };
    for (const [fam, wk] of Object.entries(F)) {
      const def = WEAPONS[wk], R0 = RELOAD[def.rig || def.fam];
      run(wk, 'reload', false, R0.norm); run(wk, 'reload', true, R0.empty);
    }
    run('l96', 'bolt', false, RELOAD.boltAction);
    run('m82', 'reload', true, RELOAD.rifle.empty);
    run('m1014', 'shellStart', true, RELOAD.shotgun.shellStart); run('m1014', 'shell', true, RELOAD.shotgun.shell); run('m1014', 'shellEnd', true, RELOAD.shotgun.shellEnd);
    run('rem870', 'shellEnd', true, RELOAD.shotgun.shellEnd);
    efcHandlingPlay = orig; EFC_SND.log = null;
    return res;
  });
  const STEP = 1 / 240 * 3; // the choreography clock runs up to about 2.5 times real time (allure)
  for (const r of T) {
    const tag = `${r.wk} ${r.name}${r.empty ? ' (empty)' : ''}`;
    ok(r.got.join() === r.want.join(), `${tag}: order ${r.got.join()} expected ${r.want.join()}`);
    ok(r.played, `${tag}: an event fell back to the engine`);
    ok(r.late.every((d) => d !== null && d >= 0 && d < STEP), `${tag}: sound vs choreography time (s) ${r.late.join(', ')}`);
    ok(r.firstPk.every((p) => p <= 0.015), `${tag}: decisive transient later than 15 ms into the take: ${r.firstPk.join(', ')}`);
    console.log(`${tag}: ${r.got.join(' > ')} at +${Math.max(0, ...r.late.filter((x) => x !== null)).toFixed(3)} s at most, ${r.banks.length} layers`);
  }
  const binding = (wk, name) => T.find((t) => t.wk === wk && t.name === name && (name !== 'reload' || t.empty))?.banks || [];
  ok(binding('m9', 'reload').includes('wf_pistol_slide_release'), 'pistol empty reload plays slide release');
  ok(binding('l96', 'bolt').join() === 'wf_sniper_bolt_back,wf_sniper_bolt_forward', 'bolt opening and closing use separate banks');
  ok(binding('m82', 'reload').includes('wf_sniper_charge'), 'semiautomatic sniper uses charging bank');
  ok(binding('m1014', 'shellEnd').includes('wf_shotgun_charge') && binding('rem870', 'shellEnd').includes('wf_shotgun_pump'), 'semiautomatic tube shotgun and pump use separate banks');

  const magazine = await page.evaluate(() => {
    const playReload = (wk) => {
      const def = WEAPONS[wk], table = RELOAD[def.rig || def.fam].norm;
      vmEquip(def); VM.action = null; EFC_SND.log = [];
      const data = { empty: false }, steps = Math.ceil(table.dur * 240);
      for (let i = 0; i <= steps; i++) vmChoreo('reload', Math.min(1, i / (240 * table.dur)), data, VM.curDef, VM.cur);
      return EFC_SND.log;
    };
    const incompleteId = 'wf_rifle_magout', saved = SFX.bank.get(incompleteId);
    SFX.bank.set(incompleteId, saved.slice(0, 1));
    const incomplete = playReload('m4').map((entry) => entry.id);
    SFX.bank.set(incompleteId, saved);
    const check = ({ id, kind, t, e, rate }) => {
      const samples = e.b.getChannelData(0), sr = e.b.sampleRate;
      const start = Math.round(e.o * sr), end = Math.min(samples.length, start + Math.round(e.d * sr));
      let peak = 0, attack = 0;
      for (let i = start; i < end; i++) peak = Math.max(peak, Math.abs(samples[i]));
      for (let i = start; i < end; i++) if (Math.abs(samples[i]) >= peak / 2) { attack = (i - start) / sr / rate; break; }
      return { id, kind, t, attack, peak };
    };
    const clips = Object.fromEntries(['m4', 'mp5', 'm9', 'l96'].map((wk) => [WEAPONS[wk].fam, playReload(wk).map(check)]));
    const bankSizes = {};
    for (const fam of Object.keys(clips)) for (const cue of ['magout', 'magin', 'slap']) {
      const id = 'wf_' + fam + '_' + cue;
      const entries = SFX.bank.get(id);
      bankSizes[id] = { takes: entries?.length, varies: sfxPick(id) !== sfxPick(id) };
    }
    EFC_SND.log = null;
    return { incomplete, clips, bankSizes };
  });
  const ids = (fam) => ['magout', 'magin', 'slap'].map((cue) => 'wf_' + fam + '_' + cue);
  ok(magazine.incomplete.join() === 'hf_click,hf_handle,wf_rifle_magin,wf_rifle_slap', 'an incomplete bank retains shared reload Foley');
  ok(Object.values(magazine.bankSizes).every(({ takes, varies }) => takes === 4 && varies), 'four non-repeating takes for each magazine bank ' + JSON.stringify(magazine.bankSizes));
  for (const [fam, clips] of Object.entries(magazine.clips)) {
    ok(clips.map((clip) => clip.id).join() === ids(fam).join(), fam + ' reload plays each recorded cue in order ' + JSON.stringify(clips));
    ok(clips.every(({ attack, peak }) => attack >= 0 && attack <= 0.015 && peak > 0 && peak < 1), fam + ' reload attacks within 15 ms and does not clip');
    ok(clips.length === 3 && Math.abs(clips[2].t - clips[1].t - 0.05) < 0.005, fam + ' slap follows seating by 50 ms');
  }
  console.log('Batch A magazine coverage: ' + Object.keys(magazine.bankSizes).length + ' banks of four');

  // ---------- 3. inventory foley from events; sounds off restore the engine path ----------
  const I = await page.evaluate(() => {
    EFC_SND.log = []; EFC_SND.last = {}; EFC_SND.invLast = -1;
    efcEmit('loot:give', { id: 'med_bandage', n: 1 }, 'x');
    const take = EFC_SND.log.filter((l) => l.kind === 'inv_take').length;
    const inv = { bag: [{ id: 'med_bandage', n: 2 }, { id: 'w_m4', n: 1 }], slots: { primary: null } };
    const a = efcSndInvSnap(inv);
    const eq = (inv.slots.primary = inv.bag.pop(), efcSndInvDiff(a, efcSndInvSnap(inv)));
    const b = efcSndInvSnap(inv); inv.bag[0].n = 1; const med = efcSndInvDiff(b, efcSndInvSnap(inv));
    const c = efcSndInvSnap(inv); inv.slots.primary = null; const drop = efcSndInvDiff(c, efcSndInvSnap(inv));
    const d = efcSndInvSnap(inv); inv.bag.push({ id: 'w_m4', n: 1 }); inv.slots.primary = { id: 'w_ak47', n: 1 }; inv.slots.primary = null; const un = efcSndInvDiff(c, efcSndInvSnap(inv));
    const gap = () => { EFC_SND.invLast = -1; }; // the shared inventory gap (see the gesture loop below)
    gap(); efcEmit('ui:panel', true, 'loot', 'x'); const search = EFC_SND.log.filter(l => l.kind === 'inv_search').length;
    gap(); efcEmit('ui:panel', true, 'inv');
    gap(); efcEmit('ui:panel', false, 'inv');
    const item = { id: 'w_ak47', n: 1 };
    // AU.ctx.currentTime does not move inside one evaluate: clear the shared gap so each cue is heard on its own
    for (const gesture of ['pick', 'place', 'rotate', 'refuse', 'split', 'equip', 'mount', 'unmount']) { EFC_SND.invLast = -1; EFC_SND.last = {}; efcEmit('ui:inventory-gesture', gesture, item); }
    const gestures = [...new Set(EFC_SND.log.map(l => l.kind))];
    // a fast drag in one instant: pick, rotate and place give one cue; a refusal right after is still heard
    EFC_SND.log = []; EFC_SND.invLast = -1; EFC_SND.last = {};
    for (const gesture of ['pick', 'rotate', 'place']) efcEmit('ui:inventory-gesture', gesture, item);
    const burst = new Set(EFC_SND.log.map(l => l.kind)).size;
    efcEmit('ui:inventory-gesture', 'refuse', item);
    const refused = EFC_SND.log.some(l => l.kind === 'inv_refuse');
    EFC_SND.on = false; const off = efcHandlingPlay('magin', 0, null, null); EFC_SND.on = true;
    EFC_SND.log = null;
    return { take, eq, med, drop, un, search, gestures, burst, refused, off, d: !!d };
  });
  ok(I.take > 0 && I.search > 0 && ['inv_open', 'inv_close', 'pickup', 'inv_drop', 'inv_rotate', 'inv_refuse', 'inv_split',
    'inv_equip', 'inv_mount', 'inv_unmount'].every(kind => I.gestures.includes(kind)), 'inventory actions play handling cues ' + JSON.stringify(I));
  ok(I.burst === 1 && I.refused, 'a fast drag plays one cue, a refusal is always heard ' + JSON.stringify({ burst: I.burst, refused: I.refused }));
  ok(I.eq === 'inv_equip' && I.med === 'inv_med' && I.drop === 'inv_drop' && I.un === 'inv_unequip', 'inventory diffs ' + JSON.stringify(I));
  ok(I.off === false, 'sounds off: the engine plays');
  // audition page (dist/index.html#sounds): every button plays without an error
  const A = await page.evaluate(async () => {
    efcAudOpen(); EFC_SND.log = [];
    const played = []; const orig = sfxPlay; sfxPlay = (id, ...a) => { played.push(id); return orig(id, ...a); };
    const btns = () => Array.from(document.querySelectorAll('#efcAud button[data-a]'));
    let n = 0;
    for (const [w] of EFC_AUD.weapons) {
      document.querySelector(`#efcAud button[data-w="${w}"]`).click();
      for (const b of btns()) { b.click(); n++; }
    }
    sfxPlay = orig; EFC_SND.log = null; document.getElementById('efcAud').remove();
    return { n, played: played.length, kinds: new Set(played).size, pt: played.filter((i) => /^(hf_|pt_|g_pt_|f_casing)/.test(i)).length,
      recorded: [...new Set(played.filter((i) => i.startsWith('wf_')))].sort() };
  });
  ok(A.n > 100 && A.played > A.n && A.pt > 0, 'audition page buttons ' + JSON.stringify(A));
  ok(A.recorded.join() === expectedFoley.join(), 'audition reaches every recorded bank');
  console.log(`audition page: ${A.n} buttons pressed, ${A.played} samples played from ${A.kinds} banks`);
  ok(!errors.length, 'page errors: ' + errors.slice(0, 5).join('\n'));
  await browser.close();
}

// ---------- 4. fallback: the new packs missing ----------
{
  const browser = await launch();
  const { page, errors } = await openGame({ browser });
  await page.evaluate(() => { delete SFX_PACKS.handling; delete SFX_PACKS.ballistics; delete SFX_PACKS.weapon_foley; });
  const st = await page.evaluate(bootAudio);
  ok(!st.handling && st.foley === 'ready', 'fallback packs ' + JSON.stringify(st));
  await startSolo(page);
  const ran = await simRun(page, 10, 'PL.ent.health = 100;');
  const F = await page.evaluate(() => {
    const ids = [], orig = sfxPlay;
    sfxPlay = (id, ...a) => { ids.push(id); return orig(id, ...a); };
    const def = WEAPONS.m4;
    armsW(PL.ent).def = def; // fallback bank selection reads the equipped weapon
    vmEquip(def);
    const T = RELOAD.rifle.empty, D = { empty: true };
    for (let i = 0; i <= 240 * T.dur; i++) vmChoreo('reload', Math.min(1, i / 240 / T.dur), D, VM.curDef, VM.cur);
    sfxGun('sniper', null, PL.ent); sfxWhiz(PL.ent.pos.clone()); sfxCasing('wood', null, AU.ctx.currentTime);
    sfxPlay = orig;
    return ids;
  });
  ok(ran >= 9, 'match runs without the new packs: ' + ran);
  ok(F.includes('f_magout_rifle') && F.includes('f_magin_rifle') && !F.some((i) => /^hf_|^pt_|^g_pt_|casing_wood/.test(i)), 'engine sounds play: ' + F.join(','));
  ok(F.includes('g_sniper_pov') && F.includes('f_brass'), 'engine shot and casing play');
  ok(!errors.length, 'page errors (fallback): ' + errors.slice(0, 5).join('\n'));
  await browser.close();
}

// ---------- 5. download size ----------
const sfxDir = path.join(REPO, 'dist/sfx');
const weaponFoley = fs.readdirSync(sfxDir).find((name) => /^weapon_foley\./.test(name));
const weaponBytes = weaponFoley ? fs.statSync(path.join(sfxDir, weaponFoley)).size : 0;
const foleyDir = path.join(REPO, 'assets/sfx/weapon_foley');
const takeFiles = fs.readdirSync(foleyDir).filter((name) => name.endsWith('.mp3')).sort();
const expectedTakes = expectedFoley.flatMap((bank) => ['01', '02', '03', '04'].map((take) => `${bank}_${take}.mp3`)).sort();
const takeHashes = new Set(takeFiles.map((name) => createHash('sha256').update(fs.readFileSync(path.join(foleyDir, name))).digest('hex')));
const ledger = JSON.parse(fs.readFileSync(path.join(REPO, 'assets/sfx/credits.json'), 'utf8'));
const credits = ledger.sons.filter((entry) => entry.pack === 'weapon_foley');
ok(takeFiles.join() === expectedTakes.join() && takeHashes.size === 304, '304 distinct shot-list assets');
ok(credits.map((entry) => entry.id + '.mp3').sort().join() === expectedTakes.join() && credits.every((entry) => ledger.sources[entry.source]), 'every take has provenance');
ok(weaponBytes > 0 && weaponBytes < 2 * 1024 * 1024, 'weapon Foley download budget ' + weaponBytes);
console.log(`weapon Foley download: ${weaponBytes} bytes, 2 MiB budget`);
const added = fs.readdirSync(sfxDir).filter((f) => /^(handling|ballistics|weapon_foley)\./.test(f)).reduce((s, f) => s + fs.statSync(path.join(sfxDir, f)).size, 0);
ok(added > 0 && added < 3 * 1024 * 1024, 'added download ' + added);
console.log(`added download: ${(added / 1024).toFixed(0)} KB (handling, ballistics and weapon Foley)`);
console.log(`${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
