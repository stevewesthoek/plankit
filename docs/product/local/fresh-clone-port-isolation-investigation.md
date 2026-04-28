# BuildFlow Local Fresh Clone Port Isolation Investigation

## Date
2026-04-28

## Question
Can BuildFlow Local public beta be verified in a throwaway clone without touching the current runtime on port 3054?

## Repo State
- Repo root: `/Users/Office/Repos/stevewesthoek/buildflow`
- Current working tree was clean except for the docs investigation changes made in this pass.

## Port 3054 Status
- Port `3054` was already occupied by an existing `node` process.
- The current Local runtime was left untouched.

## Files Inspected
- `package.json`
- `apps/web/package.json`
- `scripts/buildflow-local-stack.sh`
- `scripts/restart-buildflow-local.sh`
- `scripts/verify-dashboard.mjs`
- `scripts/verify-custom-gpt-actions.mjs`
- `README.md`
- `docs/product/local/public-beta-return-plan.md`
- `docs/product/beta-release-gate.md`
- `docs/product/custom-gpt-self-hosting-model.md`
- `docs/product/custom-gpt-connection-architecture.md`
- `docs/product/roadmap.md`

## Proven Facts
- The Local stack helper scripts are hard-coded around ports `3052`, `3053`, and `3054`.
- `apps/web/package.json` hard-codes `next dev -p 3054` and `next start -p 3054`.
- The README and Local beta docs consistently point users to `http://127.0.0.1:3054/dashboard`.
- No documented alternate-port command for the free Local beta path was found.

## Conclusion
- Alternate-port Local verification is not currently supported by documented repo-local commands.
- Fresh-clone runtime verification remains blocked while port `3054` is occupied, unless an alternate-port mode is added and documented for BuildFlow Local.

## Docs Update Made
- Added a brief note to the beta release gate explaining that fresh-clone runtime verification is blocked while the current Local runtime occupies port `3054`, unless a supported alternate-port mode is documented.

## Secret Handling Statement
- No secrets, bearer tokens, raw env values, or full config files were printed.

## Next Step
- If fresh-clone runtime verification is required without disturbing the current runtime, the repo needs a documented alternate-port path for BuildFlow Local first.
