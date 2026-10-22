/**
 * GhostRender – Shallow comparison utilities
 * ─────────────────────────────────────────────────
 * Performs a one-level-deep equality check on plain objects
 * and returns a typed delta of the changed keys.
 */

import type { PropsOrState, RenderDelta } from './types';

/**
 * Returns `true` when both values are strictly equal.
 * Treats `NaN === NaN` as equal (same as Object.is).
 */
function sameValue(a: unknown, b: unknown): boolean {
  return Object.is(a, b);
}

/**
 * Performs a shallow comparison of two plain objects.
 * Returns `true` when every key/value pair is identical.
 */
export function shallowEqual(
  prev: PropsOrState,
  next: PropsOrState
): boolean {
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);

  if (prevKeys.length !== nextKeys.length) return false;

  for (const key of prevKeys) {
    if (!Object.prototype.hasOwnProperty.call(next, key)) return false;
    if (!sameValue(prev[key], next[key])) return false;
  }

  return true;
}

/**
 * Computes the delta between two prop/state snapshots.
 * Returns an object containing only the keys that changed,
 * with their `{ prev, next }` pair.
 */
export function computeDelta(
  prev: PropsOrState,
  next: PropsOrState
): RenderDelta {
  const delta: RenderDelta = {};

  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);

  for (const key of allKeys) {
    const prevVal = prev[key];
    const nextVal = next[key];
    if (!sameValue(prevVal, nextVal)) {
      delta[key] = { prev: prevVal, next: nextVal };
    }
  }

  return delta;
}
