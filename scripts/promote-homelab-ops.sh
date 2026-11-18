#!/bin/sh
set -eu

: "${HOMELAB_OPS_PUSH_TOKEN:?HOMELAB_OPS_PUSH_TOKEN is required}"
: "${CI_COMMIT_TAG:?CI_COMMIT_TAG is required}"
: "${CI_COMMIT_SHA:?CI_COMMIT_SHA is required}"
: "${RELEASE_IMAGE:?RELEASE_IMAGE is required}"
: "${RELEASE_DIGEST:?RELEASE_DIGEST is required}"
: "${LAB_REGISTRY_HOST:?LAB_REGISTRY_HOST is required}"
: "${CI_PROJECT_PATH:?CI_PROJECT_PATH is required}"

app=mezonhook
test "$CI_PROJECT_PATH" = "homelab/$app"
test "$RELEASE_IMAGE" = "$LAB_REGISTRY_HOST/$CI_PROJECT_PATH"
printf '%s\n' "$RELEASE_IMAGE" | grep -Eq '^[a-z0-9.-]+(:[0-9]+)?/homelab/[a-z0-9-]+$'
printf '%s\n' "$CI_COMMIT_TAG" | grep -Eq '^prod-[0-9]+\.[0-9]+\.[0-9]+([-.][0-9A-Za-z.-]+)?$'
printf '%s\n' "$CI_COMMIT_SHA" | grep -Eq '^[0-9a-f]{40}$'
printf '%s\n' "$RELEASE_DIGEST" | grep -Eq '^sha256:[0-9a-f]{64}$'

ops_server=${CI_SERVER_URL:-https://gitlab.dungxbuif.com}
case "$ops_server" in
  https://*) ;;
  *) printf '%s\n' 'The ops GitLab URL must use HTTPS.' >&2; exit 1 ;;
esac
ops_dir=$(mktemp -d)
trap 'rm -rf "$ops_dir"' EXIT

# Git's non-interactive credential helper reads the protected token from the
# environment so the clone URL and git command arguments do not contain it.
export GIT_TERMINAL_PROMPT=0
export GIT_CONFIG_COUNT=2
export GIT_CONFIG_KEY_0=credential.helper GIT_CONFIG_VALUE_0=
export GIT_CONFIG_KEY_1=credential.helper
export GIT_CONFIG_VALUE_1='!f() { if [ "$1" = get ]; then printf "username=oauth2\npassword=%s\n" "$HOMELAB_OPS_PUSH_TOKEN"; fi; }; f'

git clone --no-tags --depth 1 --branch main "${ops_server%/}/homelab/homelab-ops.git" "$ops_dir/ops"
cd "$ops_dir/ops"
git config user.name homelab-release-bot
git config user.email homelab-release-bot@dungxbuif.com

manifest="environments/prod/$app.yaml"
for field in image release_tag source_commit; do
  test "$(grep -c "^$field: " "$manifest")" -eq 1
done

sed -i "s#^image: .*#image: ${RELEASE_IMAGE}@${RELEASE_DIGEST}#" "$manifest"
sed -i "s#^release_tag: .*#release_tag: ${CI_COMMIT_TAG}#" "$manifest"
sed -i "s#^source_commit: .*#source_commit: ${CI_COMMIT_SHA}#" "$manifest"

catalog=automation/stacks/catalog.yml
awk -v app="$app" -v repository="$RELEASE_IMAGE" -v digest="$RELEASE_DIGEST" -v source="$CI_COMMIT_SHA" '
  /^  - id: / { active = ($0 == "  - id: " app) }
  active && /^      repository: / { $0 = "      repository: " repository; repos++ }
  active && /^      digest: / { $0 = "      digest: " digest; digests++ }
  active && /^      source_commit: / { $0 = "      source_commit: " source; sources++ }
  { print }
  END { if (repos != 1 || digests != 1 || sources != 1) exit 1 }
' "$catalog" > "$catalog.tmp"
mv "$catalog.tmp" "$catalog"

set -- "$manifest" "$catalog"
ops_tag="$app-$CI_COMMIT_TAG"
receipt_ref="refs/tags/$ops_tag"
existing=$(git ls-remote --tags --refs origin "$receipt_ref")
if [ -n "$existing" ]; then
  git fetch --no-tags --depth 1 origin "$receipt_ref:$receipt_ref"
  app_catalog_entry() {
    awk -v app="$app" '/^  - id: / { active = ($0 == "  - id: " app) } active && /^      (repository|digest|source_commit): /'
  }
  git show "$receipt_ref:$catalog" > "$ops_dir/receipt-catalog.yml"
  if git diff --quiet "$receipt_ref" -- "$manifest" &&
    [ "$(app_catalog_entry < "$catalog")" = "$(app_catalog_entry < "$ops_dir/receipt-catalog.yml")" ]; then
    printf 'Receipt %s already records this release.\n' "$ops_tag"
    exit 0
  fi
  printf 'Conflicting receipt %s already exists.\n' "$ops_tag" >&2
  exit 1
fi

git add -- "$@"
if ! git diff --cached --quiet; then
  git commit -m "release($app): promote $CI_COMMIT_TAG @ $CI_COMMIT_SHA" >/dev/null
fi

git tag -a "$ops_tag" -m "Promote $app $CI_COMMIT_TAG"
git push --atomic origin HEAD:refs/heads/main "$receipt_ref:$receipt_ref"
printf 'Promoted %s to homelab-ops/main as %s\n' "$CI_COMMIT_TAG" "$ops_tag"
