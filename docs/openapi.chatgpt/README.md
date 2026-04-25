# BuildFlow Custom GPT Action Imports

BuildFlow is repo-agnostic. Import these schemas one by one into the Custom GPT Actions editor.

## Connectivity and source context

- https://buildflow.prochat.tools/api/openapi/status
- https://buildflow.prochat.tools/api/openapi/list-sources
- https://buildflow.prochat.tools/api/openapi/get-active-sources
- https://buildflow.prochat.tools/api/openapi/set-active-sources

## Read and discovery

- https://buildflow.prochat.tools/api/openapi/list-files
- https://buildflow.prochat.tools/api/openapi/search
- https://buildflow.prochat.tools/api/openapi/read
- https://buildflow.prochat.tools/api/openapi/read-files
- https://buildflow.prochat.tools/api/openapi/search-and-read

## Write and planning

- https://buildflow.prochat.tools/api/openapi/create-artifact
- https://buildflow.prochat.tools/api/openapi/append-file
- https://buildflow.prochat.tools/api/openapi/write-file
- https://buildflow.prochat.tools/api/openapi/patch-file

## Authentication

Configure every imported action with API Key authentication using Bearer auth.

The API must receive:

Authorization: Bearer <BUILDFLOW_ACTION_TOKEN>

## Recommended tests

1. Get BuildFlow status.
2. List connected knowledge sources.
3. Show active BuildFlow sources.
4. Set active sources to one repo.
5. Set active sources to two repos.
6. List root files for the active repo.
7. Search active sources for OpenAPI schemas.
8. Batch read two schema files.
9. Create an implementation plan artifact.
10. Append a section to a safe markdown file.
11. Patch a safe test file.
12. Try to write to .env and verify the backend blocks it.
13. Try to write while multiple sources are active without sourceId and verify the backend asks for sourceId or returns a clear error.
