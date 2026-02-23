---
title: Developer Guide
description: "How to add new RPC methods, views, event handlers, work with the store, CSS theming, error handling patterns, and testing."
---

# Developer Guide

## Architecture Principles

1. **Platform abstraction** — All platform-specific APIs go through `src/lib/platform.ts`. Never call Electron or Capacitor APIs directly from components.
2. **Store-driven UI** — Components read state via `useStore()` and dispatch actions through store methods. Detail views may use local component state for editing workflows.
3. **Per-session isolation** — Streaming state, tool calls, and messages are keyed by session ID to support concurrent agent conversations.
4. **Modular client** — The OpenClaw client library is split into focused modules (chat, sessions, agents, etc.) for tree-shaking and maintainability.

---

## Adding a New RPC Method

1. **Add types** to `src/lib/openclaw/types.ts` (or the relevant module file)

2. **Create the function** in the appropriate module (e.g., `src/lib/openclaw/myfeature.ts`):

```typescript
import type { RpcCaller } from './types'

export async function myMethod(call: RpcCaller, param: string): Promise<MyResult> {
  try {
    return await call<MyResult>('my.method', { param })
  } catch (err) {
    console.warn('[myfeature] Failed:', err)
    return null
  }
}
```

3. **Add the delegation method** to `OpenClawClient` in `src/lib/openclaw/client.ts`:

```typescript
async myMethod(param: string): Promise<MyResult> {
  return myFeatureApi.myMethod(this.call.bind(this), param)
}
```

4. **Export** from `src/lib/openclaw/index.ts`:

```typescript
export * from './myfeature'
```

5. **Wire into the store** in `src/store/index.ts` if components need it.

---

## Adding a New View

1. **Add the view name** to the `mainView` union type in `src/store/index.ts`:

```typescript
mainView: 'chat' | ... | 'my-view'
```

2. **Create the component** in `src/components/MyView.tsx`:

```typescript
import { useStore } from '../store'

export function MyView() {
  const { closeDetailView } = useStore()

  return (
    <div className="detail-view">
      <div className="detail-header">
        <button className="detail-back" onClick={closeDetailView}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Back</span>
        </button>
        <div className="detail-title-section">
          <h1 className="detail-title">My View</h1>
        </div>
      </div>
      <div className="detail-content">
        {/* View content */}
      </div>
    </div>
  )
}
```

3. **Add the route** in `src/App.tsx`:

```typescript
{mainView === 'my-view' && <MyView />}
```

4. **Add an open action** in the store:

```typescript
openMyView: () => set({
  mainView: 'my-view',
  selectedSkill: null,
  selectedCronJob: null,
  selectedHook: null,
  selectedAgentDetail: null,
  selectedClawHubSkill: null
}),
```

---

## Adding a New Server Event Handler

1. Register the handler in the `connect()` method of `src/store/index.ts`:

```typescript
client.on('myEvent', (payload: unknown) => {
  const data = payload as { field: string }
  set((state) => ({
    // Update relevant state
  }))
})
```

2. The `OpenClawClient` emits events in its `handleEvent()` method (`src/lib/openclaw/client.ts`). Add handling there if the server sends a new event type:

```typescript
case 'myEvent':
  this.emit('myEvent', payload)
  break
```

---

## Working with the Store

### Reading State in Components

```typescript
import { useStore } from '../store'

function MyComponent() {
  const { sessions, currentSessionId } = useStore()
  // ...
}
```

### Reading State Outside React (event handlers, callbacks)

```typescript
const { client, currentSessionId } = useStore.getState()
```

### Derived Selectors

For per-session computed values, use the exported selectors:

```typescript
import { useStore, selectIsStreaming, selectActiveToolCalls } from '../store'

function MyComponent() {
  const isStreaming = useStore(selectIsStreaming)
  const toolCalls = useStore(selectActiveToolCalls)
}
```

### Updating State

Always use `set()` with a function for state that depends on previous values:

```typescript
set((state) => ({
  sessions: state.sessions.filter(s => s.key !== deletedKey)
}))
```

---

## CSS Theming

The app uses CSS custom properties for theming, defined in `src/styles/index.css`.

### Key Variables

```css
/* Colors */
--bg-primary        /* Main background */
--bg-secondary      /* Card/section background */
--bg-elevated       /* Elevated surface */
--bg-hover          /* Hover state */
--text-primary      /* Primary text */
--text-secondary    /* Secondary/muted text */
--accent-blue       /* Primary accent */
--accent-green      /* Success/online */
--border-color      /* Standard borders */
--border-subtle     /* Subtle borders */

/* Typography */
--font-mono         /* JetBrains Mono */
--font-display      /* Space Grotesk */
--font-body         /* Inter */

/* Spacing */
--space-xs: 4px
--space-sm: 8px
--space-md: 16px
--space-lg: 24px
--space-xl: 32px

/* Transitions */
--transition-fast: 150ms ease
--transition-normal: 250ms ease
```

### Adding Theme-Aware Styles

For inline styles in components, reference CSS variables:

```typescript
style={{ color: 'var(--text-secondary)', background: 'var(--bg-elevated)' }}
```

---

## Error Handling Patterns

### RPC Calls

Wrap in try/catch with `console.warn` for non-critical failures:

```typescript
try {
  const result = await client.myMethod()
  set({ data: result })
} catch (err) {
  console.warn('[feature] Failed:', err)
}
```

### Response Format Robustness

Server responses may change format. Always add fallback extraction:

```typescript
const items = Array.isArray(result)
  ? result
  : result?.items || result?.list || result?.data || []
```

### Optimistic Updates with Rollback

For toggles and mutations visible in the UI:

```typescript
// Optimistic update
set((state) => ({ items: state.items.map(i => i.id === id ? { ...i, enabled } : i) }))

try {
  await client.updateItem(id, { enabled })
} catch {
  // Rollback
  set((state) => ({ items: state.items.map(i => i.id === id ? { ...i, enabled: !enabled } : i) }))
}
```

---

## Config Patch Pattern

When modifying server configuration:

```typescript
// 1. Read current config with hash
const { config, hash } = await client.getServerConfig()

// 2. Build minimal patch
const patch = { section: { key: newValue } }

// 3. Send patch with base hash for conflict detection
await client.patchServerConfig(patch, hash)

// 4. Wait for server restart
await new Promise<void>((resolve) => {
  let resolved = false
  const onConnected = () => {
    if (!resolved) { resolved = true; client.off('connected', onConnected); resolve() }
  }
  client.on('connected', onConnected)
  setTimeout(onConnected, 5000) // Safety timeout
})

// 5. Reload fresh data
await fetchLatestData()
```

---

## Testing

### Running Tests

```bash
npm run test         # Watch mode
npm run test:run     # Single run
npm run typecheck    # Type checking only
```

### Test Setup

Tests use Vitest with jsdom environment, configured in `vite.config.ts`:

```typescript
test: {
  environment: 'jsdom',
  setupFiles: 'src/test/setup.ts'
}
```

### WSL2 Note

If `@rollup/rollup-linux-x64-gnu` is missing, tests won't run. Use `npx tsc --noEmit` for type validation as a fallback.

---

## Common Patterns

### Session Key Handling

Always use `s.key || s.id` when referencing sessions — the `key` is the canonical identifier but may not always be present in older data:

```typescript
const sessionKey = session.key || session.id
```

### Platform-Conditional Code

```typescript
import { isNativeMobile, isMobile } from '../lib/platform'

// Native mobile only (Capacitor)
if (isNativeMobile()) {
  // iOS/Android specific code
}

// Any mobile (including small screens)
if (isMobile()) {
  // Mobile-optimized behavior
}
```

### Reconnect-After-Config-Patch

When `config.patch` triggers a server restart, always wait for reconnection before proceeding. Use the pattern shown in the Config Patch section above.
