---
title: State Management
description: "Complete Zustand store reference — all state fields, actions, selectors, event handlers, and the message lifecycle."
---

# State Management Reference

## Overview

ClawDesk uses **Zustand** for state management with the `persist` middleware for selective localStorage persistence. The store is defined in `src/store/index.ts` and accessed via the `useStore()` hook.

---

## Store Structure

### Persisted State

These fields survive page reloads (stored in `localStorage` key `clawcontrol-storage`):

| Field | Type | Default | Description |
|---|---|---|---|
| `theme` | `'dark' \| 'light'` | `'dark'` | UI color theme |
| `serverUrl` | `string` | `''` | WebSocket server URL |
| `authMode` | `'token' \| 'password'` | `'token'` | Authentication method |
| `insecureAuth` | `boolean` | `false` | Skip device identity |
| `sidebarCollapsed` | `boolean` | `false` | Sidebar collapsed state |
| `collapsedSessionGroups` | `string[]` | `[]` | Collapsed date groups |
| `thinkingEnabled` | `boolean` | `false` | Extended thinking mode |
| `notificationsEnabled` | `boolean` | `false` | Desktop notifications |
| `rightPanelWidth` | `number` | `320` | Right panel width (px) |
| `serverProfiles` | `ServerProfile[]` | `[]` | Saved server connection profiles |
| `activeProfileId` | `string \| null` | `null` | Currently active server profile |

> **Note:** `gatewayToken` is NOT persisted in Zustand. It's stored in platform-specific secure storage (Electron safeStorage / Capacitor Preferences). Each server profile stores its own token independently.

### Runtime State

These fields reset on page reload:

#### Connection

| Field | Type | Description |
|---|---|---|
| `connected` | `boolean` | WebSocket connected |
| `connecting` | `boolean` | Connection in progress |
| `client` | `OpenClawClient \| null` | Active WebSocket client |
| `pairingStatus` | `'none' \| 'pending'` | Device pairing state |
| `pairingDeviceId` | `string \| null` | Device ID for pairing |

#### UI State

| Field | Type | Description |
|---|---|---|
| `sidebarOpen` | `boolean` | Mobile sidebar overlay |
| `rightPanelOpen` | `boolean` | Right panel visibility |
| `rightPanelTab` | `'skills' \| 'crons' \| 'hooks'` | Active right panel tab |
| `mainView` | union type | Current main view (see below) |
| `showSettings` | `boolean` | Settings modal open |
| `showCertError` | `boolean` | Cert error modal open |

#### Main View

```typescript
type MainView =
  | 'chat'                  // Default chat interface
  | 'skill-detail'         // Skill inspector
  | 'cron-detail'          // Cron job editor
  | 'create-cron'          // New cron job form
  | 'agent-detail'         // Agent profile
  | 'create-agent'         // New agent form
  | 'clawhub-skill-detail' // ClawHub browser
  | 'hook-detail'          // Hook configuration
  | 'server-settings'      // Server config editor
  | 'usage'                // Usage dashboard
  | 'nodes'                // Node management
  | 'pixel-dashboard'      // Agent activity grid
```

#### Data

| Field | Type | Description |
|---|---|---|
| `sessions` | `Session[]` | All visible sessions |
| `currentSessionId` | `string \| null` | Active session key |
| `messages` | `Message[]` | Messages for current session |
| `agents` | `Agent[]` | All agents |
| `currentAgentId` | `string \| null` | Active agent ID |
| `skills` | `Skill[]` | All skills |
| `cronJobs` | `CronJob[]` | All cron jobs |
| `hooks` | `Hook[]` | All hooks |
| `hooksConfig` | `HooksConfig` | Hooks master config |
| `nodes` | `Node[]` | Connected nodes |
| `execApprovals` | `ExecApprovalsResponse \| null` | Exec config |
| `devicePairings` | `DevicePairListResponse \| null` | Device pairings |

#### Streaming

| Field | Type | Description |
|---|---|---|
| `streamingSessions` | `Record<string, boolean>` | Per-session streaming flag |
| `sessionHadChunks` | `Record<string, boolean>` | Per-session chunk received |
| `sessionToolCalls` | `Record<string, ToolCall[]>` | Per-session tool calls |
| `streamingThinking` | `Record<string, string>` | Per-session thinking text |
| `compactingSession` | `string \| null` | Session being compacted |
| `streamingSessionId` | `string \| null` | Most recent send target |

#### Selected Items (Detail Views)

| Field | Type | Description |
|---|---|---|
| `selectedSkill` | `Skill \| null` | Selected for SkillDetailView |
| `selectedCronJob` | `CronJob \| null` | Selected for CronJobDetailView |
| `selectedHook` | `Hook \| null` | Selected for HookDetailView |
| `selectedAgentDetail` | `AgentDetail \| null` | Selected for AgentDetailView |
| `selectedClawHubSkill` | `ClawHubSkill \| null` | Selected for ClawHub |

#### Subagents

| Field | Type | Description |
|---|---|---|
| `activeSubagents` | `SubagentInfo[]` | Detected subagent sessions |
| `unreadCounts` | `Record<string, number>` | Unread per session |

---

## Key Actions

### Connection

| Action | Description |
|---|---|
| `initializeApp()` | Load config, tokens, auto-connect |
| `connect()` | Create client and connect to server |
| `disconnect()` | Close WebSocket and clear state |
| `retryConnect()` | Clear pairing state and reconnect |

### Server Profiles

| Action | Description |
|---|---|
| `addServerProfile(profile)` | Add a new server profile |
| `updateServerProfile(id, updates)` | Update an existing profile |
| `deleteServerProfile(id)` | Remove a profile |
| `setActiveProfileId(id)` | Switch active profile |
| `getActiveProfile()` | Get the current active profile |

### Sessions

| Action | Description |
|---|---|
| `setCurrentSession(id)` | Switch to session (loads messages) |
| `createNewSession()` | Create local session for current agent |
| `deleteSession(id)` | Delete session from server and store |
| `updateSessionLabel(id, label)` | Rename a session |
| `spawnSubagentSession(agentId, prompt?)` | Create subagent session |
| `fetchSessions()` | Refresh session list from server |

### Chat

| Action | Description |
|---|---|
| `sendMessage(content, attachments?)` | Send message (creates session if needed) |
| `abortChat()` | Cancel current stream |

### Agents

| Action | Description |
|---|---|
| `setCurrentAgent(agentId)` | Switch agent (finds matching session) |
| `createAgent(params)` | Create new agent via config.patch |
| `deleteAgent(agentId)` | Delete agent via config.patch |
| `renameAgent(agentId, name)` | Rename via IDENTITY.md |
| `updateAgentModel(agentId, model)` | Change agent model |
| `selectAgentForDetail(agent)` | Open agent detail view |
| `fetchAgents()` | Refresh agent list |

### Views

| Action | Description |
|---|---|
| `selectSkill(skill)` | Open skill detail view |
| `selectCronJob(cron)` | Open cron detail view |
| `selectHook(hook)` | Open hook detail view |
| `openServerSettings()` | Open server config editor |
| `openUsage()` | Open usage dashboard |
| `openNodes()` | Open nodes management |
| `openCreateCron()` | Open new cron form |
| `openDashboard()` | Open agent dashboard |
| `closeDetailView()` | Return to chat view |

### Data Fetching

| Action | Description |
|---|---|
| `fetchSessions()` | Reload sessions from server |
| `fetchAgents()` | Reload agents from server |
| `fetchSkills()` | Reload skills from server |
| `fetchCronJobs()` | Reload cron jobs from server |
| `fetchHooks()` | Reload hooks from server |
| `fetchNodes()` | Reload nodes from server |
| `fetchExecApprovals()` | Reload exec approvals |
| `fetchDevicePairings()` | Reload device pairings |

---

## Per-Session Selectors

Derived selectors for the current session (avoid unnecessary re-renders):

```typescript
import {
  selectIsStreaming,        // Is current session streaming?
  selectHadStreamChunks,    // Did current session receive chunks?
  selectActiveToolCalls,    // Tool calls for current session
  selectStreamingThinking,  // Thinking text for current session
  selectIsCompacting        // Is current session being compacted?
} from '../store'

// Usage in component:
const isStreaming = useStore(selectIsStreaming)
```

---

## Module-Level State

Some state lives outside the Zustand store for performance or lifecycle reasons:

| Variable | Purpose |
|---|---|
| `_subagentPollTimer` | Interval ID for subagent polling |
| `_baselineSessionKeys` | Snapshot of session keys for subagent detection |
| `_sessionLoadVersion` | Counter for detecting stale async message loads |
| `_sessionMessagesCache` | `Map<string, Message[]>` for instant session switching |
| `_clawHubStatsCache` | Cached download/star counts from ClawHub |

---

## Event-Driven State Updates

The store registers handlers for client events during `connect()`:

| Client Event | Store Effect |
|---|---|
| `connected` | Set `connected=true`, clear pairing state |
| `disconnected` | Set `connected=false`, clear streaming state |
| `streamStart` | Mark session as streaming, start subagent polling |
| `streamChunk` | Append text to streaming message (or create new one) |
| `streamEnd` | Clear streaming state, notify if needed, stop polling |
| `message` | Replace streaming placeholder with final message |
| `toolCall` | Add/update tool call in session, finalize streaming message |
| `thinkingChunk` | Accumulate thinking text for session |
| `compaction` | Set/clear compacting indicator |
| `streamSessionKey` | Migrate session key when server assigns different key |
| `subagentDetected` | Add to activeSubagents list |
| `pairingRequired` | Show pairing UI |
| `certError` | Show certificate error modal |
| `reconnectExhausted` | Set disconnected, stop connecting |
| `execApprovalRequested` | Show notification |
| `agentStatus` | Update agent online/offline status |

---

## Message Lifecycle

```
1. User types message in InputArea
2. sendMessage() called:
   a. Creates session if currentSessionId is null
   b. Sets primary session key on client
   c. Resets streaming state for session
   d. Adds user message to store immediately
   e. Calls client.sendMessage() via WebSocket

3. Server starts streaming:
   a. streamStart event -> mark session as streaming
   b. streamChunk events -> append to streaming-{timestamp} placeholder
   c. toolCall events -> finalize current message, add tool call
   d. More streamChunk events -> create new streaming message
   e. message event (final) -> replace placeholder with canonical message
   f. streamEnd event -> clear streaming state

4. Session switch:
   a. Cache current session's messages to _sessionMessagesCache
   b. Load cached messages for new session (instant)
   c. Fetch fresh messages from server (async)
   d. Guard against stale loads via _sessionLoadVersion
```
