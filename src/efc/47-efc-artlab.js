/* L0 art style lab: the #artlab route. Loads Claudov empty (no Wardens, no Scavengers, no lobby, no raid clock) with the free SKS in first
   person, adds the lab pass (47-efc-artlab-fx.js) after the engine's finalPass, and shows the dial panel (F2). Settings live in
   localStorage and travel as JSON (Copy / Paste settings). Without the #artlab hash this file only registers a listener that does nothing. */
const EFC_ART = {
  active: false, open: false, split: false, force: false, frames: 0, panel: null, chip: null, pass: null,
  s: null, d: null, base: null, prev: null, filter: false, scanT: 0, freeKit: null,
};
const EFC_ART_KEY = 'efc_artlab_v1';
const EFC_ART_FOG_HALF = Math.sqrt(Math.LN2); // FogExp2 reaches 50 % at this / density metres

/* The dials: [key, group, label, kind, range or options, help]. 'range' is [min, max, step]. Groups follow the owner's brief. */
const EFC_ART_DIALS = [
  ['scale', 'Retro / PS1', 'Internal resolution', 'range', [0.1, 1, 0.01], 'Share of the screen resolution; upscaled nearest-neighbour (pixelation)'],
  ['levels', 'Retro / PS1', 'Colour levels per channel', 'range', [2, 256, 1], '256 = off. Fewer levels posterise the gradients'],
  ['dither', 'Retro / PS1', 'Dither pattern', 'select', ['off', 'bayer2', 'bayer4', 'bayer8', 'halftone'], 'Ordered dither used for posterising and for the shadow tint dots'],
  ['ditherStrength', 'Retro / PS1', 'Dither strength', 'range', [0, 1, 0.01], ''],
  ['ditherCell', 'Retro / PS1', 'Dither cell (screen px)', 'range', [1, 8, 1], 'Size of one dither cell; the halftone dot pitch is three cells'],
  ['tint', 'Retro / PS1', 'Shadow tint colour', 'color', null, 'Dark areas go towards this colour instead of black'],
  ['tintAmount', 'Retro / PS1', 'Shadow tint amount', 'range', [0, 1, 0.01], ''],
  ['texFilter', 'Retro / PS1', 'Texture filtering', 'select', ['game', 'nearest'], 'game = the engine\'s own (linear, mipmaps, anisotropy)'],
  ['snap', 'Retro / PS1', 'PS1 vertex snapping', 'range', [0, 1, 0.01], 'Vertices snap to a coarse screen grid; the jitter shows in motion'],
  ['viewmodel', 'Retro / PS1', 'Viewmodel gets the retro effect', 'check', null, 'Off keeps the rifle and hands out of pixelation, dither and snapping'],
  ['bloomStrength', 'Lens', 'Bloom strength', 'range', [0, 3, 0.01], 'The engine\'s bloom pass'],
  ['bloomThreshold', 'Lens', 'Bloom threshold', 'range', [0, 1.5, 0.01], ''],
  ['bloomRadius', 'Lens', 'Bloom radius', 'range', [0, 1.5, 0.01], ''],
  ['dirt', 'Lens', 'Dirty lens', 'range', [0, 2, 0.01], 'Procedural specks, smudges and short streaks, lit by bright light and bloom'],
  ['streak', 'Lens', 'Spectral streak', 'range', [0, 2, 0.01], 'Rainbow band where strong light grazes the lens'],
  ['fisheye', 'Lens', 'Fisheye / barrel', 'range', [0, 1, 0.01], 'Bulges the centre and squeezes the edges'],
  ['fov', 'Lens', 'Field of view (degrees)', 'range', [40, 120, 1], 'Horizontal options go up to 80 in the game; the lab goes to 120'],
  ['aberration', 'Lens', 'Chromatic aberration', 'range', [0, 1, 0.01], 'Colour fringes towards the edges'],
  ['vignette', 'Lens', 'Vignette', 'range', [0, 1, 0.01], ''],
  ['grain', 'Lens', 'Film grain', 'range', [0, 1, 0.01], ''],
  ['exposure', 'Colour', 'Exposure', 'range', [0.25, 3, 0.01], ''],
  ['contrast', 'Colour', 'Contrast', 'range', [0.5, 2, 0.01], ''],
  ['saturation', 'Colour', 'Saturation', 'range', [0, 2, 0.01], ''],
  ['fogColor', 'Colour', 'Fog colour', 'color', null, ''],
  ['fogDistance', 'Colour', 'Fog half distance (m)', 'range', [5, 600, 1], 'Distance at which the fog hides half of the scene'],
];
const EFC_ART_FIXED = {
  scale: 1, levels: 256, dither: 'off', ditherStrength: 1, ditherCell: 1, tint: '#1f2a55', tintAmount: 0, texFilter: 'game', snap: 0, viewmodel: true,
  dirt: 0, streak: 0, fisheye: 0, aberration: 0, vignette: 0, grain: 0, exposure: 1, contrast: 1, saturation: 1,
};
/* Presets: partial settings over the defaults (the fixed values above plus the map's bloom, fog and the player's FOV) */
const EFC_ART_PRESETS = {
  'Current game': {},
  'PS1 dither (reference)': {
    scale: 0.5, levels: 14, dither: 'bayer4', ditherStrength: 1, ditherCell: 2, tint: '#2b3a78', tintAmount: 0.55, texFilter: 'nearest', snap: 0.25,
    viewmodel: true, fisheye: 0.14, aberration: 0.12, vignette: 0.32, grain: 0.04, exposure: 1.06, contrast: 1.04, saturation: 0.92,
    fogColor: '#b9c1cc', fogDistance: 160,
  },
  'PSX heavy low-res': {
    scale: 0.28, levels: 6, dither: 'bayer4', ditherStrength: 1, ditherCell: 3, tint: '#1c2550', tintAmount: 0.7, texFilter: 'nearest', snap: 0.7,
    viewmodel: true, vignette: 0.4, saturation: 0.85, contrast: 1.08, fogColor: '#9aa3b2', fogDistance: 70,
  },
  'Modern retro (subtle)': {
    scale: 0.75, levels: 32, dither: 'bayer8', ditherStrength: 0.7, ditherCell: 1, tint: '#28355f', tintAmount: 0.3, viewmodel: false,
    dirt: 0.5, streak: 0.35, aberration: 0.25, vignette: 0.25, grain: 0.05, contrast: 1.05,
  },
  'Newsprint halftone': {
    scale: 0.6, levels: 5, dither: 'halftone', ditherStrength: 1, ditherCell: 2, tint: '#1b2a63', tintAmount: 0.6, texFilter: 'nearest',
    saturation: 0.75, contrast: 1.1, vignette: 0.3,
  },
  'Wide lens test (120 degrees)': { fov: 120, fisheye: 0.55, aberration: 0.35, vignette: 0.35, dirt: 0.6, streak: 0.5 },
};

/* ---------- Settings: defaults, validation, storage ---------- */
function efcArtDefaults() {
  const fog = scene.fog, b = bloomPass;
  return Object.assign({}, EFC_ART_FIXED, {
    bloomStrength: b ? b.strength : 0, bloomThreshold: b ? b.threshold : 1, bloomRadius: b ? b.radius : 0,
    fov: Settings.fov, fogColor: '#' + fog.color.getHexString(), fogDistance: fog.density > 0 ? EFC_ART_FOG_HALF / fog.density : 600,
  });
}
function efcArtDial(key) { return EFC_ART_DIALS.find((d) => d[0] === key); }
/* One value checked against its dial: numbers clamped, options and colours checked; anything else gives the default */
function efcArtClean(key, v, dflt) {
  const D = efcArtDial(key); if (!D) return undefined;
  const [, , , kind, r] = D;
  if (kind === 'range') { const n = +v; if (!Number.isFinite(n)) return dflt; return n === dflt ? n : Math.min(Math.max(n, Math.min(r[0], dflt)), Math.max(r[1], dflt)); }
  if (kind === 'select') return r.includes(v) ? v : dflt;
  if (kind === 'color') return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : dflt;
  if (kind === 'check') return typeof v === 'boolean' ? v : dflt;
  return dflt;
}
function efcArtMerge(over) {
  const out = Object.assign({}, EFC_ART.d);
  if (over && typeof over === 'object') for (const [k] of EFC_ART_DIALS) if (k in over) out[k] = efcArtClean(k, over[k], EFC_ART.d[k]);
  return out;
}
function efcArtSave() {
  try { localStorage.setItem(EFC_ART_KEY, JSON.stringify({ v: 1, settings: EFC_ART.s })); } catch (e) { /* storage unavailable: the lab still works */ }
}
function efcArtLoad() {
  try { const o = JSON.parse(localStorage.getItem(EFC_ART_KEY) || 'null'); return o && o.settings ? o.settings : null; } catch (e) { return null; }
}
function efcArtExport() { return JSON.stringify({ efcArtlab: 1, settings: EFC_ART.s }, null, 2); }
/* Accepts what Copy settings produced, or a bare settings object. Returns false (and changes nothing) on anything else */
function efcArtImport(text) {
  let o; try { o = JSON.parse(text); } catch (e) { return false; }
  const s = o && typeof o === 'object' ? (o.settings && typeof o.settings === 'object' ? o.settings : o) : null;
  if (!s || !EFC_ART_DIALS.some(([k]) => k in s)) return false;
  efcArtUse(efcArtMerge(s));
  return true;
}
function efcArtPreset(name) {
  if (!(name in EFC_ART_PRESETS)) return false;
  efcArtUse(efcArtMerge(EFC_ART_PRESETS[name]));
  return true;
}
function efcArtSet(key, v) {
  if (!efcArtDial(key)) return false;
  EFC_ART.s = Object.assign({}, EFC_ART.s, { [key]: efcArtClean(key, v, EFC_ART.d[key]) });
  efcArtSync(); efcArtSave(); efcArtPanelFill();
  return true;
}
function efcArtUse(s) { EFC_ART.s = s; efcArtSync(); efcArtSave(); efcArtPanelFill(); }

/* ---------- Applying the settings (every frame while the lab runs; cheap) ---------- */
function efcArtPostOn(S) {
  return EFC_ART.split || EFC_ART.force || S.scale < 1 || S.levels < 256 || S.dither !== 'off' || S.tintAmount > 0 || S.dirt > 0 || S.streak > 0
    || S.fisheye > 0 || S.aberration > 0 || S.vignette > 0 || S.grain > 0 || S.exposure !== 1 || S.contrast !== 1 || S.saturation !== 1;
}
function efcArtSync() {
  const S = EFC_ART.s, D = EFC_ART.d, B = EFC_ART.base, P = EFC_ART.pass;
  if (!EFC_ART.active || !S || !P || !composer) return;
  // the pass stays last in the chain, whatever rebuilt or appended to the composer
  const ps = composer.passes;
  if (ps[ps.length - 1] !== P) { if (ps.includes(P)) composer.removePass(P); composer.addPass(P); }
  P.enabled = efcArtPostOn(S);
  const u = P.mat.uniforms, retro = S.scale < 1 || S.levels < 256 || S.dither !== 'off' || S.tintAmount > 0;
  u.uScale.value = S.scale; u.uLevels.value = S.levels; u.uDither.value = ['off', 'bayer2', 'bayer4', 'bayer8', 'halftone'].indexOf(S.dither);
  u.uDStr.value = S.ditherStrength; u.uDCell.value = S.ditherCell; u.uTint.value.set(S.tint); u.uTintAmt.value = S.tintAmount;
  u.uVm.value = S.viewmodel ? 1 : 0; u.uMaskOn.value = !S.viewmodel && retro ? 1 : 0;
  u.uFish.value = S.fisheye; u.uAberr.value = S.aberration; u.uVig.value = S.vignette; u.uGrain.value = S.grain;
  u.uDirt.value = S.dirt; u.uStreak.value = S.streak; u.uExpo.value = S.exposure; u.uCon.value = S.contrast; u.uSat.value = S.saturation;
  u.uSplit.value = EFC_ART.split ? 1 : 0;
  // bloom: the engine's pass; the quality's own on/off unless the lab changes the bloom or needs it for the lens
  if (bloomPass) {
    const changed = S.bloomStrength !== D.bloomStrength || S.bloomThreshold !== D.bloomThreshold || S.bloomRadius !== D.bloomRadius;
    bloomPass.strength = changed ? S.bloomStrength : B.bloom[0]; bloomPass.threshold = changed ? S.bloomThreshold : B.bloom[1]; bloomPass.radius = changed ? S.bloomRadius : B.bloom[2];
    const q = !!(RQ.q && RQ.q.bloom);
    bloomPass.enabled = q || changed || S.dirt > 0 || S.streak > 0;
    FinalShader.uniforms.uBloom.value = q || changed ? 1 : 0;
    u.uBloomOn.value = bloomPass.enabled ? 1 : 0;
  }
  // fog and field of view: the engine's exact values while a dial is at its default
  if (S.fogColor === D.fogColor) scene.fog.color.copy(B.fogColor); else scene.fog.color.set(S.fogColor);
  scene.fog.density = S.fogDistance === D.fogDistance ? B.fogDensity : EFC_ART_FOG_HALF / Math.max(1, S.fogDistance);
  Settings.fov = S.fov;
  // vertex snapping: a grid of rows x (rows x aspect) screen cells; materials are patched once, the first time it is used
  const rows = 480 - 432 * S.snap, asp = VIEW.w / Math.max(1, VIEW.h);
  EFC_ART_SNAP.w.value.set(S.snap > 0 ? 1 : 0, rows * asp, rows);
  EFC_ART_SNAP.v.value.set(S.snap > 0 && S.viewmodel ? 1 : 0, rows * asp, rows);
  const now = performance.now(), scan = now - EFC_ART.scanT > 2000; // new objects (props, effects) are picked up every two seconds
  if (S.snap > 0 && (scan || !EFC_ART_SNAP.n)) efcArtSnapAll(P);
  const near = S.texFilter === 'nearest';
  if (near !== EFC_ART.filter || (near && scan)) { efcArtTexFilter(near); EFC_ART.filter = near; }
  if (scan) EFC_ART.scanT = now;
}
/* Everything a dial can reach, for the tests: the pass uniforms, the bloom pass, fog, FOV, the snap uniforms and the texture filter count */
function efcArtProbe() {
  const P = EFC_ART.pass, U = {};
  if (P) for (const [k, v] of Object.entries(P.mat.uniforms)) {
    const x = v.value;
    if (typeof x === 'number') U[k] = x; else if (x && x.isColor) U[k] = x.getHexString(); else if (x && x.isVector2) U[k] = [x.x, x.y];
  }
  return {
    enabled: !!(P && P.enabled), u: U,
    bloom: bloomPass ? [bloomPass.strength, bloomPass.threshold, bloomPass.radius, bloomPass.enabled, FinalShader.uniforms.uBloom.value] : null,
    fog: [scene.fog.color.getHexString(), scene.fog.density], fov: Settings.fov,
    snapW: EFC_ART_SNAP.w.value.toArray(), snapV: EFC_ART_SNAP.v.value.toArray(), nearest: EFC_ART_TEX.size,
  };
}
function efcArtLoop() {
  if (!EFC_ART.active) return;
  EFC_ART.frames++;
  try { efcArtSync(); } catch (e) { console.error('[efc] art lab', e); }
  requestAnimationFrame(efcArtLoop);
}

/* ---------- The route ---------- */
function efcArtWaitBoot() {
  const t = setInterval(() => {
    if (typeof GPUX === 'undefined' || !GPUX.booted || MATCH.state !== 'menu') return;
    clearInterval(t);
    efcArtStart().catch((e) => console.error('[efc] art lab could not start', e));
  }, 200);
}
async function efcArtStart() {
  EFC_ART.prev = { map: Settings.map, fov: Settings.fov, raidMinutes: EFC.cfg.raidMinutes };
  Settings.map = 'claudov';
  await mapEnsure('claudov');
  window.MATCH_COUNTDOWN = 0;
  EFC.cfg.raidMinutes = 24 * 60; // no raid clock worth the name: a day
  EFC_ART.active = true;
  startMatch();
  EFC.cfg.raidMinutes = EFC_ART.prev.raidMinutes;
  const fog = scene.fog;
  EFC_ART.base = { bloom: bloomPass ? [bloomPass.strength, bloomPass.threshold, bloomPass.radius] : [0, 1, 0], fogColor: fog.color.clone(), fogDensity: fog.density };
  EFC_ART.d = efcArtDefaults();
  EFC_ART.s = efcArtMerge(efcArtLoad());
  EFC_ART.pass = new EFCArtPass();
  efcArtPanelBuild();
  efcArtSync();
  requestAnimationFrame(efcArtLoop);
}
/* Leaves the lab: the player's own FOV and map come back, and the page reloads without the hash */
function efcArtRestore() {
  if (!EFC_ART.prev) return;
  Settings.fov = EFC_ART.prev.fov; Settings.map = EFC_ART.prev.map;
  try { saveSettings(); } catch (e) { /* storage unavailable */ }
}
function efcArtLeave() {
  efcArtRestore(); EFC_ART.prev = null;
  history.replaceState(null, '', location.pathname + location.search);
  location.reload();
}

/* Raid start inside the lab: every bot leaves play (after the Warden and Scavenger packages placed theirs) and the raid uses the free
   kit (the SKS), so the player's stored loadout is never put at risk. The stored free-kit choice is put back once the kit is handed out. */
efcOn('raid:placed', () => {
  if (!EFC_ART.active) return;
  for (const e of entities) {
    if (e.isPlayer || e.isRemote) continue;
    e.efcOff = true; e.off = true; e.alive = false; e.respawnT = Infinity; e.target = null;
    if (e.model) { e.model.rag = null; e.model.root.visible = false; }
  }
  const st = efcCall('stash:get');
  EFC_ART.freeKit = st ? st.freeKit === true : null;
  if (st && !st.freeKit) efcCall('stash:setFreeKit', true);
});
efcOn('raid:begin', () => {
  if (!EFC_ART.active || EFC_ART.freeKit === null) return;
  if (!EFC_ART.freeKit) efcCall('stash:setFreeKit', false);
  EFC_ART.freeKit = null;
});

/* ---------- The panel ---------- */
function efcArtEl(tag, props, ...kids) { const el = Object.assign(document.createElement(tag), props || {}); el.append(...kids); return el; }
function efcArtFmt(v) { return typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2)) : String(v); }
function efcArtStatus(text) { if (EFC_ART.panel) EFC_ART.panel.querySelector('.efc-art-status').textContent = text; }
function efcArtPanelBuild() {
  const css = efcArtEl('style', { textContent: `
    #efcArtlab { position: fixed; top: 8px; right: 8px; bottom: 8px; width: 340px; overflow-y: auto; z-index: 1000; padding: 10px 12px;
      background: rgba(14, 20, 22, 0.94); color: #e5e9e8; font: 12px/1.35 system-ui, sans-serif; border: 1px solid #3b4a4c; border-radius: 6px; }
    #efcArtlab[hidden] { display: none; }
    #efcArtlab h2 { font-size: 15px; margin: 0 0 6px; } #efcArtlab fieldset { border: 1px solid #334043; margin: 8px 0; padding: 4px 8px 8px; }
    #efcArtlab legend { font-weight: 600; padding: 0 4px; } #efcArtlab label { display: grid; grid-template-columns: 1fr 52px; gap: 2px 6px; margin-top: 6px; }
    #efcArtlab label > span:first-child { grid-column: 1 / -1; } #efcArtlab input[type=range], #efcArtlab select { width: 100%; }
    #efcArtlab output { text-align: right; font-variant-numeric: tabular-nums; } #efcArtlab .row { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0; }
    #efcArtlab button { font: inherit; padding: 3px 8px; background: #263234; color: #e5e9e8; border: 1px solid #4b5c5f; border-radius: 4px; cursor: pointer; }
    #efcArtlab button[aria-pressed=true] { background: #4d6b3a; } #efcArtlab :focus-visible { outline: 2px solid #f0c94a; outline-offset: 1px; }
    #efcArtlab textarea { width: 100%; height: 90px; font: 11px monospace; } #efcArtlab .efc-art-status { min-height: 1.3em; color: #b8d68f; }
    #efcArtChip { position: fixed; left: 8px; bottom: 8px; z-index: 999; font: 12px system-ui, sans-serif; }` });
  const panel = efcArtEl('aside', { id: 'efcArtlab', hidden: true });
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Art style lab');
  const presets = efcArtEl('select', { id: 'efcArtPreset' }, ...Object.keys(EFC_ART_PRESETS).map((n) => efcArtEl('option', { value: n, textContent: n })));
  presets.setAttribute('aria-label', 'Preset');
  const btn = (text, fn, id) => { const b = efcArtEl('button', { type: 'button', textContent: text }); if (id) b.id = id; b.addEventListener('click', fn); return b; };
  const split = btn('A/B split', () => { EFC_ART.split = !EFC_ART.split; split.setAttribute('aria-pressed', String(EFC_ART.split)); efcArtSync(); efcArtStatus(EFC_ART.split ? 'Left: current game. Right: styled.' : 'Split off.'); }, 'efcArtSplit');
  split.setAttribute('aria-pressed', 'false');
  const paste = efcArtEl('textarea', { id: 'efcArtPaste', hidden: true, placeholder: 'Paste the settings JSON here, then press Import' });
  paste.setAttribute('aria-label', 'Settings JSON');
  const importBtn = btn('Import', () => { if (efcArtImport(paste.value)) { efcArtStatus('Settings imported.'); paste.hidden = importBtn.hidden = true; } else efcArtStatus('That is not lab settings JSON.'); });
  importBtn.hidden = true;
  const hud = efcArtEl('input', { type: 'checkbox', id: 'efcArtHud' });
  hud.addEventListener('change', () => { const h = document.getElementById('hud'); if (h) h.style.visibility = hud.checked ? 'hidden' : ''; });
  panel.append(
    efcArtEl('h2', { textContent: 'Art style lab' }),
    efcArtEl('p', { textContent: 'F2 or Escape closes this panel; click the scene to look around again.' }),
    efcArtEl('div', { className: 'row' }, presets, btn('Apply preset', () => { efcArtPreset(presets.value); efcArtStatus('Preset: ' + presets.value); }, 'efcArtApply')),
    efcArtEl('div', { className: 'row' }, split,
      btn('Copy settings', async () => {
        const text = efcArtExport();
        try { await navigator.clipboard.writeText(text); efcArtStatus('Settings copied to the clipboard.'); }
        catch (e) { paste.hidden = false; paste.value = text; paste.select(); efcArtStatus('Clipboard blocked: the JSON is selected below, copy it with Ctrl+C.'); }
      }, 'efcArtCopy'),
      btn('Paste settings', async () => {
        try { const t = await navigator.clipboard.readText(); if (efcArtImport(t)) { efcArtStatus('Settings pasted.'); return; } } catch (e) { /* no clipboard access: use the box */ }
        paste.hidden = importBtn.hidden = false; paste.value = ''; paste.focus(); efcArtStatus('Paste the JSON into the box, then press Import.');
      }, 'efcArtPasteBtn')),
    paste, importBtn,
    efcArtEl('p', { className: 'efc-art-status' }),
  );
  panel.querySelector('.efc-art-status').setAttribute('aria-live', 'polite');
  const groups = {};
  for (const [key, group, label, kind, r, help] of EFC_ART_DIALS) {
    if (!groups[group]) { groups[group] = efcArtEl('fieldset', {}, efcArtEl('legend', { textContent: group })); panel.append(groups[group]); }
    const id = 'efcArt-' + key;
    let input;
    if (kind === 'range') {
      const D = EFC_ART.d[key];
      input = efcArtEl('input', { type: 'range', min: Math.min(r[0], D), max: Math.max(r[1], D), step: r[2] });
    } else if (kind === 'select') input = efcArtEl('select', {}, ...r.map((o) => efcArtEl('option', { value: o, textContent: o })));
    else input = efcArtEl('input', { type: kind === 'check' ? 'checkbox' : 'color' });
    input.id = id; input.dataset.key = key;
    if (help) input.title = help;
    input.addEventListener('input', () => efcArtSet(key, kind === 'check' ? input.checked : kind === 'range' ? +input.value : input.value));
    const out = efcArtEl('output', { htmlFor: id });
    const lab = efcArtEl('label', {}, efcArtEl('span', { textContent: label }), input, out);
    lab.htmlFor = id;
    groups[group].append(lab);
  }
  panel.append(efcArtEl('div', { className: 'row' },
    efcArtEl('label', {}, efcArtEl('span', { textContent: 'Hide the HUD' }), hud),
    btn('Leave the lab', efcArtLeave, 'efcArtLeave')));
  // keys typed in the panel stay in the panel (no walking while a slider has focus)
  for (const ev of ['keydown', 'keyup']) panel.addEventListener(ev, (e) => { if (e.code !== 'F2' && e.code !== 'Escape') e.stopPropagation(); });
  const chip = efcArtEl('button', { id: 'efcArtChip', type: 'button', className: 'btn', textContent: 'Art lab (F2)' });
  chip.addEventListener('click', () => efcArtToggle(true));
  document.head.append(css); document.body.append(panel, chip);
  EFC_ART.panel = panel; EFC_ART.chip = chip;
  efcArtPanelFill();
}
function efcArtPanelFill() {
  const P = EFC_ART.panel, S = EFC_ART.s; if (!P || !S) return;
  for (const input of P.querySelectorAll('[data-key]')) {
    const v = S[input.dataset.key];
    if (input.type === 'checkbox') input.checked = !!v; else if (document.activeElement !== input || input.type !== 'range') input.value = v;
    const out = input.parentElement.querySelector('output'); if (out) out.textContent = efcArtFmt(v);
  }
}
function efcArtToggle(open) {
  if (!EFC_ART.panel) return;
  EFC_ART.open = open === undefined ? !EFC_ART.open : !!open;
  EFC_ART.panel.hidden = !EFC_ART.open; EFC_ART.chip.hidden = EFC_ART.open;
  if (EFC_ART.open) {
    if (document.pointerLockElement) document.exitPointerLock(); // the guard below keeps the match from pausing
    for (const k in KEYS) KEYS[k] = false;
    efcArtPanelFill();
    const first = EFC_ART.panel.querySelector('select, button'); if (first) first.focus();
  } else if (MATCH.state === 'playing' && typeof requestLock === 'function') requestLock(true);
}
addEventListener('keydown', (e) => {
  if (!EFC_ART.active || !EFC_ART.panel) return;
  if (e.code === 'F2' || (e.code === 'Escape' && EFC_ART.open)) {
    e.preventDefault(); e.stopImmediatePropagation();
    if (!e.repeat) efcArtToggle(e.code === 'F2' ? undefined : false);
  }
}, true);
document.addEventListener('pointerlockchange', (e) => {
  if (!EFC_ART.active || !EFC_ART.panel) return;
  if (document.pointerLockElement === canvas) { if (EFC_ART.open) efcArtToggle(false); return; } // clicking the scene closes the panel
  if (EFC_ART.open) e.stopImmediatePropagation(); // the panel freed the pointer: no pause screen
}, true);
addEventListener('pagehide', () => { if (EFC_ART.active) efcArtRestore(); });

// opening #artlab from the address bar or a link on an already loaded page: reload into the lab
addEventListener('hashchange', () => { if (location.hash === '#artlab' && !EFC_ART.active) location.reload(); });
if (location.hash === '#artlab') efcArtWaitBoot();
