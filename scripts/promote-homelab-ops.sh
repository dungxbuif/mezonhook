#!/bin/sh
set -eu

: "${HOMELAB_OPS_PUSH_TOKEN:?HOMELAB_OPS_PUSH_TOKEN is required}"
: "${CI_COMMIT_TAG:?CI_COMMIT_TAG is required}"
: "${CI_COMMIT_SHA:?CI_COMMIT_SHA is required}"
: "${RELEASE_IMAGE:?RELEASE_IMAGE is required}"
: "${RELEASE_DIGEST:?RELEASE_DIGEST is required}"

ops_host="${CI_SERVER_HOST:-gitlab.dungxbuif.com}"
ops_project="${HOMELAB_OPS_PROJECT:-dungxbuif/homelab-ops}"
ops_dir="$(mktemp -d)"
trap 'rm -rf "$ops_dir"' EXIT INT TERM

ops_url="https://gitlab-ci-token:${HOMELAB_OPS_PUSH_TOKEN}@${ops_host}/${ops_project}.git"
git clone --depth 1 --branch main "$ops_url" "$ops_dir/ops" >/dev/null
cd "$ops_dir/ops"
git config user.name "homelab-release-bot"
git config user.email "homelab-release-bot@dungxbuif.com"

manifest="environments/prod/mezonhook.yaml"
catalog="automation/stacks/catalog.yml"
test -f "$manifest"
test -f "$catalog"
printf '%s\n' "$RELEASE_DIGEST" | grep -Eq '^sha256:[0-9a-fA-F]{64}$'

sed -i "s#^image: .*#image: ${RELEASE_IMAGE}@${RELEASE_DIGEST}#" "$manifest"
sed -i "s#^release_tag: .*#release_tag: ${CI_COMMIT_TAG}#" "$manifest"
sed -i "s#^source_commit: .*#source_commit: ${CI_COMMIT_SHA}#" "$manifest"

awk -v digest="$RELEASE_DIGEST" -v source="$CI_COMMIT_SHA" '
  /^  - id: mezonhook$/ { in_app = 1 }
  in_app && /^  - id: / && !/^  - id: mezonhook$/ { in_app = 0 }
  in_app && /^      digest: / { $0 = "      digest: " digest }
  in_app && /^      source_commit: / { $0 = "      source_commit: " source }
  { print }
' "$catalog" > "$catalog.tmp"
mv "$catalog.tmp" "$catalog"

git add "$manifest" "$catalog"
git diff --cached --quiet && exit 0
git commit -m "release(mezonhook): promote ${CI_COMMIT_TAG} @ ${CI_COMMIT_SHA}" >/dev/null
git push origin HEAD:main >/dev/null

ops_tag="mezonhook-${CI_COMMIT_TAG}"
if git ls-remote --exit-code --tags origin "refs/tags/${ops_tag}" >/dev/null 2>&1; then
  echo "refusing to replace existing homelab-ops tag ${ops_tag}" >&2
  exit 1
fi
git tag -a "$ops_tag" -m "Promote mezonhook ${CI_COMMIT_TAG}"
git push origin "$ops_tag" >/dev/null
printf 'Promoted %s to homelab-ops/main as %s\n' "$CI_COMMIT_TAG" "$ops_tag"
