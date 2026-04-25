BuildFlow

Turn ideas into execution packets tailored to your actual local toolchain.

BuildFlow helps solo developers and indie hackers go from a rough idea to a structured, execution-ready plan they can use with Codex CLI, Claude Code, or any IDE workflow.

It starts with your real local context — your repositories, notes, docs, methods, and project files — then helps you:

* clarify the idea
* scan your actual local toolchain
* generate a blueprint and phased plan
* produce execution packets and prompts
* hand everything off into the coding tool you already use

Think in ChatGPT. Build anywhere.

BuildFlow is a local-first, open-source planning and handoff layer for AI-native builders.

Why BuildFlow?

Most AI workflows break between thinking and doing.

You can reason through an idea in ChatGPT, but the moment you move into implementation, the workflow usually falls apart. You still have to rebuild context in your coding tool, turn rough thinking into structured tasks, figure out what your local machine can actually do, and keep everything aligned across chats, files, repos, and terminals.

BuildFlow fixes that handoff.

It turns a planning session into a reusable local execution packet tailored to the repo, machine, and tools you actually have.

What makes BuildFlow different?

* Local-first context — Your files stay on your machine. BuildFlow works with your local repos, notes, and markdown knowledge sources.
* Toolchain-aware planning — BuildFlow detects the tools and environment you actually have installed and adapts the plan accordingly.
* Execution packets — It turns ideas into structured local artifacts: phases, tasks, prompts, decisions, and status files.
* Works with your existing tools — Use Codex CLI, Claude Code, Cursor, VS Code, or any workflow you already prefer.
* Open-source and inspectable — The packet format is file-based, transparent, and easy to understand.
* Free to try — The local workflow is the core product, not a teaser.

Who is it for?

BuildFlow is built for:

* solo developers who want more structure from AI planning
* indie hackers moving from idea to implementation quickly
* founder-operators who think in ChatGPT but build with local tools
* AI-native builders who want better handoff between reasoning and execution

If you already use ChatGPT to think and Codex / Claude / your IDE to build, BuildFlow is designed for you.

What BuildFlow does

✅ Loads local context — Search and read across connected local knowledge sources
✅ Guides planning — Capture the idea through a Blueprint-style planning flow
✅ Scans your environment — Detect available executors, runtimes, package managers, deployment tools, and repo signals
✅ Generates execution packets — Write structured local artifacts into a standard folder
✅ Creates per-tool prompts — Generate copy-ready prompts for Codex CLI and Claude Code
✅ Shows progress in a dashboard — Visualize plans, packets, phases, and execution timeline
✅ Keeps files local — No cloud sync of your project files

What BuildFlow does NOT do

❌ Replace your coding tool — BuildFlow is the planning and handoff layer, not a full IDE agent replacement
❌ Upload your repo to a hosted SaaS by default — The core workflow is local-first
❌ Promise perfect automation — v1 is designed for reliable handoff, not fully autonomous execution
❌ Hide everything behind a paywall — The free local product is meant to be genuinely useful

Core workflow

1. Start with an idea in ChatGPT
2. BuildFlow loads local context from your repos, notes, and docs
3. BuildFlow captures the blueprint
4. BuildFlow scans your local toolchain and repo
5. BuildFlow generates an execution packet
6. You copy a tool-specific prompt into Codex CLI, Claude Code, or your IDE
7. BuildFlow tracks progress in the dashboard

Example execution packet

BuildFlow writes structured local artifacts like these:

.buildflow/
  blueprint/
    session.json
    summary.md
    capability-profile.json
    repo-profile.json
  plan/
    overview.md
    phases.json
    tasks.json
    acceptance-criteria.md
  prompts/
    codex/
      phase-01.txt
    claude/
      phase-01.txt
  execution/
    active-run.json
    timeline.jsonl
    status.json
  artifacts/
    decisions.md
    risks.md

This means your planning output is no longer trapped inside one chat. It becomes a portable, inspectable handoff format your local tools can use.

Architecture

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
         │ • .buildflow execution packets           │
         └────────────────────────────────────────┘

Two execution modes

direct-agent (default):

* Web forwards requests directly to the local agent (3052)
* Simplest setup for local-only use
* No relay needed
* BUILDFLOW_BACKEND_MODE=direct-agent

relay-agent:

* Web routes through relay (3053) to the agent via WebSocket
* Enables device coordination and bearer token auth
* Designed for more advanced and future hosted workflows
* BUILDFLOW_BACKEND_MODE=relay-agent

Quick Start

1. Clone & install

git clone https://github.com/stevewesthoek/buildflow
cd buildflow
pnpm install

2. Start the local services

export BUILDFLOW_ACTION_TOKEN=$(openssl rand -hex 32)
export LOCAL_AGENT_URL="http://127.0.0.1:3052"
pnpm dev

This starts:

* Agent on 3052
* Relay on 3053
* Web on 3054

3. Connect your local source(s)

Point BuildFlow at a local repo, markdown folder, notes vault, or workspace you want to plan with.

For now, source setup is managed in the current local flow. The BuildFlow UX builds on top of that foundation.

4. Set up your Custom GPT

1. Create a new Custom GPT in ChatGPT
2. Import the OpenAPI schemas from the per-action URLs in `docs/openapi.chatgpt/README.md`
3. Set authentication to Bearer token, using your BUILDFLOW_ACTION_TOKEN
4. Test with a simple prompt like:
    * “Search my local project context for notes about pricing”
    * “Help me turn this idea into a phased implementation plan”

First things to try

Try one of these prompts after setup:

"Search my local context for everything related to my SaaS idea and summarize the current direction."
"Help me turn this idea into a phased implementation plan for Codex CLI."
"Read my local strategy docs and create a build-ready task breakdown."
"Search my repo and notes, then create a local execution plan for the next phase."

Privacy & security

Local-first by design:

* your files stay on your machine
* indexing and scanning happen locally
* ChatGPT only receives the results and content explicitly returned through the bridge

Current security guarantees:

* path traversal prevention
* extension filtering
* append-only write flows where applicable
* bearer token authentication
* audit logging
* user-controlled local runtime

Current limitations

BuildFlow is early and evolving.

Current limitations include:

* some product language and internals may still reference BuildFlow while the project transitions to BuildFlow
* the strongest v1 workflow is planning + packet generation + handoff, not full autonomous execution
* multi-device and team workflows are future work
* semantic search and richer packet templates are planned
* the current setup is still more builder-focused than beginner-friendly

Roadmap

Near term

* BuildFlow rebrand and docs update
* Blueprint Wizard flow
* local capability scan
* execution packet generator
* packet visualization in dashboard
* per-tool prompt generation

Later

* richer executor integrations
* live timeline improvements
* better template packs
* hosted control plane for BuildFlow Pro
* team workflows

Why try it now?

Because the core loop is already useful today:

Plan in ChatGPT. Generate a packet. Build with the tools you already use.

If you care about:

* local-first AI workflows
* better planning-to-execution handoff
* AI-native developer tooling
* structured execution instead of messy copy-paste

then BuildFlow is worth trying now.

It is early, but the product direction is clear and the workflow is inspectable.

For testers & contributors

BuildFlow is early stage and actively looking for:

* testers
* bug reports
* feedback on the packet format
* feedback on the best Codex / Claude / IDE handoff workflow
* contributors interested in local-first AI tooling

Ways to help

* ⭐ Star the repo if the direction is interesting
* open an issue with what broke or confused you
* share your preferred Codex / Claude / IDE workflow
* suggest better packet structures or dashboard views
* contribute docs, fixes, scans, templates, or integrations

Development

pnpm install
pnpm dev
pnpm type-check
pnpm test
pnpm build

Support & feedback

* Issues & bugs: GitHub Issues
* Questions & ideas: GitHub Discussions
* Roadmap / docs: repo docs and future BuildFlow docs

License

MIT — free to use, modify, and distribute
