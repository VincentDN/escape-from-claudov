// StG 44 (2044) bench: the build kept in the page address (rebuild, parts, rail positions, finish, wear) so a copied link reopens it.
export function readBuild(state, {SLOTS, PALETTES, RIFLES, WEAR}) {
  try {
    const saved = JSON.parse(decodeURIComponent(location.hash.slice(1)) || 'null');
    if (!saved) return;
    if (RIFLES[saved.v]) state.variant = saved.v;
    for (const k in saved.b || {}) if (SLOTS[k] && SLOTS[k].options.some(o => o.id === saved.b[k])) state.build[k] = saved.b[k];
    for (const k in saved.p || {}) if (k in state.pos && Number.isFinite(saved.p[k])) state.pos[k] = saved.p[k];
    if (PALETTES[saved.f]) state.palette = saved.f;
    if (Number.isFinite(saved.w)) WEAR.value = Math.min(1, Math.max(0, saved.w));
  } catch {
    /* a bad link falls back to the default build */
  }
}
export const writeBuild = (state, WEAR) =>
  history.replaceState(
    null,
    '',
    '#' + encodeURIComponent(JSON.stringify({v: state.variant, b: state.build, p: state.pos, f: state.palette, w: +WEAR.value.toFixed(2)})),
  );
