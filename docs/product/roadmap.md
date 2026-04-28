# BuildFlow Roadmap

This roadmap is conservative and documents the current planning direction without claiming work is complete unless an existing canonical doc proves it.

## Version targets

BuildFlow is now building toward a public Free GitHub beta for BuildFlow Local while separately validating BuildFlow Managed as the future paid convenience path.

| Version | Audience | Status meaning | Primary outcome |
| --- | --- | --- | --- |
| v1.0 | internal/public action baseline | stable Custom GPT Actions baseline | verified GPT action surface and write contract |
| v1.1 | maintainers/contributors | documentation and planning foundation | canonical docs, task format, verification discipline |
| v1.2.0-beta | BuildFlow Local public beta | marketable local-first beta | a new user can clone, run, connect sources, use the dashboard, connect the Custom GPT, and complete the local planning-to-handoff loop |
| v1.2.0 | BuildFlow Local stable | polished self-hosted release | beta feedback resolved, docs complete, onboarding robust, release note published |
| v1.3 | Free GitHub plus future Pro-ready improvements | post-beta product expansion | command bar, deeper dashboard flows, richer packet/plan UX where validated |
| BuildFlow Managed | paid hosted users | later commercial product | hosted onboarding, accounts, history, direct/managed execution convenience |
| Team | teams/organizations | later collaboration product | shared workspaces, roles, review, team history |

## BuildFlow v1.0

Stable Custom GPT Actions baseline.

v1.0 is the current reference point for the public Custom GPT action surface and verified write contract.

Canonical release note:

- [`docs/product/releases/custom-gpt-actions-v1.0.md`](./releases/custom-gpt-actions-v1.0.md)

## BuildFlow v1.1

Documentation, roadmap, and execution-planning foundation.

Emphasis:

- make the canonical docs easier to find
- clarify which docs are canonical versus historical
- define a repeatable implementation-task format for lower-capability coding models
- preserve the stable v1.0 action surface and verified write contract

### v1.1 non-goals

- no product redesign
- no runtime behavior changes
- no new public Custom GPT actions
- no new endpoint names
- no removal of historical docs
- no broad architecture changes

## BuildFlow v1.2.0-beta — BuildFlow Local public beta

This is the current build target and the highest priority.

Goal:

- ship a marketable, self-hosted, local-first BuildFlow Local beta on GitHub
- make the repo credible enough to share publicly on GitHub, X, Facebook, and related founder/developer communities
- prove the core promise: **Think in ChatGPT. Build anywhere.**

Audience:

- solo builders
- indie hackers
- AI-native developers
- technical early adopters
- people willing to self-host if setup is clear and the value is immediate

A v1.2.0-beta user should be able to:

1. clone the repo from GitHub
2. install dependencies from clear instructions
3. start the local stack without guessing
4. open `/dashboard`
5. connect a local source folder or repo
6. see agent, source, index, context, and write-mode health
7. connect the accompanying Custom GPT using documented instructions
8. use ChatGPT to search/read local context through BuildFlow
9. create or inspect a local plan/execution packet
10. copy a Codex or Claude Code handoff prompt from the dashboard
11. recover from common setup failures using troubleshooting docs
12. understand how to contribute, ask questions, open issues, and star/share the project

### v1.2.0-beta deliverables

#### Product and dashboard

- fixed-viewport dashboard that avoids document-style scrolling
- responsive containment so no essential content is hidden behind the fold
- dashboard sections for overview, sources, plan, handoff, and settings
- clear empty, loading, error, connected, indexing, failed, paused, and verified states where applicable
- working light/dark theme toggle with persistence
- no duplicate status surfaces that reduce clarity
- source management flow: add, enable/disable, activate/deactivate, reindex, remove
- active context and write-mode visibility/control
- copy-ready Codex and Claude Code handoff prompts
- basic local plan/execution packet visibility and progress placeholders

#### Self-hosting and onboarding docs

- public README optimized for first-time GitHub visitors
- one clear quickstart path from clone to dashboard
- local stack explanation: agent 3052, relay 3053, web 3054
- environment/token setup instructions
- Custom GPT setup guide and GPT Store/custom GPT link once available
- explanation of BuildFlow Local versus BuildFlow Managed URLs
- troubleshooting guide for auth 401, tunnel 502, stale Next cache, indexing issues, port conflicts, and local service health
- maintainer commands: start, stop, restart, rebuild web, verify
- documentation for what data stays local and what ChatGPT receives

#### Packaging and repo readiness

- simple local launch command or script path that is obvious from the root README
- clear repo structure explanation for new contributors
- release gate checklist for v1.2.0-beta
- issue/discussion templates for bugs, questions, ideas, and first-run friction
- contribution guidance suitable for build-in-public development
- commit-message guidance that keeps public history clear and intentional
- screenshots or GIF/video-ready demo path for marketing

#### Verification gate

Before v1.2.0-beta is described as ready, verify:

- fresh clone install path works from the README
- `pnpm --dir apps/web type-check` passes
- `pnpm local:rebuild-web` passes
- `pnpm local:verify` passes
- local agent health works on 3052
- local relay health works on 3053 where applicable
- local web OpenAPI works on 3054
- public `/api/openapi` returns 200 if public GPT integration is part of the demo
- `/api/actions/status` returns expected 401 without auth
- dashboard is manually checked at common laptop sizes
- Custom GPT setup is tested from documented steps

See [`docs/product/beta-release-gate.md`](./beta-release-gate.md) for the working checklist.

## BuildFlow v1.2.0 — BuildFlow Local stable

v1.2.0 follows v1.2.0-beta after real first-run feedback is addressed.

Goal:

- convert the beta into a stable self-hosted release that can be promoted more broadly without heavy caveats

Deliverables:

- beta onboarding friction resolved
- first-run setup docs validated by at least one clean-machine or clean-folder test
- known issues documented clearly
- release note published
- demo assets updated
- README and docs aligned with actual verified behavior
- dashboard accepted as the default free GitHub product surface

## BuildFlow v1.3 — Post-beta free product improvements

v1.3 is not required for the public beta.

Likely areas:

- command bar direction
- deeper plan/resume workflows
- richer execution packet visualization
- better local templates
- more refined progress/timeline model
- contributor-requested improvements from beta feedback

## BuildFlow Managed — Later paid hosted product

BuildFlow Managed is not part of the v1.2.0-beta BuildFlow Local launch.

Goal:

- monetize convenience, hosted reliability, cloud history, managed execution, and reduced setup friction

Examples:

- hosted account and dashboard
- guided hosted onboarding
- cloud-backed plan history
- managed execution sessions where feasible
- direct run flows from dashboard
- advanced templates and integrations
- billing/account settings

## Team — Later collaboration product

Team is later than Pro.

Examples:

- team workspaces
- roles and permissions
- shared sources or projects
- review and approval flows
- team activity/history

## Status discipline

- v1.0 means the stable baseline already released.
- v1.1 means documentation and planning maturity.
- v1.2.0-beta means public BuildFlow Local beta readiness after the beta release gate is verified.
- v1.2.0 means stable BuildFlow Local self-hosted release after beta feedback is addressed.
- BuildFlow Managed and Team are later and must not be described as currently implemented.

## Current next phase

The current next phase has two coordinated tracks:

1. **BuildFlow Local beta** — keep improving the self-hosted local-first product and onboarding for free GitHub users.
2. **BuildFlow Managed validation** — continue the Dokploy staging work as the managed relay / SaaS path without changing the free Local default.

These tracks do not conflict. The managed path should be documented as a separate product mode, not a universal replacement for local/self-hosted usage.

Do not describe BuildFlow Managed as the default path for free GitHub users.

Do not describe local cleanup as allowed until a later explicit decision says so.

All new work should be filtered through this question:

> Does this make a first-time self-hosted GitHub user more likely to install, understand, trust, use, star, share, or contribute to BuildFlow?

If not, it should wait until after v1.2.0-beta unless it fixes a serious reliability, safety, or onboarding issue.
