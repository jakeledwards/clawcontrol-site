---
title: Architecture Guide
description: "ClawControl system architecture — process structure, data flow, streaming, state management, authentication, platform abstraction, and security model."
---

# ClawDesk Architecture Guide

## Overview

ClawDesk (ClawControl) is a cross-platform desktop and mobile client for the OpenClaw AI assistant platform. It communicates with an OpenClaw server via a custom WebSocket-based JSON-RPC protocol (v3), supporting real-time streaming, multi-agent conversations, and device pairing.

**Platforms:** Windows, macOS (Electron) | iOS, Android (Capacitor) | Web (browser)

---

## System Architecture

```
                        +--------------------------+
                        |     OpenClaw Server       |
                        |  (WebSocket JSON-RPC v3)  |
                        +-----+------+------+------+
                              |      |      |
                    TLS/WSS   |      |      |  TLS/WSS
                  +-----------+      |      +----------+
                  |                  |                  |
          +-------v-------+  +------v-------+  +------v-------+
          | Electron App  |  |  iOS / iPad  |  | Android App  |
          | (Desktop)     |  |  (Capacitor) |  | (Capacitor)  |
          +-------+-------+  +------+-------+  +------+-------+
                  |                  |                  |
          +-------v------------------v------------------v-------+
          |                   React UI Layer                    |
          |   Components + Zustand Store + OpenClaw Client      |
          +----------------------------------------------------+
```

---

## Process Architecture

### Desktop (Electron)

```
+------------------------------------------------------------------+
|  Electron Main Process  (electron/main.ts)                       |
|  - Window management        - IPC handlers                       |
|  - Certificate trust store  - Secure token storage (safeStorage) |
|  - Ed25519 key generation   - ZIP extraction (ClawHub install)   |
|  - Subagent/tool popout windows                                  |
+-------------------+----------------------------------------------+
                    | IPC (contextBridge)
+-------------------v----------------------------------------------+
|  Electron Preload  (electron/preload.ts)                         |
|  - Exposes window.electronAPI                                    |
|  - Bridge: main <-> renderer                                     |
+-------------------+----------------------------------------------+
                    |
+-------------------v----------------------------------------------+
|  Renderer Process  (src/)                                        |
|  - React 18 application                                          |
|  - Zustand state management                                      |
|  - OpenClawClient (WebSocket)                                    |
+------------------------------------------------------------------+
```

### Mobile (Capacitor)

```
+------------------------------------------------------------------+
|  Native Layer  (iOS: Swift / Android: Kotlin)                    |
|  - Capacitor plugin bridge                                       |
|  - Native WebSocket (iOS TLS)     - Status bar, keyboard         |
|  - Local notifications             - Speech recognition           |
+-------------------+----------------------------------------------+
                    | Capacitor Bridge
+-------------------v----------------------------------------------+
|  Web Layer  (src/ built via vite.config.mobile.ts)               |
|  - Same React app, no Electron plugins                           |
|  - Platform abstraction via src/lib/platform.ts                  |
+------------------------------------------------------------------+
```

---

## Core Data Flow

```
User Input
    |
    v
InputArea Component
    |
    v
useStore().sendMessage()
    |
    +---> Creates session (if needed)
    +---> Adds user message to store
    +---> client.sendMessage() via WebSocket RPC
              |
              v
        OpenClaw Server
              |
              +---> chat event (delta) -----> streamChunk handler
              |                                    |
              |                                    v
              |                              Append to streaming
              |                              message in store
              |
              +---> agent event (tool) -----> toolCall handler
              |                                    |
              |                                    v
              |                              Add to sessionToolCalls
              |
              +---> agent event (lifecycle) -> streamEnd handler
              |
              +---> chat event (final) -----> message handler
                                                   |
                                                   v
                                             Replace streaming
                                             placeholder with
                                             canonical message
```

---

## Module Dependency Graph

```
src/
 |
 +-- App.tsx
 |    +-- components/*        (React UI)
 |    +-- store/index.ts      (Zustand store)
 |         +-- lib/openclaw/  (WebSocket client)
 |         |    +-- client.ts      (core connection)
 |         |    +-- chat.ts        (messaging)
 |         |    +-- sessions.ts    (session mgmt)
 |         |    +-- agents.ts      (agent mgmt)
 |         |    +-- skills.ts      (skill mgmt)
 |         |    +-- cron-jobs.ts   (cron mgmt)
 |         |    +-- config.ts      (server config)
 |         |    +-- hooks.ts       (webhook config)
 |         |    +-- nodes.ts       (device mgmt)
 |         |    +-- features.ts    (usage, TTS)
 |         |    +-- utils.ts       (text processing)
 |         |    +-- tool-display.ts(tool metadata)
 |         |    +-- types.ts       (shared types)
 |         |
 |         +-- lib/platform.ts     (platform abstraction)
 |         +-- lib/device-identity.ts (Ed25519 pairing)
 |         +-- lib/clawhub.ts      (skill registry)
 |
 +-- hooks/                   (React hooks)
 +-- utils/                   (utility functions)
 +-- styles/                  (CSS theming)
```

---

## Component Layout

```
+------------------------------------------------------------------+
| App                                                              |
| +----------+ +------------------------------------+ +-----------+|
| | Sidebar  | | main-content                       | | RightPanel||
| |          | | +--------------------------------+ | |           ||
| | Logo     | | | TopBar                         | | | Skills    ||
| | New Chat | | | Agent name | Think | Theme | ⚙ | | | Crons     ||
| | Dashboard| | +--------------------------------+ | | Hooks     ||
| | Usage    | | | ChatArea / DetailView          | | |           ||
| | Nodes    | | |                                | | |           ||
| |----------| | | Messages                       | | |           ||
| | Sessions | | | Tool calls                     | | |           ||
| | (grouped)| | | Subagent blocks                | | |           ||
| |          | | |                                | | |           ||
| |----------| | +--------------------------------+ | |           ||
| | Agent    | | | InputArea                      | | |           ||
| | Selector | | | Text | Voice | Attach | Send   | | |           ||
| +----------+ +------------------------------------+ +-----------+|
|                                                                  |
| +--------------------------------------------------------------+|
| | Modals: SettingsModal | CertErrorModal                       ||
| +--------------------------------------------------------------+|
+------------------------------------------------------------------+
```

### Main View Routing

The `mainView` state determines which component renders in the center:

| `mainView` value | Component | Description |
|---|---|---|
| `chat` | ChatArea + InputArea | Default chat interface |
| `skill-detail` | SkillDetailView | Individual skill inspector |
| `cron-detail` | CronJobDetailView | Cron job editor |
| `create-cron` | CreateCronJobView | New cron job form |
| `agent-detail` | AgentDetailView | Agent profile editor |
| `create-agent` | CreateAgentView | New agent form |
| `clawhub-skill-detail` | ClawHubSkillDetailView | ClawHub skill browser |
| `hook-detail` | HookDetailView | Hook configuration |
| `server-settings` | ServerSettingsView | Full server config editor |
| `usage` | UsageView | Usage statistics dashboard |
| `nodes` | NodesView | Node/device management |
| `pixel-dashboard` | AgentDashboard | Live agent activity grid |

---

## Streaming Architecture

The client uses **per-session stream isolation** to allow multiple agents to stream simultaneously.

```
Map<sessionKey, SessionStreamState>

SessionStreamState {
  source: 'chat' | 'agent' | null   // First event type claims the session
  text: string                       // Accumulated text
  mode: 'delta' | 'cumulative'      // Server text mode
  blockOffset: number                // Content block boundary tracking
  started: boolean                   // Whether stream has begun
  runId: string | null               // Server run identifier
}
```

### Stream Source Arbitration

When the server sends events for a session, the first event type (`chat` or `agent`) to arrive claims that session. Subsequent events of the other type are ignored to prevent duplicate content.

### Cumulative Text Merging

The server sends `data.text` as cumulative per-content-block. When a tool call boundary resets the text counter, the client detects the rewind and accumulates with `\n\n` separators instead of replacing.

### Parent Session Tracking

`parentSessionKeys: Set<string>` tracks sessions the user has sent messages to. Events from unknown sessions trigger subagent detection, which emits `subagentDetected` events for the UI to display inline SubagentBlock components.

---

## State Management

### Zustand Store Structure

```typescript
AppState {
  // Persisted (localStorage)
  theme: 'dark' | 'light'
  serverUrl: string
  authMode: 'token' | 'password'
  insecureAuth: boolean
  sidebarCollapsed: boolean
  collapsedSessionGroups: string[]
  thinkingEnabled: boolean
  notificationsEnabled: boolean
  rightPanelWidth: number

  // Runtime (not persisted)
  connected: boolean
  connecting: boolean
  client: OpenClawClient | null
  sessions: Session[]
  messages: Message[]
  agents: Agent[]
  skills: Skill[]
  cronJobs: CronJob[]
  hooks: Hook[]
  nodes: Node[]
  streamingSessions: Record<string, boolean>
  sessionToolCalls: Record<string, ToolCall[]>
  activeSubagents: SubagentInfo[]
  // ... and more
}
```

### Persistence Strategy

- **Secure tokens**: Electron safeStorage (encrypted) / Capacitor Preferences / localStorage
- **UI preferences**: Zustand `persist` middleware to localStorage key `clawcontrol-storage`
- **Session messages**: In-memory cache (`_sessionMessagesCache: Map`) for instant session switching
- **Gateway token**: Migrated from localStorage to secure storage on first load; legacy entry cleaned up

---

## Authentication Flow

```
1. Client creates WebSocket connection to server URL
2. Server sends connect.challenge event with nonce
3. Client performs handshake:
   a. If device identity available:
      - Sign challenge: v2|deviceId|clientId|mode|role|scopes|timestamp|token|nonce
      - Send: { token/password, mode, device: { id, publicKey, signature, signedAt, nonce } }
   b. If no device identity:
      - Send: { token/password, mode }
4. Server responds with hello-ok (includes optional deviceToken)
5. Client stores deviceToken for future reconnects
6. If NOT_PAIRED: UI shows pairing instructions
7. If DEVICE_IDENTITY_STALE: Client clears keypair and retries once
```

---

## Platform Abstraction Layer

`src/lib/platform.ts` provides a unified API across all platforms:

| Feature | Electron | Capacitor (iOS/Android) | Web |
|---|---|---|---|
| Token storage | safeStorage (encrypted) | Preferences plugin | localStorage |
| External links | shell.openExternal | Browser plugin | window.open |
| Notifications | Notification API | LocalNotifications | Notification API |
| WebSocket factory | Browser WebSocket | NativeWebSocket (iOS) | Browser WebSocket |
| Certificate trust | IPC trustHost | clearTLSFingerprint | N/A |
| ClawHub install | ZIP download + extract | N/A | N/A |
| Ed25519 crypto | Node.js crypto | Web Crypto API | Web Crypto API |
| Haptic feedback | N/A | Haptics plugin | N/A |

---

## Build Pipeline

```
Source (TypeScript + React)
        |
        +---> vite.config.ts --------> Electron Desktop Build
        |     (+ electron plugin)       dist-electron/ (main + preload)
        |                               dist/ (renderer)
        |                               electron-builder -> .exe / .dmg
        |
        +---> vite.config.mobile.ts --> Mobile Web Build
              (React only)              dist/ (web assets)
                                        capacitor sync -> ios/ android/
                                        Xcode / Android Studio -> .ipa / .apk
```

### Key Build Commands

| Command | Platform | Output |
|---|---|---|
| `npm run dev` | Desktop | Dev server with hot reload |
| `npm run build:win` | Windows | NSIS installer + portable |
| `npm run build:mac` | macOS | DMG + ZIP |
| `npm run mobile:dev` | Mobile | Browser preview |
| `npm run mobile:ios` | iOS | Xcode project |
| `npm run mobile:android` | Android | Android Studio project |

---

## Security Architecture

### Token Management
- Gateway tokens stored in OS-level encrypted storage (Electron safeStorage)
- Device tokens (Ed25519-based) stored per-server for automatic reconnection
- Legacy token migration: moved from localStorage to secure storage

### Certificate Handling
- Self-signed certificate support via TOFU (Trust On First Use)
- Trusted hosts persisted to `{userData}/trusted-hosts.json`
- iOS: Native TLS via Capacitor WebSocket plugin
- Certificate errors surface as modal with explicit trust action

### Input Sanitization
- ClawHub skill slugs validated against `^[a-zA-Z0-9_-]+$` before exec
- React JSX auto-escaping prevents XSS from server content
- Markdown rendered with rehype-sanitize for HTML content
- Config patches use hash-based optimistic locking

### Device Pairing
- Ed25519 keypair generated per device
- Challenge-response signing for non-loopback connections
- Device approval workflow with pending/approved states
- Token rotation and revocation support
