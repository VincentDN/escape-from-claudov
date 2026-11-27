/* C16 bark captions. The event carries the host's text choice and source position. */
Settings.efcBarkCaptions ??= true;
const EFC_BARK_CAPTIONS = { duration: 2.5, limit: 3, rows: [], root: null, feed: null };
const efcBarkCaptionPoint = new V3(), efcBarkCaptionView = new V3();

function efcBarkCaptionInit() {
  const state = EFC_BARK_CAPTIONS;
  const style = document.createElement('style');
  style.textContent = `
    #efcBarkCaptions { position: absolute; inset: 0; pointer-events: none; }
    #efcBarkCaptionFeed { position: absolute; right: 2.5vw; bottom: 23%; display: grid; justify-items: end; gap: 6px; }
    .efc-bark-caption { padding: 5px 10px; color: var(--paper); background: rgba(10,11,9,.88); border-left: 2px solid var(--acc);
      font: 600 clamp(15px, 1.4vw, 21px)/1.2 var(--hud); text-shadow: 0 1px 2px #000; animation: efc-bark-enter .12s ease-out; }
    .efc-bark-caption[data-mode="speaker"] { position: absolute; transform: translate(-50%, -100%); white-space: nowrap; }
    .efc-bark-caption b { display: inline-block; margin-right: 8px; color: var(--acc); }
    .efc-bark-caption[data-mode="speaker"] b { display: none; }
    @keyframes efc-bark-enter { from { opacity: 0; } to { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .efc-bark-caption { animation: none; } }
  `;
  document.head.append(style);
  state.root = document.createElement('div');
  state.root.id = 'efcBarkCaptions';
  state.root.setAttribute('aria-live', 'polite');
  state.feed = document.createElement('div');
  state.feed.id = 'efcBarkCaptionFeed';
  state.root.append(state.feed);
  $('hud').append(state.root);
}

function efcBarkCaptionClear() {
  const rows = EFC_BARK_CAPTIONS.rows;
  for (const row of rows) row.element.remove();
  rows.length = 0;
}

function efcBarkCaptionVisible() {
  return Settings.efcBarkCaptions && efcRaidLive() && PL.ent.alive;
}

function efcBarkCaptionUpdate() {
  const state = EFC_BARK_CAPTIONS;
  if (!state.rows.length) return;
  if (!efcBarkCaptionVisible()) {
    efcBarkCaptionClear();
    return;
  }
  camera.updateMatrixWorld();
  for (let i = state.rows.length - 1; i >= 0; i--) {
    const row = state.rows[i];
    if (MATCH.time >= row.expires) {
      row.element.remove();
      state.rows.splice(i, 1);
      continue;
    }
    const speaker = entities.find((entity) => entity.id === row.bark.id && entity.alive && !entity.off);
    if (speaker) entHead(speaker, efcBarkCaptionPoint);
    else { efcBarkCaptionPoint.fromArray(row.bark.pos); efcBarkCaptionPoint.y += 1.65; }
    efcBarkCaptionPoint.y += 0.25;
    efcBarkCaptionView.copy(efcBarkCaptionPoint).applyMatrix4(camera.matrixWorldInverse);
    const inFront = efcBarkCaptionView.z < 0;
    const bearing = Math.atan2(efcBarkCaptionView.x, -efcBarkCaptionView.z);
    efcBarkCaptionView.copy(efcBarkCaptionPoint).project(camera);
    const x = efcBarkCaptionView.x, y = efcBarkCaptionView.y;
    const onScreen = inFront && efcBarkCaptionView.z >= -1 && efcBarkCaptionView.z < 1 &&
      Math.abs(x) <= 0.92 && Math.abs(y) <= 0.92 && lineClear(camera.position, efcBarkCaptionPoint);
    const parent = onScreen ? state.root : state.feed;
    if (row.element.parentElement !== parent) {
      // Walk newest-first but keep the feed ordered oldest-first.
      const next = onScreen ? null : state.rows.slice(i + 1).find((item) => item.element.parentElement === parent);
      parent.insertBefore(row.element, next?.element || null);
      row.element.dataset.mode = onScreen ? 'speaker' : 'feed';
    }
    if (onScreen) {
      hudStyle(row.element, 'left', `${((x + 1) * 50).toFixed(1)}%`);
      const stacked = state.rows.slice(i + 1).filter((item) => item.bark.id === row.bark.id).length;
      hudStyle(row.element, 'top', `calc(${((1 - y) * 50).toFixed(1)}% - ${stacked * 2}em)`);
    } else {
      hudStyle(row.arrow, 'transform', `rotate(${bearing.toFixed(3)}rad)`);
    }
  }
}

function efcBarkCaptionShow(bark) {
  const state = EFC_BARK_CAPTIONS;
  if (!state.root || !efcBarkCaptionVisible()) return;
  if (state.rows.length >= state.limit) state.rows.shift().element.remove();
  const element = document.createElement('div'), arrow = document.createElement('b');
  element.className = 'efc-bark-caption';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '▲';
  element.append(arrow, bark.line);
  state.rows.push({ bark, element, arrow, expires: MATCH.time + state.duration });
  efcBarkCaptionUpdate();
}

efcOn('ui:init', efcBarkCaptionInit);
efcOn('bark', efcBarkCaptionShow);
efcOn('tick', efcBarkCaptionUpdate);
efcOn('raid:begin', efcBarkCaptionClear);
efcOn('raid:over', efcBarkCaptionClear);
efcOn('match:left', efcBarkCaptionClear);
