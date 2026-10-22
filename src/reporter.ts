/**
 * GhostRender – Console Reporter
 * ─────────────────────────────────────────────────
 * Produces a styled, developer-friendly warning in the
 * browser / Node console when an unnecessary re-render is
 * detected.
 */

import type { RenderDelta } from './types';

/** ANSI / CSS colour constants used in the console output. */
const STYLES = {
  badge: 'background:#6C47FF;color:#fff;font-weight:bold;padding:2px 6px;border-radius:3px;',
  label: 'color:#6C47FF;font-weight:bold;',
  component: 'color:#FF6B6B;font-weight:bold;',
  key: 'color:#FFA94D;font-weight:600;',
  value: 'color:#A9DC76;',
  arrow: 'color:#888;',
  reset: '',
} as const;

/**
 * Formats a single value for display in the console.
 * Keeps output short and readable.
 */
function formatValue(val: unknown): string {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (typeof val === 'function') return `[Function: ${val.name || 'anonymous'}]`;
  if (typeof val === 'object') {
    try {
      const str = JSON.stringify(val);
      return str.length > 80 ? str.slice(0, 77) + '...' : str;
    } catch {
      return Object.prototype.toString.call(val);
    }
  }
  return String(val);
}

/**
 * Emits a styled console warning for an unnecessary re-render.
 *
 * @param componentName  Display name of the component.
 * @param delta          Map of changed keys (should be empty for truly
 *                       unnecessary renders, but may contain phantom diffs).
 * @param renderCount    Current total render count for this component.
 */
export function reportUnnecessaryRender(
  componentName: string,
  delta: RenderDelta,
  renderCount: number
): void {
  const deltaKeys = Object.keys(delta);
  const hasDelta = deltaKeys.length > 0;

  // ── Header ────────────────────────────────────────────────
  console.groupCollapsed(
    `%c GhostRender %c Unnecessary re-render detected in %c<${componentName}>%c (render #${renderCount})`,
    STYLES.badge,
    STYLES.label,
    STYLES.component,
    STYLES.reset
  );

  if (hasDelta) {
    // This branch fires when the composite (props + state) object
    // has structural equality but reference inequality — surface the
    // keys whose references changed even though values are the same.
    console.log(
      '%cChanged references (same values — consider memoisation):',
      STYLES.label
    );
    for (const key of deltaKeys) {
      const { prev, next } = delta[key];
      console.log(
        `  %c${key}%c: %c${formatValue(prev)}%c → %c${formatValue(next)}`,
        STYLES.key,
        STYLES.arrow,
        STYLES.value,
        STYLES.arrow,
        STYLES.value
      );
    }
  } else {
    console.log(
      '%cNo prop or state values changed. This render was completely unnecessary.',
      STYLES.label
    );
    console.log(
      '%cConsider wrapping this component in React.memo() or checking parent render triggers.',
      STYLES.reset
    );
  }

  console.log('%cComponent:%c', STYLES.label, STYLES.reset, componentName);
  console.groupEnd();
}
