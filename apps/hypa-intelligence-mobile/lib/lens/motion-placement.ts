import type { Point } from './frame-points';

type MotionSample = Point & { vx: number; vy: number; at: number };

export function predictMotion(state: MotionSample, now: number): Point {
  'worklet';
  const age = Math.max(0, now - state.at);
  const ahead = 24 * (1 - Math.exp(-age / 24));
  return { x: state.x + state.vx * ahead, y: state.y + state.vy * ahead };
}

export function followMotion(previous: Point, target: Point, elapsedMs: number): Point {
  'worklet';
  const weight = elapsedMs > 100 ? 1 : 1 - Math.exp(-Math.max(0, elapsedMs) / 18);
  return {
    x: previous.x + (target.x - previous.x) * weight,
    y: previous.y + (target.y - previous.y) * weight,
  };
}

type ToView = { x: Point; y: Point };

/** How fast the scene is sliding across the screen, in view points per ms; fades once tracking goes quiet. */
export function motionSpeed(state: MotionSample, toView: ToView, now: number): number {
  'worklet';
  const age = Math.max(0, now - state.at);
  const fade = Math.exp(-age / 120);
  const vx = toView.x.x * state.vx + toView.y.x * state.vy;
  const vy = toView.x.y * state.vx + toView.y.y * state.vy;
  return Math.hypot(vx, vy) * fade;
}

/** Same as motionSpeed in upright-normalised units per ms, for the camera thread. */
export function uprightSpeed(state: MotionSample, now: number): number {
  'worklet';
  const age = Math.max(0, now - state.at);
  return Math.hypot(state.vx, state.vy) * Math.exp(-age / 120);
}

/** Faster than this (view points per ms, about 250 pt/s) is a real move, not hand shake: cards hide. */
export const MOVING_SPEED = 0.25;
/** Cards come back only once the scene has been slower than this (about 80 pt/s)... */
export const STEADY_SPEED = 0.08;
/** ...for this long, so a pause in the middle of a sweep doesn't flash them back. */
export const STEADY_MS = 350;

export type Steadiness = { moving: boolean; steadySince: number };

/** Hysteresis for "is the phone moving too much to show translations". Returns the same object when nothing changed. */
export function stepSteadiness(state: Steadiness, speed: number, now: number): Steadiness {
  'worklet';
  if (!state.moving) return speed > MOVING_SPEED ? { moving: true, steadySince: now } : state;
  if (speed > STEADY_SPEED) return { moving: true, steadySince: now };
  return now - state.steadySince > STEADY_MS ? { moving: false, steadySince: now } : state;
}
