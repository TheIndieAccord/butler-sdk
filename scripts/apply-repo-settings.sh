#!/usr/bin/env bash
# Applies the repository settings described in docs/maintainers/repo-settings.md
# to TheIndieAccord/butler-sdk. Run it yourself, as a repository admin:
#
#   ./scripts/apply-repo-settings.sh            # show what would change
#   ./scripts/apply-repo-settings.sh --apply    # change it
#
# Needs the GitHub CLI (`gh auth status` should show admin on the repo).
# Safe to run more than once: rulesets are updated in place by name.
set -euo pipefail

REPO="TheIndieAccord/butler-sdk"
APPLY=false
[[ "${1:-}" == "--apply" ]] && APPLY=true

# Runs a command, or in a dry run prints it. If the command reads a JSON body
# from stdin (`--input -`), the body is printed too, so the preview shows
# exactly what would be sent.
run() {
  if $APPLY; then
    "$@"
  else
    printf 'would run:'; printf ' %q' "$@"; printf '\n'
    if [[ " $* " == *" --input - "* ]]; then sed 's/^/    /'; fi
  fi
}

cd "$(dirname "$0")/.."

# 1. General settings: squash merges only, delete branches after merge,
#    no wiki (docs live in the repo), private vulnerability reporting on.
run gh api -X PATCH "repos/$REPO" \
  -F allow_squash_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false \
  -F delete_branch_on_merge=true -F has_wiki=false -F allow_auto_merge=false \
  -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY
run gh api -X PUT "repos/$REPO/private-vulnerability-reporting"

# 2. Security features for a public repo.
run gh api -X PATCH "repos/$REPO" --input - <<'JSON'
{ "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" } } }
JSON
run gh api -X PUT "repos/$REPO/vulnerability-alerts"

# 3. Actions: read-only default token, and workflows from first-time
#    contributors wait for a maintainer to approve them.
run gh api -X PUT "repos/$REPO/actions/permissions/workflow" \
  -f default_workflow_permissions=read -F can_approve_pull_request_reviews=false
run gh api -X PUT "repos/$REPO/actions/permissions/fork-pr-contributor-approval" \
  -f approval_policy=first_time_contributors

# 4. Rulesets from .github/rulesets/*.json, created or updated by name.
# Only rulesets owned by this repository, not ones inherited from the org.
existing="$(gh api --paginate "repos/$REPO/rulesets?includes_parents=false" --jq '.[] | "\(.id)\t\(.name)"')"
for file in .github/rulesets/*.json; do
  name="$(node -p "require('./$file').name")"
  id="$(printf '%s\n' "$existing" | awk -F'\t' -v n="$name" '$2 == n { print $1 }')"
  if [[ -n "$id" ]]; then
    run gh api -X PUT "repos/$REPO/rulesets/$id" --input "$file"
  else
    run gh api -X POST "repos/$REPO/rulesets" --input "$file"
  fi
done

# 5. A protected environment for publishing. Release jobs name it, and each
#    run waits for a maintainer to approve it.
me="$(gh api user --jq .id)"
run gh api -X PUT "repos/$REPO/environments/release" --input - <<JSON
{ "wait_timer": 0, "prevent_self_review": false,
  "reviewers": [ { "type": "User", "id": $me } ],
  "deployment_branch_policy": { "protected_branches": false, "custom_branch_policies": true } }
JSON

# Only release tags may deploy to the release environment.
for pattern in 'v*' '*@*'; do
  run gh api -X POST "repos/$REPO/environments/release/deployment-branch-policies" \
    -f name="$pattern" -f type=tag
done

$APPLY || echo "Dry run only. Re-run with --apply to make these changes."
