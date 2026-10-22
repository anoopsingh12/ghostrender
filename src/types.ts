/**
 * GhostRender – Types
 * ─────────────────────────────────────────────────
 * Public TypeScript surface for the ghostrender package.
 */

/** A snapshot of props or state — any plain object. */
export type PropsOrState = Record<string, unknown>;

/**
 * The delta between two renders: a map of changed keys to
 * their { prev, next } pair.
 */
export type RenderDelta = Record<
  string,
  { prev: unknown; next: unknown }
>;

/** Options accepted by `useGhostRender`. */
export interface UseGhostRenderOptions {
  /**
   * Unique identifier for the component being tracked.
   * Usually the component display name.
   */
  componentName: string;

  /**
   * Current props snapshot. Pass `props` directly.
   */
  props?: PropsOrState;

  /**
   * Current state snapshot. Pass your state object or
   * individual state values as a plain object.
   */
  state?: PropsOrState;

  /**
   * Optional callback invoked on every unnecessary re-render.
   * Receives the component name and the computed delta.
   * Useful for custom telemetry / test assertions.
   */
  onUnnecessaryRender?: (
    componentName: string,
    delta: RenderDelta
  ) => void;

  /**
   * Suppress the default console warning.
   * Pair with `onUnnecessaryRender` for fully custom output.
   * @default false
   */
  silent?: boolean;
}

/** The value returned by `useGhostRender`. */
export interface UseGhostRenderResult {
  /**
   * Total number of renders recorded for this component
   * instance (dev mode only; always 0 in production).
   */
  renderCount: number;

  /**
   * Total number of renders classified as unnecessary
   * (dev mode only; always 0 in production).
   */
  unnecessaryRenderCount: number;
}
