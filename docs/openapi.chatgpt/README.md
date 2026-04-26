# BuildFlow Custom GPT Action Imports

Import the canonical schema from:

- `docs/openapi.chatgpt.json`
- or `https://buildflow.prochat.tools/api/openapi`

The Custom GPT surface is exactly these 8 operations:

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

## Verification

- Run `pnpm verify:gpt-contract` after regenerating the schema file.
- If the root schema changes, re-import the Custom GPT actions.
