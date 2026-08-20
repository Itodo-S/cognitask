# Claude Agent SDK Integration Plan

## Goal
Replace the mock AI service with real Claude Agent SDK calls. The SDK's `query()` function runs an agentic loop where Claude reasons about tasks and calls custom MCP tools to read/write todo data directly.

## Architecture

```
Frontend → Fastify Routes → ClaudeAIService → SDK query() → Claude Agent Loop
                                                    ↓
                                            MCP Tools (cognitask server)
                                                    ↓
                                            todoService (SQLite/Drizzle)
                                                    ↓
                                            WebSocket events → Frontend
```

## Files to Create/Modify

### New Files
1. `src/agents/sdk-tools.ts` — Convert 21 tool handlers to SDK `tool()` definitions
2. `src/services/claude-ai.service.ts` — Real AIService using `query()`
3. `src/agents/claude-orchestrator.ts` — SDK-backed orchestrator with WS streaming

### Modified Files
4. `src/config/env.ts` — Add `ANTHROPIC_API_KEY` env var
5. `src/services/ai.service.ts` — Export factory that picks real vs mock based on API key
6. `src/agents/mcp-server.ts` — Fix duplicate import, keep as fallback
7. `src/agents/orchestrator.ts` — Fix result capture bug, delegate to claude-orchestrator
8. `src/api/routes/ai.routes.ts` — Use orchestrator instead of raw aiService
9. `src/api/routes/ai-v2.routes.ts` — Use real AI for plan/refine
10. `src/index.ts` — Wire up SDK MCP server
11. `package.json` — Add `@anthropic-ai/claude-agent-sdk` dependency

## Detailed Steps

### Step 1: Add env var
In `src/config/env.ts`, add:
```typescript
ANTHROPIC_API_KEY: z.string().optional(),
CLAUDE_MODEL: z.string().optional(), // e.g. "claude-sonnet-5"
CLAUDE_MAX_TURNS: z.coerce.number().default(30),
CLAUDE_PERMISSION_MODE: z.enum(["default", "acceptEdits", "bypassPermissions"]).default("acceptEdits"),
```

### Step 2: Create SDK tools (`src/agents/sdk-tools.ts`)
Convert each tool handler to use `tool()` from the SDK:
- `list_todos` — readOnlyHint: true
- `create_todo` — readOnlyHint: false
- `update_todo` — readOnlyHint: false
- `complete_todo` — readOnlyHint: false
- `add_subtask` — readOnlyHint: false
- `search_todos` — readOnlyHint: true
- `get_todo_stats` — readOnlyHint: true
- `get_todo_tree` — readOnlyHint: true
- `archive_todo` — readOnlyHint: false, destructiveHint: true
- `bulk_complete` — readOnlyHint: false
- `get_overdue` — readOnlyHint: true
- `get_upcoming` — readOnlyHint: true
- `count_by_status` — readOnlyHint: true
- `get_by_priority` — readOnlyHint: true
- `get_by_category` — readOnlyHint: true
- `duplicate_todo` — readOnlyHint: false
- `get_subtasks` — readOnlyHint: true
- `bulk_update_priority` — readOnlyHint: false
- `quick_add` — readOnlyHint: false
- `analyze_productivity` — readOnlyHint: true
- `decompose_goal` — readOnlyHint: false (this uses Claude's own reasoning, not a separate query)

Then create the MCP server:
```typescript
import { createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";

export const cognitaskMcpServer = createSdkMcpServer({
  name: "cognitask",
  version: "0.1.0",
  tools: [...allTools],
});
```

### Step 3: Create ClaudeAIService (`src/services/claude-ai.service.ts`)
Implements the `AIService` interface using `query()`:

- **decompose**: Sends a prompt asking Claude to analyze the goal and use `create_todo` tools to build the task list. Streams AgentEvents via async generator.
- **categorize**: Sends a prompt asking Claude to categorize the task, returns structured JSON.
- **prioritize**: Sends a prompt asking Claude to prioritize, returns structured JSON.
- **suggest**: Sends current todos as context, asks Claude to suggest next actions.
- **estimate**: Sends task details, asks Claude to estimate time/complexity.

Each method passes the `cognitaskMcpServer` in `options.mcpServers` and `allowedTools: ["mcp__cognitask__*"]`.

### Step 4: Create ClaudeOrchestrator (`src/agents/claude-orchestrator.ts`)
- Wraps ClaudeAIService with business logic
- Streams events via WebSocket during decompose
- Handles session creation/tracking with `sessionService`
- Manages `autoSave` by reading Claude's tool calls from the result

### Step 5: Wire up routes
- `ai.routes.ts`: Use `agentOrchestrator.decomposeGoal()` instead of raw `aiService.decompose()`
- `ai-v2.routes.ts`: Replace mock responses with real SDK calls
- Add a new `/api/ai/chat` endpoint for freeform conversation

### Step 6: Update index.ts
- Import and register the cognitask MCP server
- Wire up the real AI service based on API key availability

## SDK Usage Pattern

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: `Decompose this goal into ${maxTasks} actionable tasks: "${goal}".
           Use the create_todo tool to create each task with appropriate title, description, priority, and category.`,
  options: {
    mcpServers: { cognitask: cognitaskMcpServer },
    allowedTools: ["mcp__cognitask__*"],
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
    maxTurns: 30,
    model: env.CLAUDE_MODEL,
  }
})) {
  if (message.type === "assistant") {
    // Stream tool calls as progress events
  }
  if (message.type === "result") {
    // Capture final result
  }
}
```

## Fallback Behavior
If `ANTHROPIC_API_KEY` is not set, the app uses `MockAIService` (current behavior). This is controlled by a factory function in `ai.service.ts`.

## Environment Setup
User needs to set:
```bash
export ANTHROPIC_API_KEY=sk-ant-...
```
