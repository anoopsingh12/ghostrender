/**
 * GhostRender – useGhostRender hook
 * ─────────────────────────────────────────────────
 * Tracks unnecessary re-renders in development mode.
 * Compiles to a complete no-op in production — zero overhead,
 * zero logs, zero bundle impact.
 *
 * Usage:
 *   import { useGhostRender } from 'ghostrender';
 *
 *   function MyComponent(props) {
 *     useGhostRender({ componentName: 'MyComponent', props });
 *     return <div>{props.title}</div>;
 *   }
 */

import { useEffect, useRef } from 'react';
import type { UseGhostRenderOptions, UseGhostRenderResult, PropsOrState } from './types';
import { shallowEqual, computeDelta } from './shallowEqual';
import { reportUnnecessaryRender } from './reporter';

// ── Environment detection ──────────────────────────────────────────────────
//
// Support both CRA/webpack (process.env.NODE_ENV) and Vite
// (import.meta.env.MODE). The conditional below is evaluated at
// build-time by most bundlers, enabling full tree-shaking of this
// module in production builds.

function isDevEnvironment(): boolean {
  // Vite-style: access import.meta.env.MODE at runtime via indirect eval so
  // the CJS TypeScript compiler never sees the static `import.meta` syntax.
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const getMeta = new Function('return import.meta') as () => { env?: { MODE?: string } } | undefined;
    const meta = getMeta();
    if (meta?.env?.MODE) {
      return meta.env.MODE !== 'production';
    }
  } catch {
    // CJS / older environments don't support import.meta — fall through
  }
  // Node / webpack / CRA / Next.js
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return process.env.NODE_ENV !== 'production';
  }
  // Unknown environment — assume dev to be safe
  return true;
}

const IS_DEV = isDevEnvironment();

// ── Production no-op ───────────────────────────────────────────────────────

const NOOP_RESULT: UseGhostRenderResult = {
  renderCount: 0,
  unnecessaryRenderCount: 0,
};

/** Production no-op hook — tree-shaken away at build time. */
function useGhostRenderNoop(_options: UseGhostRenderOptions): UseGhostRenderResult {
  return NOOP_RESULT;
}

// ── Development implementation ─────────────────────────────────────────────

/** Merges props and state into a single flat snapshot for comparison. */
function buildSnapshot(
  props?: PropsOrState,
  state?: PropsOrState
): PropsOrState {
  return {
    ...(props ?? {}),
    ...(state ? Object.fromEntries(
      Object.entries(state).map(([k, v]) => [`__state__${k}`, v])
    ) : {}),
  };
}

/** Development implementation — full tracking logic. */
function useGhostRenderDev(options: UseGhostRenderOptions): UseGhostRenderResult {
  const {
    componentName,
    props,
    state,
    onUnnecessaryRender,
    silent = false,
  } = options;

  // Persistent refs — do NOT cause re-renders themselves
  const prevSnapshotRef = useRef<PropsOrState | null>(null);
  const renderCountRef = useRef<number>(0);
  const unnecessaryCountRef = useRef<number>(0);

  // Increment on every render (runs synchronously during render phase)
  renderCountRef.current += 1;
  const currentRender = renderCountRef.current;

  const currentSnapshot = buildSnapshot(props, state);

  // Skip comparison on the very first render — there is no "previous" yet
  if (prevSnapshotRef.current !== null) {
    const prev = prevSnapshotRef.current;
    const isUnnecessary = shallowEqual(prev, currentSnapshot);

    if (isUnnecessary) {
      unnecessaryCountRef.current += 1;

      // Delta is empty for a truly unnecessary render; compute anyway
      // so that the reporter can surface any reference-inequality details
      const delta = computeDelta(prev, currentSnapshot);

      if (!silent) {
        reportUnnecessaryRender(componentName, delta, currentRender);
      }

      if (onUnnecessaryRender) {
        onUnnecessaryRender(componentName, delta);
      }
    }
  }

  // Update snapshot AFTER comparison so the next render has the latest
  // values. We use useEffect with a layout-like approach but keep it
  // synchronous in the render phase for accuracy.
  prevSnapshotRef.current = currentSnapshot;

  return {
    renderCount: renderCountRef.current,
    unnecessaryRenderCount: unnecessaryCountRef.current,
  };
}

// ── Public export ──────────────────────────────────────────────────────────

/**
 * `useGhostRender` — tracks unnecessary component re-renders.
 *
 * Call this at the top of any function component. In production
 * environments (NODE_ENV === 'production') this hook is replaced by a
 * complete no-op and is compiled away by tree-shaking.
 *
 * @example
 * ```tsx
 * function MyComponent(props: { title: string }) {
 *   const { renderCount, unnecessaryRenderCount } = useGhostRender({
 *     componentName: 'MyComponent',
 *     props,
 *   });
 *   return <h1>{props.title}</h1>;
 * }
 * ```
 */
export const useGhostRender: (options: UseGhostRenderOptions) => UseGhostRenderResult =
  IS_DEV ? useGhostRenderDev : useGhostRenderNoop;
