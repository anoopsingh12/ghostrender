/**
 * GhostRender – Tests: shallowEqual & computeDelta
 */

import { shallowEqual, computeDelta } from '../shallowEqual';

describe('shallowEqual', () => {
  it('returns true for identical primitive values', () => {
    expect(shallowEqual({ a: 1, b: 'hello', c: true }, { a: 1, b: 'hello', c: true })).toBe(true);
  });

  it('returns false when a value changes', () => {
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it('returns false when keys are added', () => {
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('returns false when keys are removed', () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
  });

  it('treats NaN as equal (Object.is semantics)', () => {
    expect(shallowEqual({ a: NaN }, { a: NaN })).toBe(true);
  });

  it('returns false for different object references', () => {
    const obj1 = { x: 1 };
    const obj2 = { x: 1 };
    // Different references — not same value even if structurally equal
    expect(shallowEqual({ nested: obj1 }, { nested: obj2 })).toBe(false);
  });

  it('returns true when both are empty', () => {
    expect(shallowEqual({}, {})).toBe(true);
  });
});

describe('computeDelta', () => {
  it('returns an empty delta for equal objects', () => {
    expect(computeDelta({ a: 1 }, { a: 1 })).toEqual({});
  });

  it('captures changed primitive values', () => {
    const delta = computeDelta({ a: 1, b: 2 }, { a: 1, b: 99 });
    expect(delta).toEqual({ b: { prev: 2, next: 99 } });
  });

  it('captures added keys', () => {
    const delta = computeDelta({ a: 1 }, { a: 1, b: 2 });
    expect(delta).toEqual({ b: { prev: undefined, next: 2 } });
  });

  it('captures removed keys', () => {
    const delta = computeDelta({ a: 1, b: 2 }, { a: 1 });
    expect(delta).toEqual({ b: { prev: 2, next: undefined } });
  });
});
