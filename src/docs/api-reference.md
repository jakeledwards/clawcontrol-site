---
title: API Reference
description: "Full OpenClaw Protocol v4 reference (backward-compatible with v3) — all RPC methods, request/response types, server events, session key formats, and error handling."
---

# OpenClaw Protocol API Reference

## Overview

ClawControl communicates with an OpenClaw server using a custom WebSocket-based JSON-RPC protocol (v4, backward-compatible with v3). Messages are exchanged as JSON frames with three types: `req` (client requests), `res` (server responses), and `event` (server-pushed events). The protocol version is negotiated during the handshake; v4-aware servers emit `protocolVersion: 4` in `hello-ok` and unlock new events like `chat.deltaText`, `streamReplace`, and `authError`.

---

## Protocol Version

v4 was introduced in OpenClaw `2026.5.x` and ClawControl `1.8.0`. The client always announces v4 capability in the `connect` request; the server signals support by returning `protocolVersion: 4` in `hello-ok`. v3 servers omit the field, and the client falls back to cumulative text and inline `MEDIA:` token handling.

### What changes between v3 and v4

| Concern | v3 | v4 |
|---|---|---|
| Streaming text | Cumulative `delta` / `message.content` per content block | True incremental `deltaText` events with optional `replace` |
| Mid-stream rewrites | Client detects rewinds heuristically | Server emits `streamReplace` explicitly |
| MEDIA references | Inline `MEDIA:{id}` tokens in text | Pre-stripped; `mediaUrls` array on `chat` events |
| Auth failures mid-session | Reported as RPC errors only | `authError` event with structured `details` |
| Reconnect backoff | Pure client-side exponential | Honors server `retryAfterMs` as one-shot floor |
| Plugin discovery | Not exposed | `hello-ok.plugins` URLs |
| Server version visibility | None | `hello-ok.version` and `hello-ok.protocolVersion` |

The client tolerates both protocol levels on every connection. The Settings modal surfaces the negotiated version and any server-supplied `hint` for quick debugging.

---

## Frame Types

### Request Frame

```typescript
{
  type: 'req'
  id: string        // Unique request ID (incrementing counter)
  method: string    // RPC method name
  params?: any      // Method parameters
}
```

### Response Frame

```typescript
{
  type: 'res'
  id: string        // Matches request ID
  ok: boolean       // Success indicator
  payload?: any     // Response data (when ok=true)
  error?: {
    code: string
    message: string
    details?: any
  }
}
```

### Event Frame

```typescript
{
  type: 'event'
  event: string     // Event type
  payload?: any     // Event data
}
```

---

## Connection & Authentication

### Handshake Flow

1. Client opens WebSocket to `wss://{server}/ws`
2. Server sends `connect.challenge` event with `nonce`
3. Client sends `req` with method `connect` and auth credentials
4. Server responds with `hello-ok` payload

### `connect`

Authenticates the client with the server.

**Parameters:**
```typescript
{
  token?: string              // Gateway token (when authMode='token')
  password?: string           // Password (when authMode='password')
  mode: 'token' | 'password'
  clientId: string            // Stable client identifier
  device?: {                  // Ed25519 device identity (optional)
    id: string                // SHA-256(publicKey)
    publicKey: string         // base64url encoded
    signature: string         // Challenge signature (base64url)
    signedAt: number          // Timestamp (ms)
    nonce: string             // Echo of server nonce
  }
}
```

**Response Payload (hello-ok):**
```typescript
{
  // Auth (both v3 and v4)
  auth?: {
    deviceToken?: string      // Server-issued device token for reconnects
  }

  // v4 additions (omitted by v3 servers)
  protocolVersion?: 3 | 4     // Negotiated protocol version
  version?: string            // Server software version (e.g. "2026.5.3")
  hint?: string               // Optional connection hint (e.g. plugin status)
  plugins?: {
    webhooks?: string         // Plugin surface URL: incoming webhook receiver
    media?: string            // Plugin surface URL: media gateway
  }
}
```

Receiving `protocolVersion: 4` enables `chat.deltaText`, `streamReplace`, and `authError` handling in the client.

**Error Codes:**
- `NOT_PAIRED` — Device needs pairing approval
- `DEVICE_IDENTITY_STALE` — Cached device identity is invalid

---

## RPC Methods

### Sessions

#### `sessions.list`

Lists all active sessions.

**Parameters:**
```typescript
{
  includeDerivedTitles: true
  includeLastMessage: true
  limit: 50
}
```

**Response:** `Session[]` or `{ sessions: Session[] }`

```typescript
interface Session {
  id: string
  key: string
  title: string
  agentId?: string
  createdAt: string       // ISO 8601
  updatedAt: string       // ISO 8601
  lastMessage?: string
  spawned?: boolean
  parentSessionId?: string
  cron?: boolean
}
```

#### `sessions.delete`

Deletes a session.

**Parameters:** `{ key: string }`

#### `sessions.patch`

Updates session metadata.

**Parameters:** `{ key: string, label?: string }`

#### `sessions.spawn`

Creates a subagent session.

**Parameters:** `{ agentId: string, prompt?: string }`

**Response:** `{ session: Session }` with `spawned: true`

#### `sessions.usage`

Returns usage statistics per session.

**Parameters:** `{ days?: number, limit?: number }`

---

### Chat

#### `chat.send`

Sends a message in a session.

**Parameters:**
```typescript
{
  message: string
  sessionKey: string
  idempotencyKey: string    // UUID for deduplication
  thinking?: 'low'          // Enable extended thinking
  attachments?: Array<{
    type?: string
    mimeType?: string
    fileName?: string
    content: string         // Base64 or text content
  }>
}
```

**Response:** `{ sessionKey?: string }` — Server may assign a different canonical key.

#### `chat.history`

Fetches message history for a session.

**Parameters:** `{ sessionKey: string }`

**Response:** Array of message objects with content blocks:
```typescript
{
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string | ContentBlock[]
  timestamp: string
  thinking?: string
}
```

Content block types:
- `{ type: 'text', text: string }`
- `{ type: 'thinking', thinking: string }`
- `{ type: 'toolCall', toolCallId, name, args }`
- `{ type: 'toolResult', toolCallId, result }`
- `{ type: 'image', url?, data?, mimeType? }`

#### `chat.abort`

Cancels an ongoing chat stream.

**Parameters:** `{ sessionKey: string }`

---

### Agents

#### `agents.list`

Lists all configured agents.

**Response:** `Agent[]` or `{ agents: Agent[] }`

```typescript
interface Agent {
  id: string
  name: string
  description?: string
  status: 'online' | 'offline' | 'busy'
  avatar?: string
  emoji?: string
  theme?: string
  model?: string
  thinkingLevel?: string
  timeout?: number
  configured?: boolean
}
```

#### `agent.identity.get`

Fetches agent identity metadata (name, emoji, avatar).

**Parameters:** `{ agentId: string }`

**Response:** `{ name?, emoji?, avatar?, avatarUrl? }`

#### `agents.files.list`

Lists files in an agent's workspace.

**Parameters:** `{ agentId: string }`

**Response:** `{ workspace: string, files: AgentFile[] }`

```typescript
interface AgentFile {
  name: string
  path: string
  missing: boolean
  size?: number
  updatedAtMs?: number
}
```

#### `agents.files.get`

Reads a single agent file.

**Parameters:** `{ agentId: string, name: string }`

**Response:** `{ file: { content?: string, missing: boolean } }`

#### `agents.files.set`

Writes or updates an agent file.

**Parameters:** `{ agentId: string, name: string, content: string }`

---

### Configuration

#### `config.get`

Reads the full server configuration.

**Response:**
```typescript
{
  config: object    // Full server configuration
  hash: string      // Hash for conflict detection
}
```

#### `config.patch`

Patches server configuration (triggers server restart).

**Parameters:**
```typescript
{
  raw: string       // JSON-stringified merge patch
  baseHash: string  // Hash from config.get for conflict detection
}
```

**Merge patch semantics:**
- Plain objects: recursively merged
- Arrays: replaced entirely
- `null` values: delete the key

---

### Skills

#### `skills.status`

Lists all skills with extended metadata.

**Response:** `Skill[]` or `{ skills: Skill[] }`

```typescript
interface Skill {
  id: string            // skillKey
  name: string
  description: string
  triggers: string[]
  enabled?: boolean
  emoji?: string
  homepage?: string
  source?: string
  bundled?: boolean
  filePath?: string
  eligible?: boolean
  always?: boolean
  requirements?: {
    bins: string[]
    anyBins: string[]
    env: string[]
    config: string[]
    os: string[]
  }
  missing?: { /* same shape */ }
  install?: Array<{
    id: string
    kind: string
    label: string
    bins?: string[]
  }>
}
```

#### `skills.update`

Enables or disables a skill.

**Parameters:** `{ skillKey: string, enabled: boolean }`

#### `skills.install`

Installs a skill dependency.

**Parameters:** `{ name: string, installId: string, timeoutMs: 60000 }`

---

### Cron Jobs

#### `cron.list`

Lists all cron jobs.

**Response:** `CronJob[]` or `{ cronJobs: CronJob[] }`

```typescript
interface CronJob {
  id: string
  name: string
  schedule: string
  scheduleRaw?: CronScheduleType
  sessionTarget?: 'main' | 'isolated'
  wakeMode?: 'next-heartbeat' | 'now'
  payload?: CronPayload
  delivery?: CronDelivery
  agentId?: string | null
  deleteAfterRun?: boolean
  nextRun?: string
  status: 'active' | 'paused'
  description?: string
  content?: string
  state?: CronJobState
  enabled?: boolean
}
```

#### `cron.get`

Fetches full details for a single cron job.

**Parameters:** `{ id: string }`

#### `cron.add`

Creates a new cron job.

**Parameters:** Full cron job definition object.

#### `cron.update`

Updates a cron job.

**Parameters:** `{ id: string, ...updates }`

#### `cron.remove`

Deletes a cron job.

**Parameters:** `{ id: string }`

#### `cron.run`

Executes a cron job immediately.

**Parameters:** `{ id: string }`

---

### Nodes & Devices

#### `node.list`

Lists all connected nodes.

**Response:** `{ ts: number, nodes: Node[] }`

```typescript
interface Node {
  nodeId: string
  displayName?: string
  platform?: string
  version?: string
  coreVersion?: string
  uiVersion?: string
  deviceFamily?: string
  modelIdentifier?: string
  remoteIp?: string
  caps: string[]
  commands: string[]
  pathEnv?: string
  permissions?: Record<string, boolean>
  connectedAtMs?: number
  paired: boolean
  connected: boolean
}
```

#### `exec.approvals.get`

Reads the global exec approvals configuration.

**Response:**
```typescript
{
  path: string
  exists: boolean
  hash: string
  file: {
    version: number
    socket?: { path?: string; token?: string }
    defaults?: {
      security?: 'deny' | 'allowlist' | 'full'
      ask?: 'off' | 'on-miss' | 'always'
      askFallback?: 'deny' | 'allowlist' | 'full'
      autoAllowSkills?: boolean
    }
    agents?: Record<string, {
      security?: string
      ask?: string
      askFallback?: string
      autoAllowSkills?: boolean
      allowlist?: Array<{
        pattern: string
        lastUsedAt?: number
        lastUsedCommand?: string
      }>
    }>
  }
}
```

#### `exec.approvals.set`

Updates the global exec approvals configuration.

**Parameters:** `{ file: ExecApprovalsFile, baseHash: string }`

#### `exec.approvals.node.get` / `exec.approvals.node.set`

Same as above but scoped to a specific node.

**Additional parameter:** `{ nodeId: string }`

#### `device.pair.list`

Lists pending pairing requests and paired devices.

**Response:**
```typescript
{
  pending: Array<{
    requestId: string
    deviceId: string
    displayName?: string
    platform?: string
    roles?: string[]
    scopes?: string[]
    remoteIp?: string
    ts: number
  }>
  paired: Array<{
    deviceId: string
    displayName?: string
    platform?: string
    roles?: string[]
    scopes?: string[]
    remoteIp?: string
    tokens?: Record<string, {
      count: number
      oldestCreatedAt?: number
      newestCreatedAt?: number
      newestRotatedAt?: number
    }>
  }>
}
```

#### `device.pair.approve` / `device.pair.reject`

Approves or rejects a pending pairing request.

**Parameters:** `{ requestId: string }`

#### `device.pair.remove`

Removes a paired device.

**Parameters:** `{ deviceId: string }`

#### `device.token.rotate`

Rotates a device's auth token.

**Parameters:** `{ deviceId: string, role: string, scopes?: string[] }`

#### `device.token.revoke`

Revokes a device's auth token.

**Parameters:** `{ deviceId: string, role: string }`

---

### Usage & Features

#### `usage.status`

Returns server usage status and limits.

#### `usage.cost`

Returns cost tracking information.

#### `tts.status` / `tts.providers`

Get text-to-speech status and available providers.

#### `tts.enable` / `tts.disable`

Toggle text-to-speech.

#### `tts.setProvider`

Set TTS provider. **Parameters:** `{ provider: string }`

#### `voicewake.get` / `voicewake.set`

Get or configure voice wake word detection.

---

## Server Events

### Chat Events

#### `chat` (state: "delta")

Streaming text chunk for a session.

```typescript
{
  event: 'chat'
  payload: {
    state: 'delta'
    sessionKey?: string
    delta?: string           // Incremental text
    message?: {
      content: string | ContentBlock[]
    }
  }
}
```

#### `chat` (state: "final")

Complete message with canonical data.

```typescript
{
  event: 'chat'
  payload: {
    state: 'final'
    sessionKey?: string
    message: {
      id: string
      role: string
      content: string | ContentBlock[]
      timestamp: string
      thinking?: string
    }
  }
}
```

#### `chat` (state: "deltaText") — v4 only

True incremental text delta. Unlike v3's cumulative `delta`, the client appends each `deltaText` segment directly. When `replace: true`, it replaces the active content block instead of appending — used for mid-stream corrections.

```typescript
{
  event: 'chat'
  payload: {
    state: 'deltaText'
    sessionKey?: string
    deltaText: string         // Incremental text segment
    replace?: boolean         // When true, replace current active block instead of append
    mediaUrls?: string[]      // Pre-stripped media references (v4 strips MEDIA: tokens here)
  }
}
```

After a `chat:final` arrives for a content block, late `deltaText` events for the same block are dropped — the v4 client never mutates finalized text.

#### `chat` (state: "streamReplace") — v4 only

Replaces the entire active assistant message body. The server emits this when retrying a generation or rewriting a partial answer.

```typescript
{
  event: 'chat'
  payload: {
    state: 'streamReplace'
    sessionKey?: string
    content: string | ContentBlock[]
  }
}
```

### Agent Events

#### `agent` (stream: "assistant")

Agent text output.

```typescript
{
  event: 'agent'
  payload: {
    stream: 'assistant'
    sessionKey?: string
    data: {
      text?: string          // Cumulative text
      delta?: string         // Incremental text
      runId?: string
    }
  }
}
```

#### `agent` (stream: "tool")

Tool call execution.

```typescript
{
  event: 'agent'
  payload: {
    stream: 'tool'
    sessionKey?: string
    data: {
      toolCallId: string
      name: string
      phase: 'start' | 'result'
      args?: object
      result?: string
      meta?: string
    }
  }
}
```

#### `agent` (stream: "lifecycle")

Agent lifecycle events.

```typescript
{
  event: 'agent'
  payload: {
    stream: 'lifecycle'
    sessionKey?: string
    data: {
      state?: 'complete'     // Stream finished
      phase?: 'end' | 'error'
      runId?: string
    }
  }
}
```

### Extended Thinking Events

```typescript
{
  event: 'agent'
  payload: {
    stream: 'thinking'
    sessionKey?: string
    data: {
      text: string
      cumulative?: boolean
    }
  }
}
```

### Presence Events

```typescript
{
  event: 'presence'
  payload: {
    agentId: string
    status: 'online' | 'offline' | 'busy'
  }
}
```

### Compaction Events

```typescript
{
  event: 'agent'
  payload: {
    stream: 'lifecycle'
    data: {
      phase: 'compaction_start' | 'compaction_end'
      willRetry?: boolean
    }
    sessionKey?: string
  }
}
```

### Auth Error Events — v4 only

Emitted when the server rejects the connection or session mid-stream (token revoked, device untrusted, server unavailable). The client routes this through the store so the Settings modal can render an inline hint.

```typescript
{
  event: 'authError'
  payload: {
    sessionKey?: string
    error: {
      code: 'UNAUTHORIZED' | 'DEVICE_UNTRUSTED' | 'UNAVAILABLE' | string
      message: string
      details?: {
        reason?: string                    // Human-readable failure cause
        canRetryWithDeviceToken?: boolean  // Hint: a fresh device token may succeed
        recommendedNextStep?: string       // Server-supplied next action
      }
    }
    retryAfterMs?: number                  // Suggested reconnect delay floor (see Error Handling Conventions)
  }
}
```

When `error.code === 'UNAVAILABLE'`, the client treats the failure as retryable and uses `retryAfterMs` as a one-shot floor on the next reconnect delay.

---

## Session Key Format

Session keys follow the pattern: `agent:{agentId}:{identifier}`

| Pattern | Description |
|---|---|
| `agent:main:{uuid}` | Main agent session |
| `agent:{name}:{uuid}` | Custom agent session |
| `agent:{name}:main` | Agent's main/system session |
| `agent:{name}:cron:{job}` | Cron-triggered session |
| `agent:{name}:subagent:{uuid}` | Spawned subagent session |

---

## Error Handling Conventions

- RPC calls timeout after **30 seconds** by default
- Connection timeout: **15 seconds**
- Health check interval: **15 seconds** (via `skills.status`)
- Auto-reconnect: exponential backoff up to **30 seconds**, max **20 attempts**
- Config patches require hash match for optimistic conflict detection
- **v4**: Servers may include `retryAfterMs` on `UNAVAILABLE` errors or `authError` events. The client uses it as a **one-shot floor** on the reconnect delay (cleared after use; backoff resumes normally on the next failure).
- **v4**: `authError` events with `error.code === 'UNAVAILABLE'` are treated as retryable and count toward the 20-attempt cap, not the immediate-failure path.
- Silent error swallowing with `console.warn` for non-critical failures
