/* A1: repeatable camera route, using the engine's per-frame performance recorder. */
const EFC_BENCH_ROUTE = [
  [-51, 26], [-56, 1], [-42, -19], [-21, -12], [-14, 16],
  [0, 51], [29, 45], [41, 27], [69, 41],
];
const EFC_BENCH_SECONDS = 90;
const EFC_BENCH_CAPTURE = { start: null, heap: null, calls: 0, triangles: 0, gpu: {}, gpuFrames: {}, alert: -1, hud: null, wardens: [] };
const efcBenchmarkHeap = () => performance.memory?.usedJSHeapSize ?? null;

function efcBenchmarkPoint(fraction) {
  const progress = clamp(fraction, 0, 1) * (EFC_BENCH_ROUTE.length - 1);
  const i = Math.min(EFC_BENCH_ROUTE.length - 2, Math.floor(progress));
  const t = progress - i, k = t * t * (3 - 2 * t);
  const a = EFC_BENCH_ROUTE[i], b = EFC_BENCH_ROUTE[i + 1];
  return [a[0] + k * (b[0] - a[0]), a[1] + k * (b[1] - a[1])];
}

function efcBenchmarkPlayer() {
  const B = EFC_BENCH_CAPTURE;
  if (B.start === null) return;
  const [x, z] = efcBenchmarkPoint((performance.now() - B.start) / (EFC_BENCH_SECONDS * 1000));
  const player = PL.ent;
  player.pos.set(x, gy0(x, z), z);
  player.vel.set(0, 0, 0);
  player.health = 100;
  if (MATCH.time - B.alert >= 1) {
    B.alert = MATCH.time;
    for (const w of B.wardens) {
      if (!w.alive) continue;
      w.lastKnown.copy(player.pos);
      w.lastSeenT = MATCH.time;
      w.chaseE = player; w.contactT = MATCH.time; w.contactD = Math.min(40, w.pos.distanceTo(player.pos));
      w.aw.set(player, 1);
      efcWardenAlert(w, player, MATCH.time);
    }
  }
}

function efcBenchmarkCamera(now) {
  if (EFC_BENCH_CAPTURE.start === null) return;
  const fraction = (now - EFC_BENCH_CAPTURE.start) / (EFC_BENCH_SECONDS * 1000);
  const [x, z] = efcBenchmarkPoint(fraction);
  const [tx, tz] = efcBenchmarkPoint(Math.min(0.997, fraction) + 0.03);
  camera.position.set(x, 10, z);
  camera.lookAt(tx === x && tz === z ? x + 3 : tx, 2.5, tz);
  VM.root.visible = false;
}

function efcBenchmarkGpu(stage, ms) {
  const B = EFC_BENCH_CAPTURE;
  if (B.start === null) return;
  B.gpu[stage] = (B.gpu[stage] || 0) + ms;
  B.gpuFrames[stage] = (B.gpuFrames[stage] || 0) + 1;
}

function efcBenchmarkReport() {
  const B = EFC_BENCH_CAPTURE;
  const values = PFR.all.slice(0, Math.min(PFR.n, PFR_MAX)).sort();
  const pct = p => values.length ? values[Math.ceil(values.length * p) - 1] : null;
  const p99 = pct(0.99), n = PFR.n;
  return {
    quality: Settings.quality, tier: RQ.tier, map: 'claudov', seconds: EFC_BENCH_SECONDS, frames: n,
    frameMedianMs: pct(0.5), frameP99Ms: p99, low1Fps: p99 ? 1000 / p99 : null,
    cpuMs: n ? PFR.cpuSum / n : null,
    cpuStageMs: Object.fromEntries(PFR_STEPS.map((name, i) => [name, n ? PFR.stepSum[i] / n : null])),
    gpuStageMs: Object.fromEntries(PFR_STEPS.map(name => [name, B.gpuFrames[name] ? B.gpu[name] / B.gpuFrames[name] : null])),
    drawCalls: n ? B.calls / n : null, triangles: n ? B.triangles / n : null,
    heapStartBytes: B.heap, heapEndBytes: efcBenchmarkHeap(),
  };
}

function efcBenchmarkFrame(now, interval) {
  const B = EFC_BENCH_CAPTURE;
  if (B.start === null || MATCH.state !== 'playing') return;
  if (interval > 0 && interval <= 1000) {
    B.calls += renderer.info.render.calls;
    B.triangles += renderer.info.render.triangles;
  }
  const elapsed = Math.floor((now - B.start) / 1000);
  B.hud.value = elapsed;
  if (elapsed < EFC_BENCH_SECONDS) return;
  EFC_BENCH_BOOT.rows.push(efcBenchmarkReport());
  B.start = null;
  sessionStorage.setItem('efc_bench_route', JSON.stringify(EFC_BENCH_BOOT));
  if (EFC_BENCH_BOOT.rows.length < EFC_BENCH_BOOT.levels.length) location.reload();
  else { B.hud.parentElement.remove(); toMenu('main'); efcBenchmarkSummary(EFC_BENCH_BOOT); }
}

function efcBenchmarkPanel(title) {
  const dialog = document.createElement('dialog');
  Object.assign(dialog.style, { maxWidth: 'min(94vw, 980px)', color: '#e5e9e8', background: '#172020', padding: '24px', zIndex: '1000' });
  const heading = document.createElement('h2'); heading.textContent = title;
  dialog.append(heading);
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}

function efcBenchmarkButton(label, action) {
  const button = document.createElement('button'); button.textContent = label;
  button.className = 'btn'; button.addEventListener('click', action);
  return button;
}

function efcBenchmarkExit() {
  sessionStorage.removeItem('efc_bench_route');
  history.replaceState(null, '', location.pathname + location.search);
  location.reload();
}

function efcBenchmarkSummary(run) {
  const panel = efcBenchmarkPanel('Claudov performance capture');
  panel.addEventListener('cancel', efcBenchmarkExit);
  const table = document.createElement('table');
  for (const values of [
    ['Quality', 'Median ms', '1% low FPS', 'CPU ms', 'GPU shadow / render ms', 'Draw calls', 'Triangles', 'Heap MB start / end'],
    ...run.rows.map(r => [r.quality, r.frameMedianMs, r.low1Fps, r.cpuMs, [r.gpuStageMs.shadow, r.gpuStageMs.render].map(n => n === null ? '—' : n.toFixed(2)).join(' / '), r.drawCalls, r.triangles,
      [r.heapStartBytes, r.heapEndBytes].map(n => n === null ? '—' : (n / 1048576).toFixed(1)).join(' / ')]),
  ]) {
    const row = table.insertRow();
    for (const value of values) row.insertCell().textContent = typeof value === 'number' ? value.toFixed(1) : value ?? '—';
  }
  panel.append(table, efcBenchmarkButton('Download JSON report', () => {
    const blob = new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'claudov-performance.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }), efcBenchmarkButton('Return to Claudov', efcBenchmarkExit));
}

async function efcBenchmarkInit() {
  const run = EFC_BENCH_BOOT;
  if (!run) {
    let last = null;
    try { last = JSON.parse(sessionStorage.getItem('efc_bench_route') || 'null'); } catch (e) { /* unavailable */ }
    if (last?.rows?.length && last.rows.length === last.levels?.length) { efcBenchmarkSummary(last); return; }
    const panel = efcBenchmarkPanel('Claudov performance capture');
    const info = document.createElement('p');
    info.textContent = 'The camera runs through Claudov for 90 seconds at each graphics quality. Keep this tab visible until the report appears.';
    panel.append(info, efcBenchmarkButton('Run all qualities', () => {
      const names = ['auto', 'high', 'medium', 'low', 'ultra'];
      const levels = [Settings.quality, ...names].filter((q, i, all) => names.includes(q) && all.indexOf(q) === i);
      sessionStorage.setItem('efc_bench_route', JSON.stringify({ map: 'claudov', levels, rows: [], gpu: GPU.name || null,
        viewport: [innerWidth, innerHeight], userAgent: navigator.userAgent, build: document.querySelector('meta[name="cod-build"]')?.content }));
      location.reload();
    }), efcBenchmarkButton('Return to Claudov', efcBenchmarkExit));
    return;
  }
  const panel = efcBenchmarkPanel('Loading Claudov');
  panel.append(efcBenchmarkButton('Cancel', efcBenchmarkExit));
  panel.addEventListener('cancel', efcBenchmarkExit);
  try {
    await mapEnsure('claudov');
    panel.remove();
    window.MATCH_COUNTDOWN = 0;
    LOCK.fallback = true;
    startMatch();
    EFC_BENCH_CAPTURE.wardens = entities.filter(e => e.alive && e.squad === 'w');
    EFC_BENCH_CAPTURE.hud = document.createElement('progress');
    EFC_BENCH_CAPTURE.hud.max = EFC_BENCH_SECONDS;
    EFC_BENCH_CAPTURE.hud.setAttribute('aria-label', 'Benchmark progress');
    EFC_BENCH_CAPTURE.hud.style.cssText = 'position:fixed;top:8px;left:calc(50% - 80px);z-index:1000';
    const controls = document.createElement('div');
    controls.style.cssText = EFC_BENCH_CAPTURE.hud.style.cssText;
    EFC_BENCH_CAPTURE.hud.removeAttribute('style');
    controls.append(EFC_BENCH_CAPTURE.hud, efcBenchmarkButton('Cancel', efcBenchmarkExit));
    document.body.append(controls);
    EFC_BENCH_CAPTURE.heap = efcBenchmarkHeap();
    EFC_BENCH_CAPTURE.start = performance.now();
  } catch (e) {
    panel.querySelector('h2').textContent = 'Could not load the Claudov benchmark';
    console.error(e);
  }
}

efcOn('damage', (dmg, victim) => EFC_BENCH_CAPTURE.start !== null && victim === PL.ent ? 0 : undefined);
