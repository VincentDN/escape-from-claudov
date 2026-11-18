/* Shared A8 inventory panels. Preview renders on demand through the game's outfit renderer. */
const EFC_OPERATOR_VIEWS = new Map();

function efcOperatorPanel(id, weapon) {
  let view = EFC_OPERATOR_VIEWS.get(id);
  if (!view) {
    const root = $(id);
    root.innerHTML = '<p class="lbl">Operator</p><canvas width="300" height="400" tabindex="0" aria-label="Rotate the operator with the arrow keys or by dragging"></canvas><p class="efc-op-hands"></p>';
    const canvas = root.querySelector('canvas');
    view = { canvas, hands: root.querySelector('.efc-op-hands'), angle: 0.55, drag: null, frame: 0, drawn: '' };
    EFC_OPERATOR_VIEWS.set(id, view);
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      view.drag = { x: event.clientX, angle: view.angle };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (!view.drag) return;
      view.angle = view.drag.angle - (event.clientX - view.drag.x) * 0.008;
      efcOperatorDraw(view);
    });
    canvas.addEventListener('lostpointercapture', () => { view.drag = null; });
    canvas.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      view.angle += event.key === 'ArrowLeft' ? 0.13 : -0.13;
      efcOperatorDraw(view);
    });
  }
  view.skin = skinMine();
  view.weapon = weapon?.key ?? null;
  view.hands.textContent = weapon ? 'Hands · ' + weapon.name : 'Hands · Empty';
  efcOperatorDraw(view);
}

function efcOperatorDraw(view) {
  if (view.frame) return;
  view.frame = requestAnimationFrame(() => {
    view.frame = 0;
    const canvas = view.canvas;
    if (!canvas.getClientRects().length || !renderer || gpuLostNow()) return;
    const key = JSON.stringify([view.skin, view.weapon, view.angle]);
    if (view.drawn === key) return;
    try {
      skinDraw(canvas.getContext('2d'), canvas.width, canvas.height, view.skin, 0, view.angle, view.weapon);
      view.drawn = key;
    } catch (error) { gpuLog('operator preview: ' + error.message); }
  });
}

function efcOperatorGrid(grid, name) {
  if (!grid) return '';
  const items = grid.entries.map(({ item, x, y, rotated }) => {
    const [w, h] = efcCall('grid:size', item, rotated);
    const itemName = efcUiDef(item.id).name;
    return { item, itemName, w, h, x, y };
  });
  const filled = items.reduce((sum, item) => sum + item.w * item.h, 0);
  return `<p class="lbl">${esc(name)} · ${filled}/${grid.cols * grid.rows}</p>
    <div class="efc-op-grid" aria-label="${esc(name)}" style="--cols:${grid.cols};--rows:${grid.rows}">
    ${items.map(({ item, itemName, w, h, x, y }) =>
      `<span style="grid-area:${y + 1}/${x + 1}/span ${h}/span ${w}" title="${esc(itemName)}">${esc(itemName)} ×${item.n}</span>`).join('')}</div>`;
}

function efcOperatorEquipment(id, inv) {
  const grids = inv && efcCall('grid:loadout', inv);
  $(id).innerHTML = Object.entries(grids || {}).map(([kind, grid]) =>
    efcOperatorGrid(grid, kind === 'pockets' ? 'Pockets' : efcUiDef(inv.slots[kind].id).name)).join('');
}

function efcOperatorRaidWeapon() {
  return PL.ent.arms && armsW(PL.ent)?.def;
}

function efcOperatorVicinity() {
  const p = PL.ent.pos, radius = EFC.cfg.interactR;
  const near = (efcCall('world:list') || []).filter(c => Math.hypot(c.x - p.x, c.y - p.y, c.z - p.z) <= radius);
  $('efcOpVicinity').innerHTML = '<p class="lbl">Vicinity</p>' + (near.length
    ? '<ul class="efc-op-vicinity">' + near.map(c => '<li>' + esc(efcUirName(c)) + '</li>').join('') + '</ul>'
    : '<p class="efc-none">Nothing within reach.</p>');
}
