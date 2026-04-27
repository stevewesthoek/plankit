# BuildFlow v1.2.0-beta Release Gate

## Status

Working checklist for the public Free GitHub self-hosted beta.

This document does not claim that v1.2.0-beta is complete. It defines the gate that must be satisfied before BuildFlow is marketed as a public beta.

## Release identity

- **Version:** v1.2.0-beta
- **Audience:** Free GitHub self-hosted users
- **Primary user:** solo builders, indie hackers, AI-native developers, technical early adopters
- **Launch promise:** Think in ChatGPT. Build anywhere.
- **Product type:** local-first open-source planning and handoff workflow
- **Not included:** hosted SaaS account, billing, team workspaces, cloud sync, managed execution, direct hosted executor sessions

## Beta readiness definition

BuildFlow v1.2.0-beta is ready when a first-time technical user can complete the local planning-to-handoff workflow from the repo documentation without private help.

The user should be able to:

1. clone the repo
2. install dependencies
3. start the local stack
4. open the dashboard
5. connect a local source
6. see source and agent readiness
7. configure the accompanying Custom GPT
8. search/read local context through ChatGPT
9. create or inspect a plan/execution packet
10. copy a Codex or Claude Code handoff prompt
11. recover from common failures using docs
12. know how to ask questions, open issues, join discussions, star, and share the project

## Critical architecture question: Custom GPT endpoint model

✅ **RESOLVED** — See `docs/product/custom-gpt-connection-architecture.md` for the architecture decision.

**Summary:**

- **Preferred v1.2.0-beta path:** BuildFlow-managed relay at `https://buildflow.prochat.tools` handles Custom GPT → local agent routing
  - User: Clone repo, generate token, import Custom GPT schema, paste token
  - User data: Stays local; relay is only a passthrough
  - No external tunnel, no Cloudflare/ngrok/Tailscale required for default path
  
- **Fallback path:** User-managed HTTPS tunnel (Cloudflare/ngrok/Tailscale) for power users
  - Still supported and documented
  - Optional, not required

- **Relay infrastructure:** Already exists in `packages/bridge` (production-ready)
  - Device registration, WebSocket routing, action proxy, request audit
  - Just needs to be deployed to public instance + documented

- **v1.2.0-beta blocker status:** NOT a blocker
  - Managed relay enhances UX but is not required
  - Can launch with user-managed tunnels and add relay post-release if needed

Beta can launch with preferred managed relay path or fallback to user-managed tunnels.

## Gate 1: Product workflow

- [ ] Dashboard opens at `/dashboard` after local stack start.
- [ ] Dashboard shows agent health.
- [ ] Dashboard shows source count and readiness.
- [ ] User can add a local source.
- [ ] User can enable/disable a source.
- [ ] User can activate/deactivate a source for context.
- [ ] User can reindex a source.
- [ ] User can remove a source.
- [ ] Active context mode is visible and controllable.
- [ ] Write mode is visible and controllable.
- [ ] Handoff panel provides Codex prompt copy.
- [ ] Handoff panel provides Claude Code prompt copy.
- [ ] Plan/execution packet placeholder or real state is understandable.
- [ ] Empty state guides the user to the next action.
- [ ] Error state explains recovery steps.

## Gate 2: Dashboard quality

- [ ] Fixed-viewport shell is preserved.
- [ ] No browser/page-level scroll is used as the main navigation mechanism.
- [ ] No essential information is clipped behind the fold at 1366×768.
- [ ] No essential information is clipped behind the fold at 1440×900.
- [ ] Internal scroll is used only when unavoidable: source list, settings content, prompt text, sidebars.
- [ ] Light/dark mode toggle works.
- [ ] Light/dark preference persists after refresh.
- [ ] No duplicate metric surfaces confuse the user.
- [ ] Left navigation is functional and carries the dashboard sections.
- [ ] Right panel is useful or intentionally minimal.
- [ ] Dashboard feels like a control center, not a document.

## Gate 3: Self-hosting docs

Required docs before public beta:

- [ ] Root README first screen explains what BuildFlow is and who it is for.
- [ ] Root README has one recommended quickstart path.
- [ ] Self-hosting guide exists and is linked from README.
- [ ] Local stack services are explained: agent 3052, relay 3053, web 3054.
- [ ] Required prerequisites are listed: Node/pnpm and any relay/Docker/OrbStack requirement if still needed.
- [ ] Environment variables are documented, including token setup.
- [ ] Start, stop, restart, rebuild-web, and verify commands are documented.
- [ ] Dashboard usage guide exists.
- [ ] Maintenance/troubleshooting guide exists.
- [ ] Privacy/security explanation is clear: what stays local and what is sent to ChatGPT.

## Gate 4: Custom GPT setup

- [ ] Accompanying Custom GPT is named and linked when available.
- [ ] OpenAPI import path is documented.
- [ ] Bearer token setup is documented.
- [ ] Expected 401 without auth is documented.
- [ ] Public `buildflow.prochat.tools` purpose is documented.
- [ ] Self-hosted user's endpoint/tunnel requirement is documented.
- [ ] At least one end-to-end Custom GPT setup test is performed from docs.
- [ ] Example prompts are included.

## Gate 5: Packaging and first-run simplicity

- [ ] One command or very small command sequence starts the local stack.
- [ ] Repo root is not confusing to a first-time user.
- [ ] Package scripts are named clearly.
- [ ] Any legacy/orchestrator scripts are documented or de-emphasized to avoid confusion.
- [ ] Failure messages guide the user to `pnpm local:status` or `pnpm local:verify`.
- [ ] Fresh clone test is performed in a clean folder.

## Gate 6: GitHub and community readiness

- [ ] GitHub repo description is clear and star-worthy.
- [ ] README asks for stars and feedback without sounding desperate.
- [ ] Issues are enabled.
- [ ] Discussions are enabled or a clear alternative is provided.
- [ ] Bug report issue template exists.
- [ ] Setup/friction issue template exists.
- [ ] Feature idea issue template exists.
- [ ] Question/discussion template exists if using GitHub Discussions.
- [ ] CONTRIBUTING.md exists or README has a contribution section.
- [ ] Commit messages are clear enough for public build-in-public history.

## Gate 7: Marketing assets

- [ ] Screenshot of dashboard exists or is planned.
- [ ] GIF/video demo path exists or is planned.
- [ ] Short public description exists.
- [ ] X launch post draft exists.
- [ ] Facebook launch post draft exists.
- [ ] Demo workflow can be performed live without private setup.

## Gate 8: Verification commands

Run before marking v1.2.0-beta ready:

```bash
pnpm --dir apps/web type-check
pnpm local:rebuild-web
pnpm local:verify
curl -sS http://127.0.0.1:3052/health | head -20
curl -sS http://127.0.0.1:3053/health | head -20
curl -sS http://127.0.0.1:3054/api/openapi | head -20
curl -sS http://127.0.0.1:3054/api/actions/status | head -20
curl -i -sS https://buildflow.prochat.tools/api/openapi | head -20
curl -i -sS https://buildflow.prochat.tools/api/actions/status | head -20
```

Expected baseline:

- local agent health returns ok
- local relay health returns ok if relay is required in the selected mode
- local web OpenAPI returns valid JSON
- unauthenticated action status returns 401
- public OpenAPI returns 200 if public endpoint is part of the beta setup
- public action status returns 401 unauthenticated

## Gate 9: Release note

Before tagging or announcing v1.2.0-beta:

- [ ] Create `docs/product/releases/buildflow-v1.2.0-beta.md`.
- [ ] State what is complete and what remains beta.
- [ ] State Free GitHub scope.
- [ ] State Pro SaaS and Team are not included.
- [ ] State the Custom GPT endpoint model honestly.
- [ ] Include verification evidence.
- [ ] Include known limitations.

## Current priority order

1. Resolve Custom GPT endpoint model for self-hosted users.
2. Finish self-hosting and quickstart docs.
3. Make dashboard launch-quality enough for screenshots and demos.
4. Add GitHub community templates and contribution guidance.
5. Run fresh clone test.
6. Draft v1.2.0-beta release note and launch posts.
