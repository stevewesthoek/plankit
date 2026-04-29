# BuildFlow Docs

BuildFlow is a local-first planning and handoff layer for AI-native builders. It connects a Custom GPT to local repos and notes so it can inspect, read, plan, and safely write when policy allows.

## Canonical product references

- [`README.md`](../../README.md)
- [`docs/product/releases/buildflow-v1.2.13-beta.md`](./releases/buildflow-v1.2.13-beta.md)
- [`docs/product/releases/buildflow-v1.2.12-beta.md`](./releases/buildflow-v1.2.12-beta.md)
- [`docs/product/releases/custom-gpt-actions-v1.0.md`](./releases/custom-gpt-actions-v1.0.md)
- [`docs/CUSTOM_GPT_INSTRUCTIONS.md`](../CUSTOM_GPT_INSTRUCTIONS.md)
- [`docs/openapi.chatgpt/README.md`](../openapi.chatgpt/README.md)

## Current beta scope

BuildFlow v1.2.13-beta adds user-facing activity feedback on top of the repo-app-maintainer capability.

That beta now covers:

- inspect and read connected sources
- plan and generate execution packets
- verified writes for allowed repo-local files
- guarded delete, move, rename, mkdir, and rmdir operations
- confirmation-gated cleanup for protected and maintenance-sensitive paths
- consistent dotfile and env-template handling
- `dryRun` / `preflight` checks before writes
- structured policy errors for blocked or confirmation-required paths
- activity metadata that makes action progress and outcomes easier to follow
- source metadata that exposes `writable`, `writeProfile`, and `writePolicy`

## Safety model

The beta still blocks secrets, traversal, and generated/vendor output, and it keeps confirmation gates on sensitive maintenance paths such as lockfiles, GitHub workflows, Prisma migrations, and dependency changes.

## Release history

- [`v1.0`](./releases/custom-gpt-actions-v1.0.md) is the stable Custom GPT Actions baseline.
- [`v1.2.13-beta`](./releases/buildflow-v1.2.13-beta.md) is the current beta maintainer-release.

## Planned visibility work

- [`Dashboard activity UI / live BuildFlow activity feed`](./roadmap.md#dashboard-activity-ui--live-buildflow-activity-feed) is a future dashboard-side enhancement, not implemented yet.
