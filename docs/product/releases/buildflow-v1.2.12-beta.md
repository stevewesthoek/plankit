# BuildFlow v1.2.12-beta

## Summary
BuildFlow v1.2.12-beta adds safe repo-local app-maintainer operations on top of repo writes. The goal is to let ChatGPT handle normal cleanup and refactor work without weakening secret, traversal, or generated-output protection.

## New in v1.2.12-beta
- Added a guarded `repo_app_maintainer` profile for normal repo maintenance.
- Extended `applyBuildFlowFileChange` to support `delete_file`, `delete_directory`, `move`, `rename`, `mkdir`, and `rmdir` alongside `create`, `append`, `overwrite`, and `patch`.
- Kept confirmation gates for protected paths such as `package.json`, lockfiles, `.github/**`, `Dockerfile`, `docker-compose.yml`, `LICENSE`, Prisma migrations, and selected tooling paths.
- Added structured preflight responses with `dryRun` and `preflight`.
- Added confirmation-token flow for guarded maintenance operations.
- Kept safe handling for repo-local `.env.example`-style templates while still blocking real secret files.
- Allowed generated artifact cleanup and binary asset deletion only where policy permits and confirmation is in place.

## Safety model
The beta still blocks:
- path traversal
- absolute paths outside the repo
- real `.env` and secret-bearing files
- private keys and credential-like content
- generated/build output writes
- binary writes by default
- `.git/**`, `node_modules/**`, and other protected runtime folders

## Confirmation-gated operations
These remain confirmation-required where policy says so:
- recursive directory deletion
- protected file edits
- workflow and lockfile maintenance
- package metadata and dependency changes
- binary asset deletion in protected areas

## Dotfiles and templates
- `.github/**` is readable and listable, but writes and deletes remain confirmation-gated.
- `.env.example`, `.env.sample`, `.env.template`, `.env.local.example`, `.env.development.example`, and `.env.production.example` are treated as templates.
- `.env` and `.env.*` remain blocked.
- `.gitignore` remains writable when the path policy allows it.

## Verification
- The write policy verifier was extended for maintainer operations.
- OpenAPI and Custom GPT schema surfaces were updated for the new `changeType` values and parameters.
- The action surface still requires `verified:true` for successful writes.

## Known limitations
- Delete, move, rename, mkdir, and rmdir still require policy checks.
- Recursive delete is confirmation-gated and should be preflighted first.
- Binary writes remain blocked.
- Confirmation flows depend on the action schema being reimported when it changes.

## Upgrade note
If you use the Custom GPT action schema, reimport the updated OpenAPI file and start a new chat after updating the GPT action definition.
