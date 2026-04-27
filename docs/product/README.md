# BuildFlow Docs

BuildFlow v1.0 is the current stable baseline for the Custom GPT Actions surface.

This directory is the canonical documentation path for BuildFlow planning, release context, and future work.

## Canonical docs

- [Product README](../../README.md)
- [Roadmap](./roadmap.md)
- [Implementation plan](./implementation-plan.md)
- [BuildFlow v1.0 release note](./releases/custom-gpt-actions-v1.0.md)
- [Custom GPT instructions](../CUSTOM_GPT_INSTRUCTIONS.md)
- [Custom GPT OpenAPI import guide](../openapi.chatgpt/README.md)

## Additional product docs

- [Launch strategy](./launch-strategy.md)
- [v1.2.0-beta release gate](./beta-release-gate.md)
- [Custom GPT connection architecture](./custom-gpt-connection-architecture.md) — Architecture decision for managed relay
- [Custom GPT endpoint model and self-hosting setup](./custom-gpt-self-hosting-model.md) — User setup guide
- [Dashboard design brief](./dashboard-design-brief.md)

## Source of truth hierarchy

Use this order when resolving conflicts or deciding which document is canonical:

1. Release notes define stable released baselines.
2. [`docs/product/roadmap.md`](./roadmap.md) defines current planning direction.
3. [`docs/product/implementation-plan.md`](./implementation-plan.md) defines execution method.
4. Root [`README.md`](../../README.md) defines public product positioning.
5. Older phase, MVP, transition, and board docs are historical/reference unless explicitly linked as canonical.

## Historical/reference docs

The repository contains older phase, transition, and implementation documents in the repo root and related folders.

Treat those documents as historical/reference material unless they are explicitly linked here or in a canonical release note.

Examples of reference material include older phase docs, transition notes, and implementation briefs that predate the current stable v1.0 baseline.

## How to use this index

- Read the v1.0 release note first when you need the canonical stable baseline.
- Use the roadmap to understand the next documented phase.
- Use the implementation plan for file-scoped task structure and lower-model execution prompts.
- Keep documentation claims conservative unless they are backed by linked canonical sources.
