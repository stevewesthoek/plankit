# BuildFlow Custom GPT Action Imports

Import only this schema into the Custom GPT Actions editor:

- https://buildflow.prochat.tools/api/openapi

This combined schema exposes the full BuildFlow agent through six high-level operations:

- `getBuildFlowStatus`
- `setBuildFlowContext`
- `inspectBuildFlowContext`
- `readBuildFlowContext`
- `writeBuildFlowArtifact`
- `applyBuildFlowFileChange`

## Notes

- The backend still has lower-level `/api/actions/*` endpoints for internal use and debugging.
- Do not import the per-action URLs one by one into a new Custom GPT.

## Authentication

Configure the Custom GPT action with API Key authentication using Bearer auth.

The API must receive:

`Authorization: Bearer <BUILDFLOW_ACTION_TOKEN>`

## Recommended tests

1. Get BuildFlow status.
2. List connected knowledge sources.
3. Inspect active BuildFlow sources.
4. Set active sources to one repo.
5. Set active sources to two repos.
6. List root files for the active repo.
7. Search active sources for OpenAPI schemas.
8. Read two schema files by exact path.
9. Create an implementation plan artifact.
10. Apply a safe file change.
11. Try to write to `.env` and verify the backend blocks it.
12. Try to write while multiple sources are active without `sourceId` and verify the backend asks for `sourceId` or returns a clear error.

## Local workflow

- Restart local services and rebuild: `pnpm restart:local`
- Run the public Custom GPT smoke verifier: `pnpm verify:gpt-actions`
- The verifier expects `BUILDFLOW_ACTION_TOKEN` in the environment.
- If you run the smoke verifier locally, it creates temporary task artifacts under `docs/buildflow/tasks/`; delete them after the run if you do not want to keep the smoke-test files.
