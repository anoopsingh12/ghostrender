# GhostRender 👻

> **A dev-only React hook that detects and reports unnecessary component re-renders — with zero production overhead.**

[![npm version](https://img.shields.io/npm/v/ghostrender?style=flat-square&color=7c3aed)](https://www.npmjs.com/package/ghostrender)
[![license](https://img.shields.io/npm/l/ghostrender?style=flat-square&color=10b981)](./LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/ghostrender?style=flat-square&color=06b6d4)](https://bundlephobia.com/package/ghostrender)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-%3E%3D16.8-61DAFB?style=flat-square&logo=react)](https://react.dev/)

---

## Why GhostRender?

Unnecessary re-renders are one of the most common React performance killers. They're invisible until you dig deep into the DevTools profiler — by which point the damage is already shipped to production.

**GhostRender makes unnecessary re-renders immediately obvious in the console during development**, telling you:

- ✅ **Which component** re-rendered unnecessarily
- ✅ **What render number** it was
- ✅ **What the delta looked like** (which props/state keys changed reference)
- ✅ **Actionable hints** — `React.memo`, `useCallback`, `useMemo`

And in production, the entire library compiles to a **no-op** — zero console calls, zero ref allocations, zero bundle impact.

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Live Demo](#live-demo)
- [API Reference](#api-reference)
  - [useGhostRender(options)](#useghostrenderoptions)
  - [Options](#options)
  - [Return Value](#return-value)
  - [Types](#types)
- [Usage Patterns](#usage-patterns)
  - [Tracking Props](#tracking-props)
  - [Tracking State](#tracking-state)
  - [Tracking Props + State Together](#tracking-props--state-together)
  - [Custom Callback](#custom-callback)
  - [Silent Mode](#silent-mode)
  - [Accessing Render Counts](#accessing-render-counts)
- [Console Output](#console-output)
  - [Unnecessary Render Warning](#unnecessary-render-warning)
  - [Reference Inequality Warning](#reference-inequality-warning)
- [Production Safety](#production-safety)
  - [How it Works](#how-it-works)
  - [Bundler Compatibility](#bundler-compatibility)
  - [Environment Detection](#environment-detection)
- [Common Patterns & Fixes](#common-patterns--fixes)
  - [React.memo — Prevent Parent-Triggered Re-renders](#reactmemo--prevent-parent-triggered-re-renders)
  - [useCallback — Stabilise Function Props](#usecallback--stabilise-function-props)
  - [useMemo — Stabilise Object Props](#usememo--stabilise-object-props)
  - [Context — Splitting Contexts](#context--splitting-contexts)
- [TypeScript](#typescript)
- [Integration with Testing](#integration-with-testing)
- [Integration with Analytics / Telemetry](#integration-with-analytics--telemetry)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Installation

```bash
# npm
npm install --save-dev ghostrender

# yarn
yarn add -D ghostrender

# pnpm
pnpm add -D ghostrender
```

> **Peer dependency:** React ≥ 16.8 is required.

---

## Quick Start

Drop `useGhostRender` at the top of any function component. That's it.

```tsx
import { useGhostRender } from 'ghostrender';

interface ProfileCardProps {
  userId: string;
  displayName: string;
}

function ProfileCard(props: ProfileCardProps) {
  useGhostRender({ componentName: 'ProfileCard', props });

  return (
    <div className="card">
      <h2>{props.displayName}</h2>
    </div>
  );
}
```

If `ProfileCard` re-renders with the same `userId` and `displayName`, you'll see this in the DevTools console:

```
╔ GhostRender ════════════════════════════════════════════════╗
║ Unnecessary re-render detected in <ProfileCard> (render #3) ║
║ No prop or state values changed. This render was completely  ║
║ unnecessary.                                                 ║
║ Consider wrapping in React.memo() or check parent triggers.  ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Live Demo

Run the interactive demo locally to see all features in action:

```bash
git clone https://github.com/ghostrender/ghostrender.git
cd ghostrender/demo
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The demo includes:

| Scenario | What it demonstrates |
|---|---|
| **Parent Re-render Cascade** | Unmemoised vs `React.memo` side by side |
| **State Tracking** | Tracking `count` + `step` state; "Force no-op" button |
| **Props + State Together** | `ProductList` with category prop and selection state |
| **Live Log Panel** | `onUnnecessaryRender` callback captured in real time |
| **Silent Mode Toggle** | Suppress console; use callback only |

---

## API Reference

### `useGhostRender(options)`

```ts
import { useGhostRender } from 'ghostrender';

const { renderCount, unnecessaryRenderCount } = useGhostRender(options);
```

Call this hook **at the top level** of any function component. It follows all standard [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks).

---

### Options

```ts
interface UseGhostRenderOptions {
  componentName: string;
  props?: Record<string, unknown>;
  state?: Record<string, unknown>;
  onUnnecessaryRender?: (componentName: string, delta: RenderDelta) => void;
  silent?: boolean;
}
```

| Option | Type | Required | Default | Description |
|---|---|---|---|---|
| `componentName` | `string` | ✅ | — | Unique display name for the component. Shown in console warnings and callbacks. Use the component's function name. |
| `props` | `Record<string, unknown>` | — | `{}` | Pass your component's `props` object (or a subset). GhostRender shallow-compares each key with `Object.is`. |
| `state` | `Record<string, unknown>` | — | `{}` | Pass individual state values as a plain object. Keys are namespaced internally to avoid collisions with `props`. |
| `onUnnecessaryRender` | `(name: string, delta: RenderDelta) => void` | — | — | Custom callback fired on every unnecessary re-render. Useful for telemetry, analytics, and test assertions. |
| `silent` | `boolean` | — | `false` | When `true`, suppresses the default `console.groupCollapsed` warning. The `onUnnecessaryRender` callback still fires. |

---

### Return Value

```ts
interface UseGhostRenderResult {
  renderCount: number;
  unnecessaryRenderCount: number;
}
```

| Property | Type | Dev value | Prod value | Description |
|---|---|---|---|---|
| `renderCount` | `number` | Actual count | `0` | Total number of renders for this component instance since mount. |
| `unnecessaryRenderCount` | `number` | Actual count | `0` | Total renders where no prop/state values changed. |

---

### Types

All types are exported and available for TypeScript consumers:

```ts
import type {
  UseGhostRenderOptions,
  UseGhostRenderResult,
  PropsOrState,
  RenderDelta,
} from 'ghostrender';
```

```ts
/** A plain object snapshot of props or state. */
type PropsOrState = Record<string, unknown>;

/**
 * Map of changed keys to their before/after pair.
 * Empty ({}) means values are identical — a true unnecessary render.
 * Non-empty means references changed but values may be structurally same.
 */
type RenderDelta = Record<string, { prev: unknown; next: unknown }>;
```

---

## Usage Patterns

### Tracking Props

Pass your entire `props` object or a subset of the keys you care about:

```tsx
function Button({ onClick, label, disabled }: ButtonProps) {
  // Track all props
  useGhostRender({ componentName: 'Button', props });

  return <button onClick={onClick} disabled={disabled}>{label}</button>;
}
```

```tsx
// Or pass a subset (ignore props you expect to change frequently):
function HeavyChart({ data, width, height, theme }: ChartProps) {
  useGhostRender({
    componentName: 'HeavyChart',
    props: { width, height, theme }, // ignore 'data' if it always changes
  });
  // ...
}
```

---

### Tracking State

Pass individual state values as a plain object. Keys from `state` are namespaced internally (prefixed with `__state__`) to prevent collision with `props` keys:

```tsx
function TodoList() {
  const [items, setItems]     = useState<string[]>([]);
  const [filter, setFilter]   = useState<'all' | 'done' | 'pending'>('all');
  const [loading, setLoading] = useState(false);

  useGhostRender({
    componentName: 'TodoList',
    state: { items, filter, loading },
  });

  // ...
}
```

> **Note:** State values use the same `Object.is` shallow comparison as props.  
> Arrays and objects are compared **by reference**, not by value.

---

### Tracking Props + State Together

You can pass both `props` and `state` simultaneously. GhostRender merges them into a single comparison snapshot:

```tsx
interface DataGridProps {
  pageSize: number;
  sortField: string;
}

function DataGrid({ pageSize, sortField }: DataGridProps) {
  const [page, setPage]         = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch]     = useState('');

  const { renderCount, unnecessaryRenderCount } = useGhostRender({
    componentName: 'DataGrid',
    props: { pageSize, sortField },   // ← from parent
    state: { page, selected, search }, // ← internal state
  });

  return (
    <div>
      <p>Renders: {renderCount} | Wasted: {unnecessaryRenderCount}</p>
      {/* grid content */}
    </div>
  );
}
```

---

### Custom Callback

The `onUnnecessaryRender` callback receives the component name and a `RenderDelta` object:

```tsx
function MyComponent(props: MyProps) {
  useGhostRender({
    componentName: 'MyComponent',
    props,
    onUnnecessaryRender: (componentName, delta) => {
      // `delta` is empty ({}) for truly unnecessary renders
      // `delta` has entries when references changed but values are identical
      console.table(delta);

      // Send to your analytics platform:
      analytics.track('react.unnecessary_render', {
        component: componentName,
        changedKeys: Object.keys(delta),
      });
    },
  });
}
```

The `delta` object has the shape `{ [key]: { prev: unknown, next: unknown } }`:

```ts
// Example delta when an inline function prop changes reference:
{
  onClick: {
    prev: [Function: handleClick],
    next: [Function: handleClick], // different reference, same body
  }
}

// Example delta for a truly unnecessary render (no changes at all):
{}
```

---

### Silent Mode

Use `silent: true` to suppress the default `console.groupCollapsed` warning. The `onUnnecessaryRender` callback still fires — this is ideal for CI/CD pipelines, automated testing, or when you want fully custom output:

```tsx
function ProductCard(props: ProductCardProps) {
  useGhostRender({
    componentName: 'ProductCard',
    props,
    silent: true,          // no console noise in test runs
    onUnnecessaryRender: (name, delta) => {
      // Your own handler
      reportToMonitoring(name, delta);
    },
  });
}
```

---

### Accessing Render Counts

Use the return values to render live debug overlays, status badges, or drive test assertions:

```tsx
function DebugWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function MyComponent(props: MyProps) {
  const { renderCount, unnecessaryRenderCount } = useGhostRender({
    componentName: 'MyComponent',
    props,
  });

  return (
    <div style={{ position: 'relative' }}>
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          fontSize: 10, background: 'rgba(0,0,0,0.7)',
          color: unnecessaryRenderCount > 0 ? 'red' : 'green',
          padding: '2px 6px', borderRadius: 4,
        }}>
          {renderCount} renders · {unnecessaryRenderCount} wasted
        </div>
      )}
      {/* component content */}
    </div>
  );
}
```

---

## Console Output

### Unnecessary Render Warning

When a component re-renders with **no prop or state value changes**, GhostRender emits a `console.groupCollapsed` warning styled with CSS:

```
╔═ 🟣 GhostRender ══════════════════════════════════════════════════╗
║  Unnecessary re-render detected in <MyComponent> (render #5)      ║
║                                                                    ║
║  No prop or state values changed. This render was completely       ║
║  unnecessary.                                                      ║
║  Consider wrapping this component in React.memo() or checking      ║
║  parent render triggers.                                           ║
║                                                                    ║
║  Component: MyComponent                                            ║
╚════════════════════════════════════════════════════════════════════╝
```

The group is **collapsed by default** — it won't flood the console during normal development. Click to expand and see the full detail.

### Reference Inequality Warning

When prop/state **references** changed but the **values** are structurally the same (e.g., a new inline object `{}` or new function reference `() => {}`), GhostRender surfaces each key:

```
╔═ 🟣 GhostRender ══════════════════════════════════════════════════╗
║  Unnecessary re-render detected in <Button> (render #8)           ║
║                                                                    ║
║  Changed references (same values — consider memoisation):         ║
║  onClick:  [Function: handleClick] → [Function: handleClick]      ║
║  style:    {"color":"red"} → {"color":"red"}                      ║
║                                                                    ║
║  Component: Button                                                 ║
╚════════════════════════════════════════════════════════════════════╝
```

This is the clearest signal that you need `useCallback` or `useMemo` in the **parent** component.

---

## Production Safety

### How it Works

GhostRender evaluates the environment **once at module import time**:

```ts
// Simplified internal logic
const IS_DEV = process.env.NODE_ENV !== 'production';

export const useGhostRender = IS_DEV
  ? useGhostRenderDev    // full implementation
  : useGhostRenderNoop;  // () => ({ renderCount: 0, unnecessaryRenderCount: 0 })
```

When `IS_DEV` is `false`, the entire `useGhostRenderDev` implementation is **dead-code-eliminated** by your bundler. The only code that ships to production is a tiny function that returns `{ renderCount: 0, unnecessaryRenderCount: 0 }`.

### Bundler Compatibility

| Bundler | Dead-code elimination | Notes |
|---|---|---|
| **Vite** (esbuild) | ✅ | `import.meta.env.MODE` + `process.env.NODE_ENV` both handled |
| **webpack** (CRA, Next.js) | ✅ | Standard `process.env.NODE_ENV` replacement |
| **Rollup** | ✅ | Standard `process.env.NODE_ENV` replacement |
| **esbuild** (standalone) | ✅ | `--define:process.env.NODE_ENV='"production"'` |
| **Parcel** | ✅ | Automatic |
| **Turbopack** | ✅ | Automatic |

### Environment Detection

GhostRender checks in this order:

1. **Vite**: `import.meta.env.MODE` (accessed at runtime via `new Function` to avoid CJS compile errors)
2. **Node / webpack / CRA / Next.js**: `process.env.NODE_ENV`
3. **Fallback**: Assumes development (safer to have warnings than to miss them)

```ts
// You can verify what GhostRender detected:
if (process.env.NODE_ENV !== 'production') {
  console.log('GhostRender is active');
}
```

---

## Common Patterns & Fixes

Once GhostRender identifies an unnecessary re-render, here are the standard fixes:

### React.memo — Prevent Parent-Triggered Re-renders

**Problem:** Component re-renders every time its parent re-renders, even when its own props didn't change.

```tsx
// ❌ Before — re-renders on every parent tick
function Avatar({ url, name }: AvatarProps) {
  useGhostRender({ componentName: 'Avatar', props: { url, name } });
  return <img src={url} alt={name} />;
}

// ✅ After — only re-renders when url or name changes
const Avatar = memo(function Avatar({ url, name }: AvatarProps) {
  useGhostRender({ componentName: 'Avatar', props: { url, name } });
  return <img src={url} alt={name} />;
});
```

---

### useCallback — Stabilise Function Props

**Problem:** GhostRender reports `onClick: [Function] → [Function]` (same behaviour, new reference).

```tsx
// ❌ Before — creates a new function on every parent render
function Parent() {
  const [count, setCount] = useState(0);
  
  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>Inc</button>
      {/* Avatar gets a new `onHover` reference every render */}
      <Avatar onHover={() => console.log('hovered')} />
    </>
  );
}

// ✅ After — stable reference, Avatar stops re-rendering
function Parent() {
  const [count, setCount] = useState(0);
  const handleHover = useCallback(() => console.log('hovered'), []);
  
  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>Inc</button>
      <Avatar onHover={handleHover} />
    </>
  );
}
```

---

### useMemo — Stabilise Object Props

**Problem:** GhostRender reports `style: {"color":"red"} → {"color":"red"}` (new object reference each render).

```tsx
// ❌ Before — new object reference on every render
function Chart({ data }: ChartProps) {
  return (
    <Line
      data={data}
      options={{ scales: { x: { type: 'time' } } }} // new object every time!
    />
  );
}

// ✅ After — stable reference
function Chart({ data }: ChartProps) {
  const options = useMemo(
    () => ({ scales: { x: { type: 'time' } } }),
    [] // empty deps — this object never needs to change
  );
  
  return <Line data={data} options={options} />;
}
```

---

### Context — Splitting Contexts

**Problem:** A component consumes a large context object; only one field changes but the whole consumer re-renders.

```tsx
// ❌ Before — every context consumer re-renders when ANY field changes
const AppContext = createContext({ user: null, theme: 'dark', sidebar: true });

function ThemeButton() {
  const { theme } = useContext(AppContext); // re-renders on user changes too!
  useGhostRender({ componentName: 'ThemeButton', state: { theme } });
  return <button>{theme}</button>;
}

// ✅ After — split into focused contexts
const ThemeContext = createContext('dark');
const UserContext = createContext(null);

function ThemeButton() {
  const theme = useContext(ThemeContext); // only re-renders on theme changes
  useGhostRender({ componentName: 'ThemeButton', state: { theme } });
  return <button>{theme}</button>;
}
```

---

## TypeScript

GhostRender is written in strict TypeScript and ships full `.d.ts` declarations. No `@types` package needed.

```ts
import { useGhostRender } from 'ghostrender';
import type {
  UseGhostRenderOptions,
  UseGhostRenderResult,
  PropsOrState,
  RenderDelta,
} from 'ghostrender';

// The hook is fully typed — options and return are inferred
const result: UseGhostRenderResult = useGhostRender({
  componentName: 'MyComponent', // string — required
  props: { id: 1 },            // PropsOrState — optional
  state: { open: false },       // PropsOrState — optional
  silent: false,                // boolean — optional
  onUnnecessaryRender: (       // typed callback
    name: string,
    delta: RenderDelta
  ) => void,
});
```

The package ships three build targets:

| Format | Path | Use case |
|---|---|---|
| **ESM** | `dist/esm/index.js` | Vite, Rollup, modern bundlers |
| **CJS** | `dist/cjs/index.js` | Next.js (pages router), Jest, Node.js |
| **Types** | `dist/types/index.d.ts` | TypeScript declarations |

---

## Integration with Testing

Use `silent: true` + `onUnnecessaryRender` to write automated assertions about render efficiency:

```tsx
import { renderHook, render } from '@testing-library/react';
import { useGhostRender } from 'ghostrender';

describe('MyComponent render efficiency', () => {
  it('does not re-render unnecessarily when props are unchanged', () => {
    const unnecessaryRenders: string[] = [];

    const { rerender } = render(
      <MyComponent
        title="Hello"
        onUnnecessaryRender={(name) => unnecessaryRenders.push(name)} // inject via prop
      />
    );

    // Re-render with identical props
    rerender(<MyComponent title="Hello" />);

    expect(unnecessaryRenders).toHaveLength(0);
  });
});
```

Or test the hook directly:

```ts
import { renderHook } from '@testing-library/react';
import { useGhostRender } from 'ghostrender';

it('flags a render as unnecessary when props are identical', () => {
  const cb = jest.fn();
  const { rerender } = renderHook(
    ({ count }: { count: number }) =>
      useGhostRender({
        componentName: 'Widget',
        props: { count },
        onUnnecessaryRender: cb,
        silent: true,
      }),
    { initialProps: { count: 42 } }
  );

  rerender({ count: 42 }); // same value — should fire callback

  expect(cb).toHaveBeenCalledTimes(1);
  expect(cb).toHaveBeenCalledWith('Widget', {}); // empty delta = truly unnecessary
});
```

---

## Integration with Analytics / Telemetry

Track render efficiency in production dashboards by combining `silent: true` with a custom callback. Since the hook is a **no-op in production**, use a separate environment check:

```tsx
function MyComponent(props: MyProps) {
  useGhostRender({
    componentName: 'MyComponent',
    props,
    silent: true,
    onUnnecessaryRender: (name, delta) => {
      // This callback itself is only reachable in dev mode
      // (the whole hook is a no-op in production)
      if (process.env.REACT_APP_PERF_TRACKING === 'true') {
        fetch('/api/perf', {
          method: 'POST',
          body: JSON.stringify({ component: name, delta, ts: Date.now() }),
        });
      }
    },
  });
}
```

---

## Project Structure

```
ghostrender/
├── src/
│   ├── index.ts            ← Public barrel export
│   ├── types.ts            ← All TypeScript types
│   ├── useGhostRender.ts   ← Core hook (dev impl + prod no-op)
│   ├── shallowEqual.ts     ← Object.is shallow comparison + delta
│   ├── reporter.ts         ← Styled console output
│   └── __tests__/
│       ├── shallowEqual.test.ts
│       └── useGhostRender.test.tsx
├── demo/                   ← Interactive Vite demo app
│   └── src/
│       ├── App.tsx         ← Full featured showcase
│       └── index.css       ← Demo styles
├── dist/                   ← Built output (git-ignored)
│   ├── esm/
│   ├── cjs/
│   └── types/
├── LICENSE                 ← MIT
├── package.json
├── jest.config.js
├── tsconfig.esm.json
├── tsconfig.cjs.json
└── tsconfig.types.json
```

---

## Contributing

Contributions are welcome! Please open an issue or pull request on [GitHub](https://github.com/ghostrender/ghostrender).

```bash
# Clone
git clone https://github.com/ghostrender/ghostrender.git
cd ghostrender

# Install
npm install

# Build
npm run build

# Test
npm test

# Run the interactive demo
cd demo && npm install && npm run dev
```

### Guidelines

- Keep `src/` dependency-free (no runtime dependencies beyond React)
- All changes must pass `npm test` with no regressions
- Add tests for any new behaviour
- Keep the production no-op path clean — verify with `npm run build`

---

## License

[MIT](./LICENSE) © 2026 GhostRender Contributors

Free for personal, commercial, and enterprise use. See [LICENSE](./LICENSE) for full terms.

---

<div align="center">
  <sub>Made with ❤️ to make React performance visible</sub>
</div>
