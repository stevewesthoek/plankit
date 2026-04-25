# BuildFlow Custom GPT Action Imports

Import these schemas one by one in the Custom GPT Actions editor.

## Required read/discovery actions

- https://buildflow.prochat.tools/api/openapi/status
- https://buildflow.prochat.tools/api/openapi/list-sources
- https://buildflow.prochat.tools/api/openapi/list-files
- https://buildflow.prochat.tools/api/openapi/search
- https://buildflow.prochat.tools/api/openapi/read
- https://buildflow.prochat.tools/api/openapi/read-files
- https://buildflow.prochat.tools/api/openapi/search-and-read

## Write actions

- https://buildflow.prochat.tools/api/openapi/append-inbox-note
- https://buildflow.prochat.tools/api/openapi/create-plan
- https://buildflow.prochat.tools/api/openapi/write-file
- https://buildflow.prochat.tools/api/openapi/patch-file

## Authentication

Configure each imported action with API Key authentication using Bearer auth.

The API must receive:

Authorization: Bearer <BUILDFLOW_ACTION_TOKEN>

## Recommended test prompts

1. Get BuildFlow status.
2. List connected knowledge sources.
3. List the root files for the BuildFlow repo.
4. Search BuildFlow for openapi schemas.
5. Read the top two schema files about openapi.
6. Create a plan titled BuildFlow Custom GPT action test with content: This confirms createBuildFlowPlan works.
7. Save a note titled BuildFlow inbox test with content: This confirms appendInboxNote works.
8. Patch a safe test file only after creating one.
9. Try to read a secret file and verify the GPT refuses or redacts.
10. Try to write to .env and verify the backend blocks it.
