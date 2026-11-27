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
    efcOn: (kind, listener) => hooks.set(kind, [...(hooks.get(kind) || []), listener]),
    efcProvide: () => {},
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
  for (const listener of hooks.get('raid:begin')) listener();
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

test('each action waits for the emitted cue and the full catalogue lead', () => {
  const { catalogue } = fixture();
  for (const [kind, rule] of Object.entries(catalogue)) {
    const { context, warden, events, hooks } = fixture();
    const tick = () => hooks.get('tick').forEach((listener) => listener());
    const actions = [];
    context.efcBarkAction(warden, kind, () => actions.push(context.MATCH.time));
    assert.equal(events.length, 1, kind);
    context.MATCH.time = rule.lead - 0.001;
    tick();
    assert.equal(actions.length, 0, kind);
    context.MATCH.time = rule.lead;
    tick();
    assert.deepEqual(actions, [rule.lead], kind);
    assert.ok(actions[0] - events[0][1].at >= 0.6, kind);
  }
});

test('cooldown queues wait for an actual bark and cancel stale or duplicate actions', () => {
  const { context, warden, bark, events, hooks } = fixture();
  const tick = () => hooks.get('tick').forEach((listener) => listener());
  const actions = [];
  bark(warden, 'reload');
  context.efcBarkAction(warden, 'reload', () => actions.push(context.MATCH.time));
  context.efcBarkAction(warden, 'reload', () => actions.push('duplicate'));
  context.MATCH.time = 4.9;
  tick();
  assert.equal(events.length, 1);
  assert.deepEqual(actions, []);
  context.MATCH.time = 5;
  tick();
  assert.equal(events[1][1].at, 5);
  context.MATCH.time = 5.59;
  tick();
  assert.deepEqual(actions, []);
  context.MATCH.time = 5.6;
  tick();
  assert.deepEqual(actions, [5.6]);
  context.efcBarkAction(warden, 'spot', () => actions.push('stale'), () => false);
  context.MATCH.time = 20;
  tick();
  assert.deepEqual(actions, [5.6]);
});

test('an audible firing burst waits for the warning while other modes are unaffected', () => {
  const { context, warden, events } = fixture();
  assert.equal(context.efcBarkFireReady(warden), false);
  assert.equal(events[0][1].kind, 'suppress');
  context.MATCH.time = 0.59;
  assert.equal(context.efcBarkFireReady(warden), false);
  context.MATCH.time = 0.6;
  assert.equal(context.efcBarkFireReady(warden), true);
  context.MATCH.time = 1.2;
  assert.equal(context.efcBarkFireReady(warden), true);
  context.live = false;
  context.MATCH.time = 3;
  assert.equal(context.efcBarkFireReady(warden), true);
});
