# BuildFlow Implementation Plan

This document defines how future BuildFlow work should be planned and documented.

## Principles

- Keep planning small, explicit, and file-scoped.
- Write tasks so a lower-capability model can execute them without broad architectural inference.
- Prefer verified, incremental changes over speculative refactors.
- Preserve the stable v1.0 Custom GPT Actions baseline unless a change is explicitly part of a documented next phase.
- Separate reasoning/design from handoff tasks.

## Repo areas

Future work should be organized around these areas:

- `docs/` for canonical docs, release notes, roadmap, and planning artifacts
- `apps/web/` for the dashboard, proxy routes, and GPT-facing HTTP actions
- `packages/cli/` for the local agent, source/context management, indexing, and write helpers
- `packages/bridge/` for relay and device coordination infrastructure
- `packages/shared/` for types and shared constants

## Documentation update rules

- Update canonical docs first when product meaning changes.
- Keep `docs/product/README.md` as the documentation index.
- Keep `docs/product/roadmap.md` as the planning overview.
- Keep `docs/product/releases/custom-gpt-actions-v1.0.md` as the stable release note for the current baseline.
- Mark older docs as historical/reference instead of rewriting them into new canonical truth.
- Avoid duplicating canonical content across many files.
- For BuildFlow Dokploy migration docs, always state the current URL ownership before giving deployment instructions.
- State clearly that `buildflow.prochat.tools` currently points to Steve's local BuildFlow through Cloudflare tunnel until Phase 4 is explicitly approved.
- State clearly that `buildflow-staging.prochat.tools` is the temporary Dokploy staging route.
- Do not write production-domain instructions that imply Dokploy already owns `buildflow.prochat.tools` before Phase 4 approval.
- Do not duplicate or contradict the canonical topology: one Docker image/container, public proxy port 3054, internal relay port 3053, internal web app port 3055, persistent volume /var/lib/buildflow.
- Do not include active guidance to stop, clean up, restart, or decommission Steve's local runtime before explicit Phase 5 approval.

## Release note rules

- Release notes should state status, scope, and stable boundaries.
- A release note should say what is canonical, what is historical, and what changed.
- A release note should not claim completion unless the referenced build/verifier evidence exists.
- If a release note mentions a write contract, it must mention `verified:true`.

## OpenAPI and GPT action update rules

- Keep the public GPT action surface aligned with `docs/CUSTOM_GPT_INSTRUCTIONS.md`.
- Any OpenAPI change must be reflected in the instructions and verified by the public verifier.
- Any write response exposed to GPT must require `verified:true`.
- If a route or schema changes, update the verifier before describing the change as done.
- Do not rename stable actions unless the release note explicitly documents the rename.

## Verification expectations

- Build the affected packages before claiming success.
- Run the dashboard verifier for dashboard or proxy changes.
- Run the write-contract verifier for write-path changes.
- Run the public GPT action verifier against the real public HTTPS URL for GPT-facing changes.
- If a test creates smoke files, clean them up and say so explicitly.

## Lower-model task format

Tasks for Codex 5.1 mini, Haiku, or similar models should be:

- one file scope or one small folder scope
- clearly bounded
- explicit about allowed files
- explicit about steps
- explicit about acceptance criteria
- explicit about verification commands
- free of broad design judgment

Task prompts should not require the model to infer architecture across unrelated systems.
Do the reasoning and design first, then hand off the implementation details.

## v1.1 documentation foundation tasks

Use these tasks when starting the v1.1 documentation foundation. Keep them file-scoped and cheap to execute.

### Task A: Canonical docs index

- **Title:** Maintain `docs/product/README.md`
- **Scope:** Documentation only
- **Allowed files:** `docs/product/README.md`
- **Steps:**
  1. Keep `docs/product/README.md` as the canonical docs index.
  2. Keep v1.0 marked as the stable baseline.
  3. Keep canonical links and the historical/reference split current.
- **Acceptance criteria:**
  - the file exists
  - it names v1.0 as the stable baseline
  - it links the release note, instructions, OpenAPI README, root README, roadmap, and implementation plan
- **Verification:** `sed -n '1,160p' docs/product/README.md`

### Task B: Roadmap

- **Title:** Maintain `docs/product/roadmap.md`
- **Scope:** Documentation only
- **Allowed files:** `docs/product/roadmap.md`
- **Steps:**
  1. Keep v1.0, v1.1, v1.2, and later sections conservative and factual.
  2. Keep v1.1 focused on documentation and planning maturity.
  3. Keep v1.2 clearly separated as later product expansion.
- **Acceptance criteria:**
  - roadmap exists
  - it does not claim unverified completion
  - it includes v1.0, v1.1, v1.2, and later sections
- **Verification:** `sed -n '1,220p' docs/product/roadmap.md`

### Task C: Implementation plan

- **Title:** Maintain `docs/product/implementation-plan.md`
- **Scope:** Documentation only
- **Allowed files:** `docs/product/implementation-plan.md`
- **Steps:**
  1. Keep planning principles explicit and narrow.
  2. Keep repo areas, docs rules, and verification expectations current.
  3. Keep lower-model task formatting file-scoped and testable.
- **Acceptance criteria:**
  - document exists
  - it instructs task writers to keep tasks narrow and file-scoped
  - it says reasoning/design should happen before task handoff
- **Verification:** `sed -n '1,260p' docs/product/implementation-plan.md`

## v1.2.0-beta Free GitHub execution guidance

The current highest-priority implementation target is **BuildFlow v1.2.0-beta**, the public self-hosted GitHub beta.

All work before v1.2.0-beta should be filtered through first-run public usefulness:

> Does this make a first-time self-hosted GitHub user more likely to install, understand, trust, use, star, share, or contribute to BuildFlow?

If the answer is no, defer it unless it fixes a serious reliability, safety, documentation, or onboarding problem.

### v1.2.0-beta implementation lanes

Use these lanes to organize work. Keep tasks narrow and file-scoped within each lane.

1. **Dashboard readiness**
   - fixed-viewport control center
   - no clipped essential information at common laptop sizes
   - source, context, plan, handoff, and settings panes understandable without private explanation
   - empty/loading/error/connected states clear
   - light/dark mode stable

2. **Self-hosting onboarding**
   - root README quickstart works from a fresh clone
   - one recommended local start path is obvious
   - ports 3052, 3053, and 3054 are explained
   - environment token setup is documented
   - setup and maintenance docs cover start, stop, restart, rebuild, verify, and troubleshooting

3. **Custom GPT integration**
   - explain the accompanying BuildFlow Custom GPT and link it when available
   - explain how to import or use the OpenAPI schema
   - explain Bearer token setup
   - explain the difference between the maintainer/public `buildflow.prochat.tools` endpoint, local URLs, and a user's own tunnel/domain
   - do not imply that every user's local files automatically connect through the maintainer's tunnel unless that is verified and intentionally supported

4. **Packaging and repo readiness**
   - root-level commands are simple and documented
   - repo structure is understandable
   - first-run friction is captured as issues or beta blockers
   - issue/discussion/contribution templates invite participation
   - commit messages are clear, public, and show active improvement

5. **Marketing readiness**
   - README explains value in the first screen
   - demo flow is reproducible
   - screenshots/GIF/video path exists
   - GitHub profile/repo setup encourages stars, discussions, questions, and shares
   - public messaging stays honest: local-first beta, useful today, still improving

### v1.2.0-beta task format

Every pre-beta task should include:

- release lane: dashboard, onboarding, Custom GPT, packaging, repo/community, marketing, or verification
- public user outcome
- allowed files
- explicit acceptance criteria
- verification commands
- whether the task affects Free GitHub, Pro SaaS, Team, or future/backlog

### Commit-message guidance for build-in-public

Commit messages should be understandable to outside readers. Prefer:

- `docs: define v1.2.0-beta launch gate`
- `dashboard: contain sources pane without clipping`
- `onboarding: add self-hosted quickstart`
- `gpt: document Custom GPT setup flow`
- `repo: add issue templates for beta feedback`

Avoid vague messages such as `fix stuff`, `updates`, `misc`, or `wip` on public-facing branches.

## v1.2 dashboard design implementation guidance

The first v1.2 product surface is the BuildFlow dashboard design.

Before implementation, reasoning should define the dashboard design brief and Haiku/Codex tasks should only execute narrow, file-scoped UI changes.

### Dashboard design goal

Create a premium, calm, functional BuildFlow dashboard that makes the product value clear immediately above the fold.

The dashboard should help the user understand, without scrolling:

- what source or workspace is connected
- what BuildFlow knows about the current project
- whether there is an active blueprint, plan, or execution packet
- what the next recommended action is
- where to copy or continue handoff prompts
- whether writes, verification, or action calls are healthy

### Dashboard design constraints

- Do not make the UI feel intimidating, noisy, or developer-only.
- Do not use a dense cockpit layout as the default.
- Do not use generic AI-dashboard purple gradients or default shadcn styling.
- Prefer a small number of high-signal panels over many widgets.
- Use strong whitespace, premium typography, restrained color, and precise status indicators.
- Include empty, loading, error, and connected states.
- Keep motion subtle and purposeful; avoid performance-heavy decorative animation.
- Preserve existing runtime behavior unless a later implementation task explicitly changes it.

### Recommended Brain skills for dashboard design

Use these Brain skills as design input before assigning implementation tasks:

1. `brain/ai/skills/custom/design-system/SKILL.md`
   - use first to choose or create a project-level `DESIGN.md`
   - prefer a Linear, Vercel, Resend, or custom BuildFlow-style system for a premium SaaS dashboard
   - avoid using Stitch unless explicitly requested

2. `brain/ai/skills/custom/web-design/SKILL.md`
   - use to turn the dashboard goal into an implementation-ready design spec
   - align output to Next.js, TypeScript, Tailwind, and shadcn/ui
   - require layout map, visual tokens, component list, motion plan, accessibility checks, and build notes

3. `brain/ai/skills/custom/ui-ux-pro-max/SKILL.md`
   - use to query style, palette, typography, dashboard/product UX, chart, shadcn, and Next.js guidance
   - use as a design intelligence source, not as a substitute for product reasoning

4. `brain/ai/skills/custom/taste-skill/redesign-skill/SKILL.md`
   - use when upgrading the existing dashboard instead of rebuilding from scratch
   - prioritize typography, color cleanup, hover/active states, spacing, component quality, and empty/loading/error states

5. `brain/ai/skills/custom/taste-skill/taste-skill/SKILL.md`
   - use selectively for premium frontend guardrails
   - lower the visual density for the default dashboard and avoid over-animated bento patterns unless they serve the user workflow

### v1.2 dashboard task sequence

Task prompts for Haiku or other lower models should follow this order:

1. audit the current dashboard files and summarize existing structure
2. create or select a `DESIGN.md` for BuildFlow dashboard styling
3. write a dashboard design brief in docs before code changes
4. implement the above-the-fold dashboard shell only
5. add core status cards and next-action panel
6. add empty, loading, error, and connected states
7. add prompt handoff and execution packet preview areas
8. run dashboard verification and visual review

Each task must name allowed files, exact acceptance criteria, and verification commands.

## Suggested workflow

1. Read the canonical docs and release note.
2. For v1.2 dashboard work, read the Brain design skills listed above before writing a task brief.
3. Write a narrow task brief.
4. Hand off the task with file scope and verification commands.
5. Run the relevant verifier.
6. Update the roadmap or release note only if the result changes canonical meaning.
