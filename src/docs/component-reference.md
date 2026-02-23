---
title: Component Reference
description: "Catalog of all 25+ React components with purpose, features, store dependencies, and sub-components."
---

# Component Reference

## Overview

ClawDesk's UI is built with React 18 and organized into layout components, detail views, modals, and specialized widgets. All state flows through a centralized Zustand store (`useStore()`).

---

## Layout Components

### `App` (`src/App.tsx`)

Root application component. Orchestrates the entire layout, initializes the app, applies theme, and sets up mobile-specific listeners (keyboard, back button, app lifecycle).

**View routing:** Renders the appropriate detail view based on `mainView` store state.

### `Sidebar` (`src/components/Sidebar.tsx`)

Left sidebar with session management and navigation.

**Features:**
- Session list grouped by date (Today, Yesterday, This Week, This Month, Older)
- Debounced session search (300ms)
- Unread message badges
- Context menu (right-click/long-press) for rename/delete
- Agent selector dropdown
- Navigation buttons: New Chat, Dashboard, Server Usage, Nodes
- Collapsible/expandable session groups

**Sub-components:** `SessionItem`, `RenameModal`, `AgentSelector`

**Session filtering rules:**
- Hides spawned subagent sessions (`spawned: true`)
- Hides system sessions (`agent:X:main`, `agent:X:cron`)
- Hides cron sessions
- Always shows the currently active session
- Deduplicates by session key

### `TopBar` (`src/components/TopBar.tsx`)

Header bar with session name display, thinking mode toggle, theme toggle, right panel toggle, and settings button. Shows connection status indicator.

### `RightPanel` (`src/components/RightPanel.tsx`)

Resizable right panel with three tabs:

| Tab | Content |
|---|---|
| Skills | Installed skills list + ClawHub "Available" sub-tab |
| Crons | Cron job list with status toggles |
| Hooks | Internal hooks list with master toggle |

**Features:** Drag-to-resize handle, debounced search, ClawHub sort options (downloads, stars, trending, updated).

**Sub-components:** `SkillItem`, `ClawHubSkillItem`, `HookItem`, `CronJobItem`

---

## Chat Components

### `ChatArea` (`src/components/ChatArea.tsx`)

Main message display area with streaming support.

**Features:**
- Message bubbles (user/assistant styling)
- Markdown rendering with GFM tables, code blocks with copy button
- Thinking block display (collapsible, with streaming indicator)
- Tool call inline display (running spinner, collapsed results, expandable)
- Subagent block rendering
- Image attachment display
- Date separators between messages
- Auto-scroll with smart behavior (instant on session switch, smooth on new messages)
- Typing indicator and compaction indicator

**Sub-components:** `MessageBubble`, `ToolCallBubble`, `ToolCallBlock`, `MessageContent`, `ThinkingBlock`, `DateSeparator`

### `InputArea` (`src/components/InputArea.tsx`)

Message composition area.

**Features:**
- Auto-expanding textarea (max 200px height)
- Voice input (browser SpeechRecognition + Capacitor)
- Wake word detection (configurable words, 3s cooldown)
- Image attachment with preview thumbnails
- File validation (images only, 5MB max)
- Character count with capacity warning
- Send/Stop button toggle
- Keyboard shortcuts: Enter=send, Shift+Enter=newline

---

## Detail View Components

### `SkillDetailView` (`src/components/SkillDetailView.tsx`)

Individual skill inspector showing metadata, requirements, installation options, and enable/disable toggle.

### `CronJobDetailView` (`src/components/CronJobDetailView.tsx`)

Full cron job editor with sections for:
- Schedule (cron expression, interval, one-time)
- Execution (session target, wake mode, agent, delete-after-run)
- Payload (system event or agent turn with model/thinking/timeout)
- Delivery (none, announce, webhook)
- Content (markdown editor)
- Runtime state (last run status, errors, timing)

### `CreateCronJobView` (`src/components/CreateCronJobView.tsx`)

New cron job creation form with all configuration sections.

### `AgentDetailView` (`src/components/AgentDetailView.tsx`)

Agent profile editor with avatar display, name editing, model selection, workspace file browser, and file editor. Supports agent deletion (except 'main').

### `CreateAgentView` (`src/components/CreateAgentView.tsx`)

New agent creation form with avatar upload, name, workspace, model, and emoji fields.

### `ClawHubSkillDetailView` (`src/components/ClawHubSkillDetailView.tsx`)

ClawHub skill browser detail page with VirusTotal security scan badge, version files, changelog, and install button.

### `HookDetailView` (`src/components/HookDetailView.tsx`)

Hook configuration editor with enable/disable toggle, events list, requirements grid, and environment variables editor.

### `ServerSettingsView` (`src/components/ServerSettingsView.tsx`)

Full-page server configuration editor with tabs:
- **Agent Defaults:** Model, thinking level, limits
- **Tools & Memory:** Web tools, exec settings, memory backend
- **Channels:** Per-channel enable/disable with policies
- **Features:** TTS, voice wake, experimental toggles

Uses hash-based conflict detection and minimal patch generation.

### `UsageView` (`src/components/UsageView.tsx`)

Usage statistics dashboard with:
- Total cost/token summaries
- Activity heatmap (day of week)
- Daily usage bar charts (Recharts)
- Agent usage breakdown (pie + bar charts)
- Detailed usage tables
- Provider status and rate limits

### `NodesView` (`src/components/NodesView.tsx`)

Node and device management with:
- Network topology SVG diagram
- Node list with status indicators
- Node detail panel (capabilities, commands, permissions)
- Exec approvals editor (gateway/node scope)
- Exec node binding configuration
- Device pairing management (approve/reject/remove)
- Token rotation and revocation

### `AgentDashboard` (`src/components/AgentDashboard.tsx`)

Live agent activity grid showing real-time agent status.

---

## Modal Components

### `SettingsModal` (`src/components/SettingsModal.tsx`)

Connection and authentication settings:
- Server URL input with WebSocket validation
- Auth mode toggle (token/password)
- Token/password input with show/hide
- Device pairing status and approval instructions
- Auto-retry mechanism (60s intervals, max 5 attempts)
- Theme toggle, notifications toggle
- Server settings button, disconnect button

### `CertErrorModal` (`src/components/CertErrorModal.tsx`)

Certificate error handler with platform-specific trust action:
- **Electron:** Trust host and reconnect
- **iOS:** Clear TLS fingerprint
- **Android/Web:** Open URL externally

---

## Viewer Components

### `SubagentViewer` (`src/components/SubagentViewer.tsx`)

Standalone popout window for viewing subagent conversations. Creates its own `OpenClawClient` instance independent of the main app.

### `ToolCallViewer` (`src/components/ToolCallViewer.tsx`)

Popout window for inspecting tool call details. Reads data from localStorage (written by the main app).

### `SubagentBlock` (`src/components/SubagentBlock.tsx`)

Inline status block displayed within chat for detected subagent sessions. Shows running/completed state with open button.

### `ToolIcon` (`src/components/ToolIcon.tsx`)

Shared SVG icon renderer for 16 tool icon types (terminal, file-text, edit, globe, search, etc.).

---

## Mobile Components

### `MobileGestureLayer` (`src/components/MobileGestureLayer.tsx`)

Root gesture handler for mobile swipe navigation:
- Left-to-right: close right panel -> close detail view -> open sidebar
- Right-to-left: close sidebar -> open right panel
- Visual follow-through with translate + opacity during swipe

### `SessionContextMenu` (`src/components/SessionContextMenu.tsx`)

Context menu for session operations on mobile (rename, delete). Fixed positioning with viewport boundary clamping.

---

## Custom Hooks

### `useLongPress` (`src/hooks/useLongPress.ts`)

Mobile long-press detection with 500ms threshold, 10px movement tolerance, and haptic feedback. Returns touch event handlers for JSX spread.

### `useSwipeGesture` (`src/hooks/useSwipeGesture.ts`)

Edge swipe gesture detection with 20px edge threshold and direction locking. Provides progress callbacks (0-1) for animation.

---

## Utility Functions

### `groupSessionsByDate` (`src/utils/dateGrouping.ts`)

Groups sessions into date categories (Today, Yesterday, This Week, This Month, Older) using date-fns. Returns groups in fixed display order with sessions sorted by `updatedAt` descending.
