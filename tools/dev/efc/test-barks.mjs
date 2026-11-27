import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../../../src/efc/45b-efc-barks.js', import.meta.url), 'utf8');
const position = (x) => ({
  x,
  distanceToSquared(other) { return (x - other.x) ** 2; },
  toArray() { return [x, 0, 0]; },
});

function fixture() {
  const events = [], hooks = new Map();
  const player = { isPlayer: true, alive: true, pos: position(0) };
  const warden = { id: 1, alive: true, squad: 'w', pos: position(10) };
  const scavenger = { id: 2, alive: true, squad: 's', pos: position(12) };
  const context = {
    MATCH: { time: 0 }, live: true, host: true, entities: [player, warden, scavenger],
    efcRaidLive: () => context.live,
    efcIsHost: () => context.host,
    efcIsHumanEnt: (actor) => actor.isPlayer || (actor.isRemote && !actor.remoteBot),
    efcOn: (kind, listener) => hooks.set(kind, listener),
    efcEmit: (kind, event) => events.push([kind, event]),
  };
  const catalogue = runInNewContext(source + '\nEFC_BARKS;', context);
  return { context, player, warden, scavenger, events, hooks, catalogue, bark: context.efcBark };
}

test('only the raid host can emit a bark from a live local hostile', () => {
  const { context, player, warden, bark, events } = fixture();
  context.host = false;
  assert.equal(bark(warden, 'spot'), null);
  context.host = true;
  context.live = false;
  assert.equal(bark(warden, 'spot'), null);
  context.live = true;
  assert.equal(bark(player, 'spot'), null);
  assert.equal(bark({ ...warden, isRemote: true }, 'spot'), null);
  assert.equal(bark({ ...warden, alive: false }, 'spot'), null);
  assert.equal(bark(warden, 'toString'), null);
  assert.equal(events.length, 0);
});

test('per-speaker and per-kind cooldowns expire and reset between raids', () => {
  const { context, warden, scavenger, bark, hooks } = fixture();
  assert.ok(bark(warden, 'spot'));
  context.MATCH.time = 2;
  assert.equal(bark(warden, 'move_up'), null);
  assert.equal(bark(scavenger, 'spot'), null);
  assert.ok(bark(scavenger, 'move_up'));
  context.MATCH.time = 4;
  assert.ok(bark(warden, 'spot'));
  context.MATCH.time = 0;
  hooks.get('raid:begin')();
  assert.ok(bark(warden, 'spot'));
});

test('urgent barks interrupt lower priority and grenade warnings bypass both cooldowns', () => {
  const { warden, scavenger, bark } = fixture();
  assert.ok(bark(warden, 'search'));
  assert.ok(bark(warden, 'help'));
  assert.equal(bark(warden, 'reload'), null);
  for (const kind of ['frag', 'flash', 'smoke']) {
    assert.ok(bark(warden, kind));
    assert.ok(bark(warden, kind));
    assert.ok(bark(scavenger, kind));
  }
  assert.equal(bark(warden, 'all_clear'), null);
});

test('audibility uses the nearest active human and includes the range boundary', () => {
  const { context, player, warden, bark } = fixture();
  player.pos = position(-39);
  assert.equal(bark(warden, 'frag'), null);
  context.entities.push({ isRemote: true, remoteBot: true, alive: true, pos: position(9) });
  assert.equal(bark(warden, 'frag'), null);
  context.entities.push({ isRemote: true, alive: true, pos: position(-35) });
  assert.ok(bark(warden, 'frag'));
  context.entities.at(-1).out = true;
  assert.equal(bark(warden, 'frag'), null);
});

test('seeded choice and the event payload are deterministic', () => {
  const sequence = (seed) => () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const sample = () => {
    const { bark, events, context, warden, scavenger, catalogue } = fixture();
    const rng = sequence(1);
    assert.equal(Object.keys(catalogue).length, 15);
    assert.ok(Object.values(catalogue).every((rule) => rule.lead >= 0.6));
    context.MATCH.time = 2;
    assert.ok(bark(warden, 'spot', { rng }));
    assert.ok(bark(scavenger, 'frag', { rng }));
    return JSON.parse(JSON.stringify(events));
  };
  const events = sample();
  assert.deepEqual(events, sample());
  assert.deepEqual(events[0], ['bark', { id: 1, kind: 'spot', line: 'Contact!', voice: 'w', pos: [10, 0, 0], at: 2 }]);
  assert.equal(events[1][1].voice, 's');
});
