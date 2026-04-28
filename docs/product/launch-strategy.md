# BuildFlow Launch Strategy

## Status

Canonical planning document for BuildFlow launch phases, free/pro boundaries, and dashboard design implications.

This document defines intended product direction. It does not claim that Pro, Team, hosted execution, or collaboration features are currently implemented.

## Core principle

BuildFlow Free must be genuinely useful and open source forever.

The free GitHub version should not feel crippled, artificially limited, or like a trial. It should deliver the core BuildFlow promise:

> Think in ChatGPT. Build anywhere.

BuildFlow Pro should monetize convenience, hosted reliability, managed execution, persistence, and collaboration readiness — not the removal of artificial limits from the free product.

BuildFlow Local is the free GitHub product mode and should remain fully self-hosted.

BuildFlow Managed is the future paid convenience mode and may use BuildFlow-operated relay infrastructure.

## Launch phases

## Phase 1: Free GitHub launch

Phase 1 now has two explicit release gates:

- **v1.2.0-beta:** public self-hosted GitHub beta. This is the current highest priority.
- **v1.2.0:** stable Free GitHub release after beta feedback and onboarding friction are resolved.

Goal:

Launch BuildFlow as a complete local-first open-source product that can be showcased publicly, earn trust, attract GitHub stars, and support marketing on X, Facebook, and other channels.

Audience:

- solo builders
- indie hackers
- AI-native builders
- non-technical or semi-technical users willing to use a local tool if the value is clear
- developers who want a structured ChatGPT-to-Codex/Claude handoff workflow

Purpose:

- prove the BuildFlow workflow
- demonstrate the dashboard and Custom GPT loop
- make the product credible before SaaS monetization
- create public demos and marketing material
- let users experience the full local workflow for free

Free GitHub should include:

- local-first dashboard UI
- local agent and local source access
- connect/disconnect sources
- multiple sources without artificial count limits
- active context visibility
- source indexing/readiness status
- agent health/status visibility
- Custom GPT action integration
- search/read local context
- verified local artifact/write flows where supported
- blueprint and plan visibility
- local execution packet generation
- local checklist/timeline/progress view
- resume local plan
- copy-ready Codex prompts
- copy-ready Claude Code prompts
- AI-agnostic handoff direction
- local progress/status tracking
- clear setup and local operation docs
- explicit self-hosting guidance for user-owned endpoints, tunnels, and domains

Free GitHub should not include:

- hosted account requirement
- paid account requirement
- team workspaces
- managed cloud execution
- hosted plan history
- cross-device cloud sync
- direct hosted executor sessions
- team roles or permissions
- billing/account management
- dependency on BuildFlow-operated relay infrastructure by default

Free GitHub should avoid:

- source-count limits
- executor-choice limits
- restricting the core dashboard
- hiding core planning/handoff features behind a paywall
- upgrade prompts that interrupt the local workflow

## Phase 2: Pro SaaS

Goal:

Turn BuildFlow into a hosted, paid SaaS that offers the same core value with much less setup friction and substantially more convenience.

Pro is not “Free with limits removed.” Pro is:

> BuildFlow, but effortless.

Audience:

- users who want BuildFlow without cloning a repo
- users who want guided onboarding
- users who want managed accounts, history, and convenience
- users willing to pay to avoid terminal/setup friction
- users who want direct dashboard execution instead of manual copy/paste handoff

Pro should include:

- hosted account
- hosted dashboard
- simplified onboarding wizard
- managed setup flow
- cloud-backed plan history
- cross-device continuity
- hosted execution packet library
- managed executor sessions where technically feasible
- direct “run from dashboard” flows for Codex and Claude Code where supported
- richer execution feedback
- resumable managed runs
- advanced templates and workflows
- premium integrations
- account settings
- billing and subscription management
- priority convenience features

Pro should preserve:

- AI-agnostic handoff philosophy
- support for Codex and Claude Code
- local-first trust where local access is involved
- clear user control over execution

Pro dashboard difference:

- Free: copy-ready prompts and local status tracking.
- Pro: direct dashboard execution, hosted history, managed feedback, and reduced setup friction.

## Phase 3: Team plan

Goal:

Add collaboration and team execution workflows after the free GitHub launch and Pro SaaS foundation are proven.

Team is later than Pro.

Team should include:

- team workspaces
- shared projects
- shared sources where appropriate
- roles and permissions
- team activity/history
- shared execution packets
- plan review and approval flows
- comments or collaboration notes
- organization settings
- team billing

Team should not be part of the first free GitHub launch.

## Free GitHub v1.2.0-beta release gate

v1.2.0-beta is good enough to market publicly when a first-time technical user can complete the local workflow from the README without private help.

Required beta outcomes:

1. clone the repo and install dependencies from one clear path
2. start the local stack with a documented command
3. open the dashboard and understand the five main sections
4. connect a local source and see index/readiness status
5. configure the accompanying Custom GPT from documented steps
6. understand whether they should use `buildflow.prochat.tools`, a local URL, or their own tunnel
7. search/read local context from ChatGPT
8. generate or inspect a local plan/execution packet
9. copy Codex and Claude Code handoff prompts
10. recover from common setup failures using troubleshooting docs
11. know how to open issues, discussions, stars, and contributions

The beta may still be marked early, but it must not feel like a private developer-only experiment.

### Public repository readiness for v1.2.0-beta

The GitHub repo should be treated as a product surface. Before public beta marketing, it should include:

- an optimized root README with clear value proposition, screenshots/GIF path, quickstart, architecture, privacy, and contribution call-to-action
- a self-hosting guide for local setup and maintenance
- a Custom GPT setup guide with the GPT link once available
- a troubleshooting guide for auth, ports, tunnel, indexing, stale cache, and service health
- GitHub issue templates for bugs, questions, ideas, and first-run setup friction
- GitHub discussion guidance if discussions are enabled
- contributor guidance and development commands
- release checklist for v1.2.0-beta
- public commit-message discipline that makes the project history clear, intentional, and inviting

### Public communication goals for v1.2.0-beta

BuildFlow will be built in public. Public messaging should invite participation without overclaiming maturity.

The beta should communicate:

- local-first and open-source
- useful today for ChatGPT-to-Codex/Claude handoff
- early, active, and improving quickly
- stars, issues, discussions, and workflow feedback are welcome
- BuildFlow Local is the free default
- BuildFlow Managed is later and paid
- Team is later, not required for the free local workflow

## Free vs Pro boundary

## Free GitHub promise

BuildFlow Free is BuildFlow Local: the complete local-first planning and handoff workflow.

A free user should be able to:

1. connect local knowledge sources
2. inspect source and agent health
3. plan with ChatGPT and BuildFlow context
4. see the current plan in the dashboard
5. generate or inspect an execution packet
6. copy optimized prompts for Codex and Claude Code
7. track local task progress
8. resume a local plan

## Pro SaaS promise

BuildFlow Pro is BuildFlow Managed: it removes setup friction and adds managed cloud convenience.

A Pro user should be able to:

1. onboard without manual repo cloning
2. use a hosted dashboard/account
3. keep plan history across devices
4. resume from cloud-backed state
5. run or manage executor workflows more directly from the dashboard
6. receive richer execution feedback
7. use advanced templates and integrations
8. reduce terminal/manual copy-paste work

## Team promise

BuildFlow Team turns individual build plans into collaborative execution.

A Team user should be able to:

1. share workspaces
2. coordinate plans and tasks
3. manage roles and permissions
4. review and approve execution steps
5. maintain team history and accountability

## Dashboard design implications

The dashboard should be designed as a Local-first product surface that can later support Managed and Team features without a redesign.

Free dashboard should show:

- connected sources
- active context mode
- agent health
- current plan
- execution packet
- local timeline/checklist
- resume plan
- copy Codex prompt
- copy Claude Code prompt
- local status/verification state

Pro-ready dashboard architecture should reserve space for:

- hosted account state
- cloud sync state
- hosted plan history
- direct executor runs
- managed run feedback
- advanced templates
- premium integrations
- team/workspace selector later

Pro-only UI should not dominate the free dashboard.

Acceptable free UI treatment:

- subtle future/pro indicators in settings or secondary areas
- empty slots that degrade gracefully
- copy-prompt fallback where direct execution is Pro/future
- “coming later” notes only where they clarify direction

Avoid in free UI:

- aggressive upgrade banners
- disabled core workflow buttons
- locked cards that make the user feel restricted
- paywalling source count, prompt handoff, or local dashboard use

## Execution model boundary

## Free execution model

Free GitHub should focus on:

- local execution packets
- copy-ready prompts
- manual Codex/Claude Code execution outside the dashboard
- local task status tracking
- resume guidance
- basic validation/status display

## Pro execution model

Pro should add:

- direct dashboard execution where technically feasible
- hosted executor session management
- richer run feedback
- resumable managed runs
- automatic updates to task status where supported
- reduced terminal exposure

## Minimum viable execution feedback loop

For early v1.2, the dashboard only needs a simple execution feedback model:

- pending
- active
- done
- blocked
- failed
- verified
- paused

The dashboard should show:

- current phase
- current task
- next task
- completed task count
- blocked or failed state when relevant
- resume action
- latest verification or artifact state where available

This is enough to make the dashboard useful without building full live terminal orchestration.

## Future execution feedback loop

Later versions should move toward:

- live executor run state
- direct Codex/Claude Code session feedback
- summarized terminal output
- task-level verification updates
- pause/resume/stop controls
- review-required states
- automatic plan timeline updates
- executor-agnostic run history

This future direction should be visible in planning, but not crammed into the first v1.2 dashboard implementation.

## Command bar direction

A global command bar is planned for v1.3 or later.

Possible command bar actions:

- connect source
- switch source/context
- resume plan
- generate execution packet
- copy Codex prompt
- copy Claude Code prompt
- open current task
- reindex sources
- open settings

Do not make the command bar required for v1.2.

## Main dashboard route

The main BuildFlow product dashboard should live at:

`/dashboard`

The dashboard should become the primary product surface for both the free GitHub version and the future SaaS version.

## AI-agnostic handoff principle

BuildFlow should not lock users into one AI executor.

Free and Pro should support Codex and Claude Code as first-class handoff targets.

Handoff prompts should be optimized for lower-cost and lower-capability execution models when appropriate. Reasoning and design should happen before handoff so that executor prompts can stay narrow, explicit, and token-efficient.

## What not to build now

For the first v1.2 dashboard implementation, do not build:

- hosted accounts
- billing
- team workspaces
- direct managed executor sessions
- full live terminal replacement
- cloud sync
- advanced template marketplace
- team permissions
- aggressive Pro upsell flows

Instead, design the dashboard so these can be added later without restructuring the product.

## Documentation requirements

Roadmap and dashboard docs should clearly separate:

- free GitHub launch
- Pro SaaS
- Team plan
- v1.2 dashboard scope
- v1.3 command bar direction
- future execution feedback direction

Any implementation task should explicitly state whether it belongs to:

- Free GitHub
- Pro SaaS
- Team
- future/backlog
