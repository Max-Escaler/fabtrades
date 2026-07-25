#!/usr/bin/env bash
#
# Asserts that a `mobile-v*` tag names the version in pubspec.yaml.
#
# Two stores read the version from two places — Play from the app bundle, App Store
# Connect from the IPA — and both take whatever they are handed. Nothing downstream
# will notice that `mobile-v1.2.0` shipped a binary that says 1.1.0, so this is the
# only place it can be caught. It runs in both release pipelines, from the same file,
# because a check that exists in only one of them is exactly the case that goes wrong.
#
# pubspec.yaml stays the source of truth for the version name; the tag has to agree
# with it. Build numbers are deliberately absent from the tag: each store
# auto-increments its own, so they are not a property of the release.
#
# Usage: scripts/check-release-tag.sh <tag> [pubspec path]

set -euo pipefail

tag="${1:-}"
pubspec="${2:-apps/mobile/pubspec.yaml}"

if [ -z "$tag" ]; then
  echo "check-release-tag: no tag given" >&2
  exit 2
fi

if [ ! -f "$pubspec" ]; then
  echo "check-release-tag: no pubspec at $pubspec" >&2
  exit 2
fi

# Refs arrive fully qualified from some triggers and bare from others.
tag="${tag#refs/tags/}"

if [[ ! "$tag" =~ ^mobile-v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  cat >&2 <<EOF
Tag "$tag" is not a mobile release tag.

Expected mobile-vMAJOR.MINOR.PATCH, for example mobile-v1.2.0. No build number:
each store assigns its own.
EOF
  exit 1
fi

tag_version="${tag#mobile-v}"

# `version: 1.0.1+4` — the build number after + belongs to the store, not the tag.
pubspec_version="$(sed -n 's/^version:[[:space:]]*\([^[:space:]+]*\).*/\1/p' "$pubspec" | head -n 1)"

if [ -z "$pubspec_version" ]; then
  echo "check-release-tag: could not read version from $pubspec" >&2
  exit 2
fi

if [ "$tag_version" != "$pubspec_version" ]; then
  cat >&2 <<EOF
Tag and pubspec disagree about this release.

  tag:     $tag_version  (from $tag)
  pubspec: $pubspec_version  (from $pubspec)

Both stores would accept this and show $pubspec_version to customers. Update
$pubspec and move the tag, rather than shipping a version nobody can reproduce.
EOF
  exit 1
fi

echo "Release $tag matches $pubspec ($pubspec_version)"
