# BuildFlow v1.2.1-beta

## Summary
BuildFlow v1.2.1-beta expands safe repo-local write behavior for connected sources while keeping repo boundaries and secret protection intact. The main change is that normal documentation and project writes are now treated as first-class, verified operations instead of being blocked by an overly narrow path allowlist.

## New in v1.2.1-beta
- Repo-local `create`, `append`, `overwrite`, `patch`, and artifact writes now share a single path policy.
- Safe docs paths are allowed by default, including `*.md`, `docs/**`, `plans/**`, `notes/**`, `artifacts/**`, and `.buildflow/**`.
- Parent directories can be created automatically for safe relative paths.
- Source listings now expose `writable` and `writePolicy` metadata.
- Write failures now return structured error payloads instead of a vague `Write path blocked` string.
- Preflight / dry-run support is added at the policy layer so callers can check allow/deny behavior before writing.

## Structured write errors
The write layer now distinguishes:
- `WRITE_PATH_BLOCKED`
- `PROTECTED_PATH`
- `PARENT_DIRECTORY_MISSING`
- `CREATE_BLOCKED`
- `OVERWRITE_BLOCKED`
- `APPEND_BLOCKED`
- `PATCH_BLOCKED`
- `PATCH_FIND_NOT_FOUND`
- `PATCH_MULTIPLE_MATCHES`
- `SOURCE_NOT_WRITABLE`
- `SOURCE_NOT_READY`
- `SOURCE_NOT_FOUND`
- `PATH_TRAVERSAL_BLOCKED`
- `ABSOLUTE_PATH_BLOCKED`
- `SECRET_PATH_BLOCKED`
- `BINARY_FILE_BLOCKED`
- `FILE_TOO_LARGE`
- `INVALID_ENCODING`
- `VERIFY_FAILED`

## Safety boundaries preserved
- Path traversal outside the source root is still blocked.
- Absolute paths outside the source root are still blocked.
- Secret and credential files remain blocked.
- `.git`, `node_modules`, build output, and similar runtime directories remain blocked.
- Writes only succeed when the target path is verified inside the connected source root.

## Verified write contract
Successful writes still require `verified: true`.
Responses now include the requested path, normalized path, source-root-relative path, byte counts, and verification metadata after a read-back check.

## Artifact writing
`writeBuildFlowArtifact` now uses the same path safety checks as file changes. Safe documentation folders are supported, and blocked paths return structured policy errors instead of ambiguous failures.

## Patch behavior
- Missing `find` text returns `PATCH_FIND_NOT_FOUND`.
- Multiple matches without `allowMultiple` returns `PATCH_MULTIPLE_MATCHES`.
- Valid patch writes include `matchCount`, `replacementsApplied`, `bytesBefore`, and `bytesAfter`.

## Tests added
- Safe write policy coverage for create, append, overwrite, and patch behavior.
- Blocked-path coverage for traversal, absolute paths, secret files, and protected directories.
- Metadata coverage for source listings and write-policy summaries.
- Artifact and patch verification paths.

## Known limitations
- `package.json` and `docker-compose.yml` remain protected files and may still be blocked depending on the source policy.
- Binary and sensitive runtime files remain out of scope for repo-local writes.

## Usage notes
- Prefer repo-relative paths like `docs/README.md`.
- If a parent directory is missing, use a safe docs path or enable parent directory creation for that write path.
- If a write is blocked, inspect the returned `error.code`, `reason`, and `hint` fields.

