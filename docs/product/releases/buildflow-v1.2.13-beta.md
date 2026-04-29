# BuildFlow v1.2.13-beta

Status: beta

BuildFlow v1.2.13-beta adds transparent activity feedback for Custom GPT conversations. The goal is to make the assistant explain what BuildFlow is checking, reading, planning, writing, blocking, or verifying without changing the built-in ChatGPT loading UI.

## What changed

- action responses now include structured `activity` metadata
- status, source, active context, inspect, read, artifact write, and file change actions all report a concise activity summary
- the GPT can now say things like "checking connection", "reading files", "preflighting a protected path", or "write verified"
- progress phases are standardized across actions
- safety rules, confirmation gates, and `verified:true` behavior remain unchanged

## Why it matters

The assistant can now give users clearer progress updates during longer BuildFlow flows. That makes the work feel less opaque without exposing secrets or raw file contents.

## Supported feedback areas

- connection and source checks
- active context selection
- repository inspection and search
- exact file reads
- verified artifact writes
- file maintenance operations such as delete, move, rename, mkdir, and rmdir
- dry-run and preflight policy checks
- blocked or confirmation-required operations

## Limitation

BuildFlow cannot control ChatGPT’s native "Talking to buildflow.prochat.tools" loading label. This release improves the assistant’s own narration before and after tool calls instead.

## Safety and privacy

- no secrets, raw env values, bearer tokens, or private keys in activity summaries
- no raw file contents in activity summaries
- no path traversal or secret-path bypasses
- confirmation-gated operations still require confirmation
- `dryRun` / `preflight` remain no-write checks

## Validation performed

- type checks for the CLI and web packages
- write policy verification
- OpenAPI schema regeneration and contract checks when needed

The token-based Custom GPT verifier is only run when `BUILDFLOW_ACTION_TOKEN` is available.

## Custom GPT guidance

When the OpenAPI action schema changes, reimport the GPT actions, save the GPT, and start a new chat. Restarting BuildFlow Local alone does not refresh an already imported action schema.

## Custom GPT narration guidance

BuildFlow backend actions now return structured activity metadata, but the Custom GPT still needs instruction to narrate it.

The GPT should:

- say what it is about to check before a tool sequence
- summarize `activity.userMessage` after meaningful actions when present
- keep progress updates concise and human-readable
- avoid raw secrets, raw env values, bearer tokens, private keys, and raw file contents
- only claim writes after `verified:true`
- treat `dryRun` / `preflight` as allowed, blocked, or needs confirmation, not as saved changes
- stop and ask for confirmation when the action requires it

The dashboard activity stream, if added later, is separate from the GPT narration layer.

## Future dashboard activity UI

The dashboard-side live activity feed is planned as a future enhancement, not part of v1.2.13-beta.

This release completes the backend activity metadata and Custom GPT narration layer. The dashboard feed remains a separate next step for BuildFlow Local so users can see a live or recent activity stream inside the dashboard itself.

Any future dashboard activity UI should keep the same safety rules:

- no secrets, raw env values, bearer tokens, private keys, credentials, or raw file contents
- safe paths and status labels only
- concise, user-facing entries rather than debug logs
- verification and confirmation state visible at a glance

## Explicitly not changed

- write safety boundaries
- secret protection
- traversal protection
- generated-output write blocking
- binary write blocking
- confirmation gates for protected maintenance paths
