# Repository settings

How this repo is protected, and why. Everything here is kept as files so it can be reviewed like code:

| File | What it sets |
|---|---|
| `.github/rulesets/main.json` | Rules for `main` |
| `.github/rulesets/release-tags.json` | Who may create release tags |
| `.github/CODEOWNERS` | Who must review which paths |
| `.github/workflows/ci.yml` | The required checks |
| `scripts/apply-repo-settings.sh` | Applies all of the above plus general repo settings |

Run `./scripts/apply-repo-settings.sh` to see what it would change, then `--apply` to change it. It needs an admin
token in the GitHub CLI.

## `main`

- No direct pushes, no force pushes, no deletion. Every change arrives as a pull request.
- Squash merge only, so `main` has one commit per pull request and a linear history.
- One approving review from a code owner. A new push after approval dismisses it, and the last push must be
  approved by someone other than its author.
- All review threads resolved.
- Required checks: `spec and fixtures`, `workflow lint`, `docs style`, `sign-off`.
- Repository admins can bypass the whole ruleset, but only through a pull request (`bypass_mode: pull_request`).
  This exists so a single maintainer can merge their own work. It skips the review and the required checks for
  that pull request, so only use it with green checks. It does not allow pushing to `main` directly.

## Release tags

Tags matching `v*`, `<package>@<version>` (for example `ts@2.0.0`) or `upm/v*` (Unity install tags) can only be created, moved or deleted by
admins. Publishing workflows start from these tags and run in the `release` environment, which waits for a
maintainer to approve each run.

## Fork safety

Pull requests from forks run CI. To make that safe:

- workflows trigger on `pull_request`, never `pull_request_target` or `workflow_run`;
- no pull request workflow references `secrets.`;
- the default `GITHUB_TOKEN` is read-only, and checkouts do not keep credentials;
- every third-party action is pinned to a full commit SHA;
- workflows from first-time contributors wait for a maintainer to approve them.

`scripts/check-workflow-safety.mjs` checks these in CI. It is a lint, not a lock: a pull request can change the
script too, which is why `.github/` and `scripts/` need a code owner's review.

## Security features

Secret scanning with push protection, Dependabot alerts, and private vulnerability reporting are turned on by the
settings script.

## Things to check by hand after applying

- Settings > Actions > General: "Fork pull request workflows from outside collaborators" shows "Require approval
  for first-time contributors".
- Settings > Rules > Rulesets: both rulesets are Active.
- Settings > Environments > release: you are listed as a required reviewer.
