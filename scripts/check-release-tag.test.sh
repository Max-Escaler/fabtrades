#!/usr/bin/env bash
#
# Tests for check-release-tag.sh.
#
# Worth testing precisely because it runs nowhere else: a bug in it surfaces during a
# release, which is the worst moment to discover that the guard against shipping the
# wrong version number was itself broken.
#
# Usage: scripts/check-release-tag.test.sh

set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
check="$here/check-release-tag.sh"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

failures=0

# Asserts the script exits with $1 for tag $2 against pubspec $3.
expect() {
  local want="$1" tag="$2" pubspec="$3" why="$4"
  local output
  output="$(bash "$check" "$tag" "$pubspec" 2>&1)"
  local got=$?

  if [ "$got" != "$want" ]; then
    echo "FAIL: $why"
    echo "      tag=$tag pubspec=$pubspec"
    echo "      expected exit $want, got $got"
    echo "$output" | sed 's/^/      | /'
    failures=$((failures + 1))
  else
    echo "ok: $why"
  fi
}

pubspec_with() {
  local version="$1" path="$work/$2"
  printf 'name: fabtrades\ndescription: A test fixture.\nversion: %s\n\nenvironment:\n  sdk: ^3.0.0\n' \
    "$version" > "$path"
  echo "$path"
}

# `1.2.0+7`: the build number is the store's, not the release's, so a tag naming
# 1.2.0 has to match this.
matching="$(pubspec_with '1.2.0+7' matching.yaml)"
prerelease="$(pubspec_with '2.0.0-beta.1+1' prerelease.yaml)"
no_version="$work/no_version.yaml"
printf 'name: fabtrades\n' > "$no_version"

expect 0 'mobile-v1.2.0' "$matching" 'a tag naming the pubspec version passes'
expect 0 'refs/tags/mobile-v1.2.0' "$matching" 'a fully qualified ref is accepted'

expect 1 'mobile-v1.3.0' "$matching" 'a tag ahead of pubspec fails'
expect 1 'mobile-v1.1.9' "$matching" 'a tag behind pubspec fails'
expect 1 'mobile-v1.2' "$matching" 'a two-part version is rejected'
expect 1 'mobile-v1.2.0+7' "$matching" 'a build number in the tag is rejected'
expect 1 'v1.2.0' "$matching" 'a tag without the mobile- prefix is rejected'
expect 1 'mobile-v1.2.0-rc1' "$matching" 'a pre-release tag is rejected'
expect 1 'mobile-vnext' "$matching" 'a non-numeric tag is rejected'

# A pubspec pre-release version cannot be named by a tag this script accepts, so it
# has to fail rather than half-match on the numbers.
expect 1 'mobile-v2.0.0' "$prerelease" 'a pre-release pubspec version fails to match'

expect 2 '' "$matching" 'no tag is a usage error, not a mismatch'
expect 2 'mobile-v1.2.0' "$work/absent.yaml" 'a missing pubspec is a usage error'
expect 2 'mobile-v1.2.0' "$no_version" 'a pubspec with no version is a usage error'

# The real file, so a pubspec reformat that defeats the version parse is caught here
# rather than during a release.
real="$here/../apps/mobile/pubspec.yaml"
real_version="$(sed -n 's/^version:[[:space:]]*\([^[:space:]+]*\).*/\1/p' "$real" | head -n 1)"
expect 0 "mobile-v$real_version" "$real" "apps/mobile/pubspec.yaml parses (found $real_version)"

if [ "$failures" -gt 0 ]; then
  echo
  echo "$failures check(s) failed"
  exit 1
fi

echo
echo 'All release tag checks passed'
