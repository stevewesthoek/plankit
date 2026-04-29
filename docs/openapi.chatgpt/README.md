# BuildFlow Custom GPT Action Imports

Import the canonical schema from:

- `docs/openapi.chatgpt.json`
- or `https://buildflow.prochat.tools/api/openapi`

For the stable product baseline, see [`docs/product/README.md`](../product/README.md) and the v1.0 release note at [`docs/product/releases/custom-gpt-actions-v1.0.md`](../product/releases/custom-gpt-actions-v1.0.md).

The Custom GPT surface is exactly these 8 core operations, with `applyBuildFlowFileChange` now carrying maintainer sub-operations through `changeType`:

- `getBuildFlowStatus`
- `listBuildFlowSources`
- `getBuildFlowActiveContext`
- `setBuildFlowActiveContext`
- `inspectBuildFlowContext`
- `readBuildFlowContext`
- `writeBuildFlowArtifact`
- `applyBuildFlowFileChange`

## Notes

- Do not import legacy context actions such as `setBuildFlowContext`.
- Keep the imported schema aligned with `docs/CUSTOM_GPT_INSTRUCTIONS.md`.
- Use Bearer API key auth with `Authorization: Bearer <BUILDFLOW_ACTION_TOKEN>`.
- Older per-action OpenAPI fragments are historical/reference material unless a release note says otherwise.

## Verification

- Run `pnpm verify:gpt-contract` after regenerating the schema file.
- If the root schema changes, re-import the Custom GPT actions in the OpenAI Custom GPT editor.
- Start a new chat after reimporting so the GPT uses the updated action schema.
- Restarting BuildFlow Local alone is not enough to update a previously imported GPT action definition.
- Activity metadata changes also require a schema reimport if the OpenAPI contract changes.
