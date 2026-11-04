import assert from 'node:assert/strict';
import test from 'node:test';
import { followMotion, predictMotion } from './motion-placement';

test('prediction does not jump ahead when a camera sample arrives', () => {
  const sample = { x: 0.2, y: 0.3, vx: 0.001, vy: -0.001, at: 100 };
  assert.deepEqual(predictMotion(sample, 100), { x: 0.2, y: 0.3 });
  const stale = predictMotion(sample, 10000);
  assert.ok(Math.abs(stale.x - 0.224) < 1e-12 && Math.abs(stale.y - 0.276) < 1e-12);
});

test('a stopped camera settles to its observed position without overshoot', () => {
  const target = predictMotion({ x: 0.2, y: 0.3, vx: 0, vy: 0, at: 100 }, 200);
  let point = { x: 0.22, y: 0.28 };
  for (let i = 0; i < 12; i++) {
    point = followMotion(point, target, 1000 / 60);
    assert.ok(point.x >= target.x && point.y <= target.y);
  }
  assert.ok(Math.abs(point.x - target.x) < 0.000001);
});

test('correction has equal convergence at 60 Hz and 120 Hz', () => {
  const run = (hz: number) => {
    let point = { x: 0, y: 0 };
    for (let i = 0; i < hz / 10; i++) point = followMotion(point, { x: 1, y: -1 }, 1000 / hz);
    return point;
  };
  assert.ok(Math.abs(run(60).x - run(120).x) < 1e-12);
});

test('direction changes are continuous and resume discards old UI positions', () => {
  const point = followMotion({ x: 0.2, y: 0.3 }, { x: 0.1, y: 0.3 }, 16);
  assert.ok(point.x > 0.1 && point.x < 0.2);
  assert.deepEqual(followMotion(point, { x: 0.5, y: 0.6 }, 500), { x: 0.5, y: 0.6 });
});

import { motionSpeed, uprightSpeed } from './motion-placement';

test('speed is measured in view points and fades once tracking goes quiet', () => {
  const toView = { x: { x: 400, y: 0 }, y: { x: 0, y: 800 } };
  const moving = { x: 0, y: 0, vx: 0.002, vy: 0, at: 1000 };
  assert.ok(Math.abs(motionSpeed(moving, toView, 1000) - 0.8) < 1e-9);
  assert.ok(motionSpeed(moving, toView, 1600) < 0.01);
  assert.ok(Math.abs(uprightSpeed(moving, 1000) - 0.002) < 1e-12);
});

import { MOVING_SPEED, STEADY_MS, STEADY_SPEED, stepSteadiness } from './motion-placement';

test('hand shake keeps cards showing, a real move hides them', () => {
  const still = { moving: false, steadySince: 0 };
  assert.equal(stepSteadiness(still, STEADY_SPEED, 10), still, 'slight movement changes nothing');
  assert.equal(stepSteadiness(still, MOVING_SPEED - 0.01, 10), still);
  assert.equal(stepSteadiness(still, MOVING_SPEED + 0.01, 10).moving, true);
});

test('cards stay hidden until the phone has been steady for STEADY_MS', () => {
  let state = stepSteadiness({ moving: false, steadySince: 0 }, 1, 1000);
  assert.equal(state.moving, true);
  state = stepSteadiness(state, 0.01, 1100);
  assert.equal(state.moving, true, 'a single calm frame is not steady');
  state = stepSteadiness(state, 0.01, 1000 + STEADY_MS);
  assert.equal(state.moving, true);
  state = stepSteadiness(state, 0.01, 1100 + STEADY_MS + 1);
  assert.equal(state.moving, false);
});

test('a pause in the middle of a sweep restarts the steady clock', () => {
  let state = stepSteadiness({ moving: false, steadySince: 0 }, 1, 0);
  state = stepSteadiness(state, 0.01, 200);
  state = stepSteadiness(state, 0.5, 300);
  state = stepSteadiness(state, 0.01, 300 + STEADY_MS);
  assert.equal(state.moving, true);
});

test('settling after fast movement is judged from when it began, not from stale state', () => {
  const stale = { moving: false, steadySince: -100000 };
  const moving = stepSteadiness(stale, 1, 5000);
  assert.equal(stepSteadiness(moving, 0.01, 5001).moving, true);
});
