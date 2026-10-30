/**
 * GhostRender Demo — App.tsx (fixed)
 *
 * Key fix: onUnnecessaryRender fires during the child's render phase.
 * Calling setState on App from inside another component's render phase
 * triggers React 18's "Cannot update during rendering" guard and the
 * update is silently dropped. We defer all state mutations via
 * Promise.resolve().then() so they happen POST-render.
 */

import React, {
  useState,
  useCallback,
  memo,
  useRef,
  useEffect,
} from 'react'
import { useGhostRender } from 'ghostrender'
import type { RenderDelta } from 'ghostrender'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface LogEntry {
  id: number
  component: string
  renderNum: number
  delta: RenderDelta
  time: string
  hint: string
}

interface GlobalStats {
  unnecessary: number
  total: number
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
let _logId = 0

function formatTime() {
  const d = new Date()
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0'))
    .join(':')
}

function buildHint(delta: RenderDelta) {
  return Object.keys(delta).length > 0
    ? '→ References changed with same values. Use useCallback / useMemo in the parent.'
    : '→ No values changed at all. Wrap this component in React.memo() to bail out.'
}

// ─────────────────────────────────────────────────────────────
// useCountBump — CSS animation when a number changes
// ─────────────────────────────────────────────────────────────
function useCountBump(value: number) {
  const ref = useRef<HTMLSpanElement>(null)
  const prev = useRef(value)
  useEffect(() => {
    if (prev.current !== value && ref.current) {
      ref.current.classList.remove('count-bump')
      void ref.current.offsetWidth           // force reflow
      ref.current.classList.add('count-bump')
    }
    prev.current = value
  }, [value])
  return ref
}

// ─────────────────────────────────────────────────────────────
// useFlash — flashes a border colour then fades
// ─────────────────────────────────────────────────────────────
function useFlash() {
  const ref = useRef<HTMLDivElement>(null)
  const flash = useCallback((type: 'unnecessary' | 'necessary') => {
    const el = ref.current
    if (!el) return
    el.classList.remove('flash-unnecessary', 'flash-necessary')
    void el.offsetWidth
    el.classList.add(`flash-${type}`)
    setTimeout(() => el.classList.remove(`flash-${type}`), 700)
  }, [])
  return [ref, flash] as const
}

// ─────────────────────────────────────────────────────────────
// Demo Component A: UserCard  (not memoised)
// ─────────────────────────────────────────────────────────────
interface UserCardProps {
  username: string
  role: string
  silent: boolean
  onUnnecessaryRender: (name: string, delta: RenderDelta) => void
}

function UserCard({ username, role, silent, onUnnecessaryRender }: UserCardProps) {
  const { renderCount, unnecessaryRenderCount } = useGhostRender({
    componentName: 'UserCard',
    props: { username, role },
    silent,
    onUnnecessaryRender,
  })

  const [boxRef, flash] = useFlash()
  const rcRef  = useCountBump(renderCount)
  const ucRef  = useCountBump(unnecessaryRenderCount)
  const prevUC = useRef(0)

  useEffect(() => {
    if (unnecessaryRenderCount > prevUC.current) {
      flash('unnecessary')
    } else if (renderCount > 1) {
      flash('necessary')
    }
    prevUC.current = unnecessaryRenderCount
  })

  return (
    <div className="component-box" ref={boxRef}>
      <div className="component-label">
        <span className="tag">&lt;UserCard&gt;</span>
        <span>no memo</span>
        <span className="memo-badge off">React.memo ✕</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0, color: '#fff', fontWeight: 700,
        }}>
          {username.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{username}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{role}</div>
        </div>
      </div>
      <div className="counters">
        <div className="counter total">
          <div className="counter-value"><span ref={rcRef}>{renderCount}</span></div>
          <div className="counter-label">Total</div>
        </div>
        <div className="counter wasted">
          <div className="counter-value"><span ref={ucRef}>{unnecessaryRenderCount}</span></div>
          <div className="counter-label">Wasted</div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Demo Component B: UserCardMemo  (wrapped in React.memo)
// ─────────────────────────────────────────────────────────────
const UserCardMemo = memo(function UserCardMemo({ username, role, silent, onUnnecessaryRender }: UserCardProps) {
  const { renderCount, unnecessaryRenderCount } = useGhostRender({
    componentName: 'UserCard (memo)',
    props: { username, role },
    silent,
    onUnnecessaryRender,
  })

  const [boxRef, flash] = useFlash()
  const rcRef  = useCountBump(renderCount)
  const ucRef  = useCountBump(unnecessaryRenderCount)

  useEffect(() => {
    flash('necessary')   // every real render = green (memo prevents unnecessary ones)
  })

  return (
    <div className="component-box" ref={boxRef}
         style={{ borderColor: 'var(--green)', boxShadow: '0 0 16px var(--green-glow)' }}>
      <div className="component-label">
        <span className="tag">&lt;UserCardMemo&gt;</span>
        <span>with memo</span>
        <span className="memo-badge on">React.memo ✓</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'linear-gradient(135deg, #10b981, #06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0, color: '#fff', fontWeight: 700,
        }}>
          {username.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{username}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{role}</div>
        </div>
      </div>
      <div className="counters">
        <div className="counter total">
          <div className="counter-value"><span ref={rcRef}>{renderCount}</span></div>
          <div className="counter-label">Total</div>
        </div>
        <div className="counter wasted">
          <div className="counter-value"><span ref={ucRef}>{unnecessaryRenderCount}</span></div>
          <div className="counter-label">Wasted</div>
        </div>
      </div>
    </div>
  )
})

// ─────────────────────────────────────────────────────────────
// Demo Component C: CounterWidget  (tracks state)
// ─────────────────────────────────────────────────────────────
interface CounterWidgetProps {
  label: string
  silent: boolean
  onUnnecessaryRender: (name: string, delta: RenderDelta) => void
}

function CounterWidget({ label, silent, onUnnecessaryRender }: CounterWidgetProps) {
  const [count, setCount] = useState(0)
  const [step, setStep]   = useState(1)

  const { renderCount, unnecessaryRenderCount } = useGhostRender({
    componentName: 'CounterWidget',
    props: { label },
    state: { count, step },
    silent,
    onUnnecessaryRender,
  })

  const [boxRef, flash] = useFlash()
  const rcRef  = useCountBump(renderCount)
  const ucRef  = useCountBump(unnecessaryRenderCount)
  const prevUC = useRef(0)

  useEffect(() => {
    if (unnecessaryRenderCount > prevUC.current) flash('unnecessary')
    prevUC.current = unnecessaryRenderCount
  })

  return (
    <div className="component-box" ref={boxRef}>
      <div className="component-label">
        <span className="tag">&lt;CounterWidget&gt;</span>
        <span>tracks state</span>
      </div>
      <div style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--cyan)', textAlign: 'center', padding: '8px 0' }}>
        {count}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 12 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Step:</span>
        <input type="number" value={step} min={1}
               onChange={e => setStep(Number(e.target.value))}
               style={{ width: 64, textAlign: 'center' }} />
      </div>
      <div className="btn-group">
        <button className="btn btn-primary" onClick={() => setCount(c => c + step)}>+ {step}</button>
        <button className="btn btn-ghost"   onClick={() => setCount(c => c - step)}>− {step}</button>
        <button className="btn btn-ghost"   onClick={() => setCount(0)}>Reset</button>
        <button className="btn btn-danger"  onClick={() => setCount(count)}>
          👻 Force no-op
        </button>
      </div>
      <div className="counters" style={{ marginTop: 12 }}>
        <div className="counter total">
          <div className="counter-value"><span ref={rcRef}>{renderCount}</span></div>
          <div className="counter-label">Total</div>
        </div>
        <div className="counter wasted">
          <div className="counter-value"><span ref={ucRef}>{unnecessaryRenderCount}</span></div>
          <div className="counter-label">Wasted</div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Demo Component D: ProductList  (props + state)
// ─────────────────────────────────────────────────────────────
interface ProductListProps {
  category: string
  silent: boolean
  onUnnecessaryRender: (name: string, delta: RenderDelta) => void
}

const PRODUCTS = [
  { id: 1, name: 'Wireless Headphones', price: 79 },
  { id: 2, name: 'Mechanical Keyboard',  price: 149 },
  { id: 3, name: 'USB-C Hub',            price: 39 },
]

function ProductList({ category, silent, onUnnecessaryRender }: ProductListProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [sortAsc, setSortAsc]   = useState(true)

  const { renderCount, unnecessaryRenderCount } = useGhostRender({
    componentName: 'ProductList',
    props:  { category },
    state:  { selected, sortAsc },
    silent,
    onUnnecessaryRender,
  })

  const [boxRef, flash] = useFlash()
  const rcRef  = useCountBump(renderCount)
  const ucRef  = useCountBump(unnecessaryRenderCount)
  const prevUC = useRef(0)

  useEffect(() => {
    if (unnecessaryRenderCount > prevUC.current) flash('unnecessary')
    prevUC.current = unnecessaryRenderCount
  })

  const sorted = [...PRODUCTS].sort((a, b) => sortAsc ? a.price - b.price : b.price - a.price)

  return (
    <div className="component-box" ref={boxRef}>
      <div className="component-label">
        <span className="tag">&lt;ProductList&gt;</span>
        <span>props + state</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{category}</span>
        <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={() => setSortAsc(a => !a)}>
          {sortAsc ? '↑ Price' : '↓ Price'}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {sorted.map(p => (
          <div key={p.id}
               onClick={() => setSelected(selected === p.id ? null : p.id)}
               style={{
                 padding: '8px 10px', borderRadius: 6,
                 border: `1px solid ${selected === p.id ? 'var(--purple)' : 'var(--border)'}`,
                 background: selected === p.id ? 'rgba(124,58,237,0.1)' : 'var(--bg-base)',
                 cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                 fontSize: '0.8rem', transition: 'all 0.15s',
               }}>
            <span>{p.name}</span>
            <span style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>${p.price}</span>
          </div>
        ))}
      </div>
      <div className="btn-group">
        <button className="btn btn-danger" onClick={() => setSelected(selected)}>
          👻 Same selection
        </button>
      </div>
      <div className="counters">
        <div className="counter total">
          <div className="counter-value"><span ref={rcRef}>{renderCount}</span></div>
          <div className="counter-label">Total</div>
        </div>
        <div className="counter wasted">
          <div className="counter-value"><span ref={ucRef}>{unnecessaryRenderCount}</span></div>
          <div className="counter-label">Wasted</div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Demo Component E: SearchBar  (input state)
// ─────────────────────────────────────────────────────────────
interface SearchBarProps {
  placeholder: string
  silent: boolean
  onUnnecessaryRender: (name: string, delta: RenderDelta) => void
}

function SearchBar({ placeholder, silent, onUnnecessaryRender }: SearchBarProps) {
  const [query,   setQuery]   = useState('')
  const [focused, setFocused] = useState(false)

  const { renderCount, unnecessaryRenderCount } = useGhostRender({
    componentName: 'SearchBar',
    props:  { placeholder },
    state:  { query, focused },
    silent,
    onUnnecessaryRender,
  })

  const [boxRef, flash] = useFlash()
  const rcRef  = useCountBump(renderCount)
  const ucRef  = useCountBump(unnecessaryRenderCount)
  const prevUC = useRef(0)

  useEffect(() => {
    if (unnecessaryRenderCount > prevUC.current) flash('unnecessary')
    prevUC.current = unnecessaryRenderCount
  })

  return (
    <div className="component-box" ref={boxRef}>
      <div className="component-label">
        <span className="tag">&lt;SearchBar&gt;</span>
        <span>input state</span>
      </div>
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}>🔍</span>
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          style={{ paddingLeft: 34 }}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>
      {query && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10 }}>
          Results for: <span style={{ color: 'var(--purple-light)' }}>"{query}"</span>
        </div>
      )}
      <div className="btn-group">
        <button className="btn btn-danger" onClick={() => setQuery(query)}>👻 Same query</button>
        <button className="btn btn-ghost"  onClick={() => setQuery('')}>Clear</button>
      </div>
      <div className="counters">
        <div className="counter total">
          <div className="counter-value"><span ref={rcRef}>{renderCount}</span></div>
          <div className="counter-label">Total</div>
        </div>
        <div className="counter wasted">
          <div className="counter-value"><span ref={ucRef}>{unnecessaryRenderCount}</span></div>
          <div className="counter-label">Wasted</div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Ghost Log Panel
// ─────────────────────────────────────────────────────────────
function GhostLogPanel({ entries }: { entries: LogEntry[] }) {
  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0
  }, [entries.length])

  function fmtDelta(delta: RenderDelta) {
    const keys = Object.keys(delta)
    if (!keys.length) return null
    return keys.map(k =>
      `${k}: ${JSON.stringify(delta[k].prev)} → ${JSON.stringify(delta[k].next)}`
    ).join(' | ')
  }

  return (
    <div className="log-panel">
      <div className="log-header">
        <div className="log-header-left">
          <span className="log-dot" />
          GhostRender Live Feed
        </div>
        <span className="log-count">{entries.length} caught</span>
      </div>
      <div className="log-body" ref={bodyRef}>
        {entries.map(e => (
          <div className="log-entry" key={e.id}>
            <div className="log-entry-header">
              <span>👻</span>
              <span className="log-component">&lt;{e.component}&gt;</span>
              <span className="log-render-num">render #{e.renderNum}</span>
              <span className="log-time">{e.time}</span>
            </div>
            <div className="log-message">
              {fmtDelta(e.delta)
                ? <>Changed refs: <code style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{fmtDelta(e.delta)}</code></>
                : 'No prop/state values changed — completely unnecessary.'}
            </div>
            <div className="log-hint">{e.hint}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Code Snippet
// ─────────────────────────────────────────────────────────────
function CodeSnippet({ code }: { code: string }) {
  const html = code
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(\/\/[^\n]*)/g,    '<span class="cm">$1</span>')
    .replace(/\b(import|from|export|const|function|return|interface)\b/g, '<span class="kw">$1</span>')
    .replace(/\b(useGhostRender|useCallback|useMemo|memo|useState|useEffect)\b/g, '<span class="fn">$1</span>')
    .replace(/'([^']*)'/g,       "<span class=\"str\">'$1'</span>")
    .replace(/([{}()[\]])/g,     '<span class="br">$1</span>')
  return <div className="code-block" dangerouslySetInnerHTML={{ __html: html }} />
}

// ─────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [silent,     setSilent]     = useState(false)
  const [parentTick, setParentTick] = useState(0)
  const [log,        setLog]        = useState<LogEntry[]>([])
  const [stats,      setStats]      = useState<GlobalStats>({ unnecessary: 0, total: 0 })

  const tickRef = useCountBump(parentTick)

  // ── KEY FIX ───────────────────────────────────────────────
  // onUnnecessaryRender is called DURING a child's render phase.
  // Calling setState on App at that moment triggers React 18's
  // "Cannot update a component while rendering a different component"
  // guard and the update is silently dropped.
  //
  // Fix: defer all state mutations to AFTER the current render cycle
  // via Promise.resolve().then() (a microtask scheduled post-render).
  // ─────────────────────────────────────────────────────────
  const handleUnnecessaryRender = useCallback((name: string, delta: RenderDelta) => {
    Promise.resolve().then(() => {
      const entry: LogEntry = {
        id:        ++_logId,
        component: name,
        renderNum: _logId,
        delta,
        time:      formatTime(),
        hint:      buildHint(delta),
      }
      setLog(prev => [entry, ...prev].slice(0, 40))
      setStats(prev => ({
        unnecessary: prev.unnecessary + 1,
        total:       prev.total + 1,
      }))
    })
  }, [])

  // Each "Tick Parent" counts as one intentional necessary render
  const handleTickParent = useCallback(() => {
    setParentTick(t => t + 1)
    // Count the parent re-render itself as a "total" render for stats purposes
    Promise.resolve().then(() =>
      setStats(prev => ({ ...prev, total: prev.total + 1 }))
    )
  }, [])

  const wasteRatio = stats.total > 0
    ? Math.round((stats.unnecessary / stats.total) * 100)
    : 0

  return (
    <div className="app">

      {/* ── Hero ─────────────────────────────── */}
      <div className="hero">
        <div className="hero-badge">
          <span className="dot" />
          Open Source · MIT License
        </div>
        <h1>
          <span className="ghost">👻</span>{' '}
          <span className="gradient-text">GhostRender</span>
        </h1>
        <p className="hero-sub">
          A dev-only React hook that catches unnecessary re-renders before they
          reach production. Zero overhead, full visibility.
        </p>
        <div className="hero-chips">
          <span className="chip">🔧 npm i ghostrender</span>
          <span className="chip">⚛️ React ≥ 16.8</span>
          <span className="chip">📦 Zero prod overhead</span>
          <span className="chip">🔷 TypeScript</span>
          <span className="chip">⚡ ESM + CJS</span>
        </div>
      </div>

      {/* ── Global Stats ──────────────────────── */}
      <div className="stats-bar">
        <div className="stat-card purple">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Renders Tracked</div>
        </div>
        <div className="stat-card red">
          <div className="stat-value">{stats.unnecessary}</div>
          <div className="stat-label">Unnecessary</div>
        </div>
        <div className="stat-card green">
          <div className="stat-value">{stats.total - stats.unnecessary}</div>
          <div className="stat-label">Necessary</div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-value">{wasteRatio}%</div>
          <div className="stat-label">Waste Ratio</div>
        </div>
      </div>

      {/* ── Settings ─────────────────────────── */}
      <div className="section">
        <div className="section-header">
          <div className="section-icon purple">⚙️</div>
          <div>
            <h2>Global Settings</h2>
            <p>Adjust GhostRender behaviour for all demo components</p>
          </div>
        </div>
        <div className="card" style={{ maxWidth: 480 }}>
          <div className="toggle-row">
            <div className="toggle-info">
              Silent mode
              <small>Suppresses console warnings — only the callback fires</small>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={silent} onChange={e => setSilent(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
          {!silent && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--amber)' }}>
              💡 Open DevTools console to see styled GhostRender warnings
            </div>
          )}
        </div>
      </div>

      {/* ── Scenario 1: Parent Cascade ────────── */}
      <div className="section">
        <div className="section-header">
          <div className="section-icon red">⚡</div>
          <div>
            <h2>Scenario 1 — Parent Re-render Cascade</h2>
            <p>Clicking "Tick Parent" updates App state. UserCard (no memo) re-renders unnecessarily; memoised one stays still.</p>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div className="card-title" style={{ fontSize: '1rem', marginBottom: 4 }}>
                Parent Tick:{' '}
                <span style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}
                      ref={tickRef}>
                  {parentTick}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Watch the left card's <span style={{ color: 'var(--red)' }}>Wasted</span> counter rise
                while the right card stays at <span style={{ color: 'var(--green)' }}>0</span>.
              </div>
            </div>
            <button className="btn btn-primary" style={{ fontSize: '0.95rem', padding: '10px 24px' }}
                    onClick={handleTickParent}>
              ⚡ Tick Parent
            </button>
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-title">Without React.memo</div>
            <div className="card-desc">GhostRender catches the unnecessary re-render — box flashes red.</div>
            <UserCard
              username="alice"
              role="Senior Engineer"
              silent={silent}
              onUnnecessaryRender={handleUnnecessaryRender}
            />
          </div>
          <div className="card">
            <div className="card-title">With React.memo</div>
            <div className="card-desc">React.memo bails out — zero unnecessary renders detected, box stays green.</div>
            <UserCardMemo
              username="alice"
              role="Senior Engineer"
              silent={silent}
              onUnnecessaryRender={handleUnnecessaryRender}
            />
          </div>
        </div>

        <CodeSnippet code={`// Without memo — re-renders whenever parent re-renders
function UserCard(props) {
  useGhostRender({ componentName: 'UserCard', props })
  return <div>{props.username}</div>
}

// With memo — only re-renders when props actually change
const UserCardMemo = memo(function UserCard(props) {
  useGhostRender({ componentName: 'UserCard', props })
  return <div>{props.username}</div>
})`} />
      </div>

      {/* ── Scenario 2: State Tracking ────────── */}
      <div className="section">
        <div className="section-header">
          <div className="section-icon cyan">📊</div>
          <div>
            <h2>Scenario 2 — State Tracking</h2>
            <p>GhostRender watches both props and state. "Force no-op" sets state to its current value — caught immediately.</p>
          </div>
        </div>
        <div className="grid-2">
          <div className="card">
            <div className="card-title">CounterWidget — tracks count &amp; step</div>
            <div className="card-desc">"Force no-op" calls <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--purple-light)', fontSize: '0.8rem' }}>setCount(count)</code> — same value, unnecessary render.</div>
            <CounterWidget label="Demo Counter" silent={silent} onUnnecessaryRender={handleUnnecessaryRender} />
          </div>
          <div className="card">
            <div className="card-title">SearchBar — tracks query &amp; focus</div>
            <div className="card-desc">"Same query" triggers <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--purple-light)', fontSize: '0.8rem' }}>setQuery(query)</code> — caught as unnecessary.</div>
            <SearchBar placeholder="Search products…" silent={silent} onUnnecessaryRender={handleUnnecessaryRender} />
          </div>
        </div>

        <CodeSnippet code={`// Track both props AND state in one call
const [count, setCount] = useState(0)
const [step,  setStep]  = useState(1)

useGhostRender({
  componentName: 'CounterWidget',
  props: { label },        // prop snapshot
  state: { count, step },  // state snapshot — merged internally
  onUnnecessaryRender: (name, delta) => {
    console.log('Wasted render in', name, delta)
  },
})`} />
      </div>

      {/* ── Scenario 3: Props + State ──────────── */}
      <div className="section">
        <div className="section-header">
          <div className="section-icon pink">🛍️</div>
          <div>
            <h2>Scenario 3 — Props + State + Custom Callback</h2>
            <p>Mix props and state freely. Every unnecessary render is captured by the custom callback and streamed to the log below.</p>
          </div>
        </div>
        <div className="grid-2">
          <div className="card">
            <div className="card-title">ProductList</div>
            <div className="card-desc">"Same selection" sets state to its current value — caught as unnecessary.</div>
            <ProductList category="Electronics" silent={silent} onUnnecessaryRender={handleUnnecessaryRender} />
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-title">Custom Callback + Silent Mode</div>
            <div className="card-desc">
              The <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--purple-light)', fontSize: '0.8rem' }}>onUnnecessaryRender</code> callback
              fires on every unnecessary render — perfect for telemetry, analytics, or test assertions.
              Pair with <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--purple-light)', fontSize: '0.8rem' }}>silent: true</code> to suppress the default console output.
            </div>
            <CodeSnippet code={`useGhostRender({
  componentName: 'ProductList',
  props:  { category },
  state:  { selected, sortAsc },
  silent: true, // suppress console in CI/tests
  onUnnecessaryRender: (name, delta) => {
    analytics.track('unnecessary_render', {
      component: name,
      changedKeys: Object.keys(delta),
    })
  },
})`} />
          </div>
        </div>
      </div>

      {/* ── Live Log ─────────────────────────── */}
      <div className="section">
        <div className="section-header">
          <div className="section-icon green">📡</div>
          <div>
            <h2>Live Render Feed</h2>
            <p>Every unnecessary render across all demo components, captured via <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--purple-light)', fontSize: '0.8rem' }}>onUnnecessaryRender</code></p>
          </div>
        </div>
        <GhostLogPanel entries={log} />
        {log.length > 0 && (
          <div style={{ marginTop: 10, textAlign: 'right' }}>
            <button className="btn btn-ghost" style={{ fontSize: '0.75rem' }}
                    onClick={() => { setLog([]); setStats({ unnecessary: 0, total: 0 }) }}>
              Clear log &amp; reset stats
            </button>
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────── */}
      <div className="footer">
        <p>
          Built with ❤️ to make React performance visible ·{' '}
          <a href="https://github.com/anoopsingh12/ghostrender" target="_blank" rel="noreferrer">GitHub</a>
          {' '}·{' '}
          <a href="https://www.npmjs.com/package/ghostrender" target="_blank" rel="noreferrer">npm</a>
          {' '}·{' '}
          MIT License
        </p>
      </div>
    </div>
  )
}
