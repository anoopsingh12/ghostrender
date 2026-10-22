/**
 * GhostRender – Tests: useGhostRender hook
 */

import * as React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useGhostRender } from '../useGhostRender';

// Spy on the reporter so we don't pollute test output
jest.mock('../reporter', () => ({
  reportUnnecessaryRender: jest.fn(),
}));

import { reportUnnecessaryRender } from '../reporter';
const mockReport = reportUnnecessaryRender as jest.MockedFunction<typeof reportUnnecessaryRender>;

// Force dev mode for all tests
jest.mock('../useGhostRender', () => {
  const actual = jest.requireActual('../useGhostRender');
  return actual;
});

describe('useGhostRender (dev mode)', () => {
  beforeEach(() => {
    mockReport.mockClear();
    // Patch NODE_ENV to 'development' for this test run
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      writable: true,
    });
  });

  it('does not warn on first render', () => {
    renderHook(() =>
      useGhostRender({ componentName: 'TestComp', props: { title: 'hello' } })
    );
    expect(mockReport).not.toHaveBeenCalled();
  });

  it('increments renderCount on each render', () => {
    const { result, rerender } = renderHook(
      ({ title }: { title: string }) =>
        useGhostRender({ componentName: 'TestComp', props: { title } }),
      { initialProps: { title: 'hello' } }
    );
    expect(result.current.renderCount).toBe(1);

    rerender({ title: 'world' });
    expect(result.current.renderCount).toBe(2);
  });

  it('does NOT flag a render as unnecessary when props change', () => {
    const { rerender } = renderHook(
      ({ count }: { count: number }) =>
        useGhostRender({ componentName: 'TestComp', props: { count } }),
      { initialProps: { count: 0 } }
    );

    rerender({ count: 1 }); // prop changed — should NOT warn
    expect(mockReport).not.toHaveBeenCalled();
  });

  it('flags a render as unnecessary when props are identical', () => {
    const { rerender } = renderHook(
      ({ count }: { count: number }) =>
        useGhostRender({ componentName: 'TestComp', props: { count } }),
      { initialProps: { count: 42 } }
    );

    rerender({ count: 42 }); // same props — SHOULD warn
    expect(mockReport).toHaveBeenCalledTimes(1);
    expect(mockReport).toHaveBeenCalledWith('TestComp', {}, 2);
  });

  it('increments unnecessaryRenderCount for each unnecessary render', () => {
    const { result, rerender } = renderHook(
      ({ n }: { n: number }) =>
        useGhostRender({ componentName: 'TestComp', props: { n } }),
      { initialProps: { n: 5 } }
    );

    rerender({ n: 5 });
    rerender({ n: 5 });
    expect(result.current.unnecessaryRenderCount).toBe(2);
  });

  it('calls onUnnecessaryRender callback when provided', () => {
    const cb = jest.fn();
    const { rerender } = renderHook(
      ({ x }: { x: number }) =>
        useGhostRender({
          componentName: 'CB_Comp',
          props: { x },
          onUnnecessaryRender: cb,
          silent: true,
        }),
      { initialProps: { x: 1 } }
    );

    rerender({ x: 1 });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith('CB_Comp', {});
  });

  it('respects the silent flag — suppresses reportUnnecessaryRender', () => {
    const { rerender } = renderHook(
      ({ v }: { v: string }) =>
        useGhostRender({ componentName: 'SilentComp', props: { v }, silent: true }),
      { initialProps: { v: 'same' } }
    );

    rerender({ v: 'same' });
    expect(mockReport).not.toHaveBeenCalled();
  });
});
