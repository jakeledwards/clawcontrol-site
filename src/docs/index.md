---
title: Documentation
description: "ClawControl documentation — architecture, API reference, developer guide, and more."
permalink: /docs/
---

# ClawControl Documentation

Welcome to the ClawControl documentation. ClawControl is a cross-platform desktop and mobile client for the OpenClaw AI assistant platform.

---

## Documentation Index

### For Users

- **[Getting Started](getting-started/)** — Installation, configuration, first connection, and building for production

### For Developers

- **[Architecture Guide](architecture/)** — System design, process structure, data flow, streaming architecture, platform abstraction, and security model

- **[Developer Guide](developer-guide/)** — How to add new RPC methods, views, event handlers, work with the store, CSS theming, error handling patterns, and testing

- **[State Management](state-management/)** — Complete Zustand store reference including all state fields, actions, selectors, event handlers, and the message lifecycle

### API & Protocol

- **[API Reference](api-reference/)** — Full OpenClaw Protocol v3 reference with all RPC methods, request/response types, server events, session key formats, and error handling conventions

### UI

- **[Component Reference](component-reference/)** — Catalog of all 25+ React components with purpose, features, store dependencies, and sub-components

---

## Quick Reference

### Common Commands

```bash
npm run dev          # Start desktop dev server
npm run mobile:dev   # Start mobile dev server
npm run typecheck    # Type check without emit
npm run lint         # ESLint
npm run test:run     # Run tests once
npm run build:win    # Build Windows installer
npm run build:mac    # Build macOS DMG
```

### Key Files

| File | Purpose |
|---|---|
| `src/store/index.ts` | Central state management |
| `src/lib/openclaw/client.ts` | WebSocket client core |
| `src/lib/platform.ts` | Platform abstraction |
| `src/App.tsx` | Root component & view routing |
| `src/styles/index.css` | Theme variables & global styles |
| `electron/main.ts` | Electron main process |
| `electron/preload.ts` | Electron IPC bridge |

### Architecture at a Glance

```
Electron/Capacitor
     |
     v
  React UI (components/)
     |
     v
  Zustand Store (store/)
     |
     v
  OpenClaw Client (lib/openclaw/)
     |
     v
  WebSocket JSON-RPC v3
     |
     v
  OpenClaw Server
```
