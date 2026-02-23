---
title: Getting Started
description: "Installation, configuration, device pairing, and building ClawControl for production."
---

# Getting Started

## Prerequisites

- **Node.js** 18+ and npm
- **OpenClaw server** running and accessible via WebSocket
- For desktop builds: Windows or macOS
- For mobile builds: Xcode (iOS) or Android Studio (Android)

---

## Installation

```bash
git clone https://github.com/jakeledwards/ClawControl.git
cd ClawControl
npm install
```

---

## Development

### Desktop (Electron)

```bash
npm run dev
```

Starts the Vite dev server with Electron, enabling hot module replacement. The app window opens automatically.

### Mobile (Browser Preview)

```bash
npm run mobile:dev
```

Starts a mobile-optimized build in the browser for rapid UI development without native tooling.

### Mobile (Native)

```bash
# iOS
npm run mobile:ios      # Build, sync, and open in Xcode

# Android
npm run mobile:android  # Build, sync, and open in Android Studio
```

---

## Configuration

On first launch, ClawDesk opens the Settings modal. You need to configure:

1. **Server URL** — WebSocket URL of your OpenClaw server (e.g., `wss://your-server.example.com/ws`)
2. **Authentication**
   - **Token mode**: Paste your gateway token
   - **Password mode**: Enter your password

The app stores your token securely:
- **Desktop (Electron)**: OS-level encrypted storage via `safeStorage`
- **Mobile (Capacitor)**: Device Preferences API
- **Web**: localStorage (less secure)

### Device Pairing

For non-loopback connections, the server may require device pairing:

1. ClawDesk generates an Ed25519 keypair on first connection
2. If pairing is required, the Settings modal shows a pairing command
3. Run the displayed command on the server to approve the device
4. Click "Retry Connection" after approving

---

## Building for Production

### Windows

```bash
npm run build:win
```

Produces an NSIS installer and portable executable in `release/`.

### macOS

```bash
npm run build:mac
```

Produces a DMG and ZIP archive in `release/`.

### Mobile

```bash
npm run mobile:build    # Build web assets
npm run mobile:sync     # Sync to native projects
```

Then build from Xcode (iOS) or Android Studio (Android).

---

## Project Structure

```
clawdesk/
├── electron/           # Electron main process + preload
├── src/
│   ├── components/     # React UI components (25 files)
│   ├── hooks/          # Custom React hooks
│   ├── lib/
│   │   ├── openclaw/   # WebSocket client library (14 modules)
│   │   ├── platform.ts # Platform abstraction layer
│   │   ├── device-identity.ts # Ed25519 device pairing
│   │   └── clawhub.ts  # ClawHub skill registry client
│   ├── store/          # Zustand state management
│   ├── styles/         # CSS variables and theming
│   └── utils/          # Utility functions
├── build/              # Build assets (icons)
├── plugins/            # Custom Capacitor plugins
├── docs/               # Documentation
├── vite.config.ts      # Desktop build config
├── vite.config.mobile.ts # Mobile build config
└── capacitor.config.ts # iOS/Android config
```

---

## Quality Commands

```bash
npm run typecheck    # TypeScript type checking (no emit)
npm run lint         # ESLint
npm run test         # Vitest in watch mode
npm run test:run     # Vitest single run
```

> **Note:** On WSL2, tests require `@rollup/rollup-linux-x64-gnu`. If missing, use `npx tsc --noEmit` for type validation instead.

---

## Key Concepts

### Sessions

Sessions are conversations with an agent. They're created client-side with keys like `agent:main:{uuid}` and synced to the server on the first message send. Sessions can be:
- **Regular**: User-initiated conversations
- **Spawned**: Subagent sessions created during tool execution
- **Cron**: Sessions triggered by scheduled jobs
- **System**: Internal sessions (hidden from UI)

### Agents

Agents are AI assistants with configurable names, models, and workspaces. Each agent has:
- **IDENTITY.md**: Name, emoji, avatar definition
- **INSTRUCTIONS.md**: System prompt / behavioral instructions
- **Workspace files**: Additional configuration files

### Skills

Skills are server-side plugins that extend agent capabilities. They can be:
- **Bundled**: Shipped with the server
- **Workspace**: User-installed in the agent's workspace
- **ClawHub**: Installed from the public skill registry

### Streaming

Messages stream in real-time via WebSocket events. The client handles:
- Cumulative text merging (server sends full text per content block)
- Tool call tracking (start/result phases)
- Extended thinking display
- Subagent detection and popout viewing
