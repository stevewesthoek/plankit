BuildFlow

BuildFlow is a local-first planning and handoff layer for AI-native builders.
It connects a Custom GPT to your real repositories and notes so it can inspect, read, plan, and safely write back to connected local sources.

If you already think in ChatGPT and build in Codex CLI, Claude Code, or your IDE, BuildFlow is the bridge that keeps the work grounded in your actual repo state.

## Who it is for

BuildFlow is for solo developers, indie hackers, founder-operators, and small teams that want AI help without giving up local control.

It is most useful when you want to:

- inspect the files that actually exist in a repo
- read exact local source files or search then read
- turn a rough idea into a structured execution packet
- safely write repo-local changes when policy allows
- preflight a write before changing anything

## Public beta path

For the public GitHub beta, use the Local path:

1. `pnpm install`
2. `pnpm local:restart`
3. Open `http://127.0.0.1:3054/dashboard`

The beta release note is here:

- [`docs/product/releases/buildflow-v1.2.12-beta.md`](docs/product/releases/buildflow-v1.2.12-beta.md)

## What v1.2.12-beta adds

BuildFlow v1.2.12-beta expands safe repo-local work beyond writes-only workflows.

It adds:

- a repo-agnostic `repo_app_write` policy
- normal app-code roots such as `src/**`, `app/**`, `components/**`, `lib/**`, `prisma/**`, `scripts/**`, `tests/**`, and related paths
- a guarded `repo_app_maintainer` profile for safe delete, move, rename, mkdir, and rmdir tasks
- confirmation-gated cleanup for protected files, workflows, lockfiles, and selected maintenance paths
- consistent dotfile handling, including readable/writable env templates
- generated artifact cleanup and binary asset deletion when policy allows it
- `dryRun` / `preflight` checks before writing
- structured write errors for blocked or confirmation-required paths
- writable source metadata, including `writeProfile` and `writePolicy`
- verified writes that only count as complete after `verified:true`
- continued blocking for secrets, traversal, generated output, and other risky paths

## Safety model

BuildFlow is designed to be useful without being permissive.

The current write policy still blocks:

- `.env` and `.env.*`
- private keys and credential-like files
- path traversal and absolute paths outside the repo
- `.git/**`
- `node_modules/**`
- `.next/**`
- `dist/**`
- `build/**`
- `coverage/**`

Some paths still require explicit confirmation, including lockfiles, GitHub workflows, `LICENSE`, Prisma migrations, and package dependency changes.
Delete, move, rename, mkdir, and rmdir are also policy-checked and confirmation-gated when appropriate.

BuildFlow only treats a write as successful when the response includes `verified:true`.

## How to use with a Custom GPT

When the OpenAPI action schema changes:

1. Reimport or paste the updated schema in the GPT editor.
2. Save and update the GPT action definition.
3. Start a new chat if the old action definition was cached.
4. Restart BuildFlow only when the runtime code changed.

The canonical schema lives in:

- [`docs/openapi.chatgpt.json`](docs/openapi.chatgpt.json)
- [`https://buildflow.prochat.tools/api/openapi`](https://buildflow.prochat.tools/api/openapi)

The GPT instructions live in:

- [`docs/CUSTOM_GPT_INSTRUCTIONS.md`](docs/CUSTOM_GPT_INSTRUCTIONS.md)

## What this beta can and cannot do

It can:

- inspect connected sources
- read exact files
- search then read
- write allowed repo-local files
- preflight a write with `dryRun` / `preflight`
- return structured policy errors when a path is blocked

It cannot:

- bypass the policy
- write secrets or traversal paths
- write generated/vendor/runtime directories
- claim success without `verified:true`
- run git actions through BuildFlow tools
- broadly delete, move, or rename files

## Quick start

BuildFlow Local runs on your machine.

1. Clone the repo
2. Run `pnpm install`
3. Run `pnpm local:restart`
4. Open `http://127.0.0.1:3054/dashboard`

If you already have a local setup, use the beta release note and the Custom GPT import guide as the canonical paths for the current beta surface.

## Product docs

For the canonical product index and release history, see [`docs/product/README.md`](docs/product/README.md).

## Architecture

BuildFlow runs three services locally:

┌──────────────────────────────────────────────────────────────┐
│                  ChatGPT / Claude (via HTTPS)               │
│      planning, reasoning, summarization, clarification      │
└───────────────────────────┬──────────────────────────────────┘
                            │
                 ┌──────────┴──────────┐
                 │                     │
         ┌───────▼────────┐    ┌──────▼────────┐
         │   Web (3054)   │    │ Relay (3053)  │
         │ Next.js +      │    │ WebSocket     │
         │ Actions/API    │    │ bridge        │
         └───────┬────────┘    └──────┬────────┘
                 │                    │
                 └──────────┬─────────┘
                            │
                    ┌───────▼────────┐
                    │ Agent (3052)   │
                    │ • Context      │
                    │ • Search/read  │
                    │ • Scan         │
                    │ • Packet gen   │
                    │ • File ops     │
                    └────────┬───────┘
                             │
         ┌───────────────────▼────────────────────┐
         │ Your Local Workspace                   │
         │ • repos                                │
         │ • notes                                │
         │ • docs                                 │
         │ • skills / methods                     │
         │ • .buildflow execution packets         │
         └────────────────────────────────────────┘

Two execution modes:

- `direct-agent` uses the local agent on port 3052.
- `relay-agent` routes through the relay on port 3053.
