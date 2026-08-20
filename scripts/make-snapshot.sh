#!/usr/bin/env bash
#
# Build a portfolio snapshot repository: one commit, current tree, no history.
#
# WHY THE TREE IS BUILT WITH `git archive` AND NOT A FILE COPY
#
# This repository has, sitting untracked in the working directory, roughly
# 213 MB of Playwright traces containing production session cookies, a
# fundraising deck, and an .npmrc holding a registry token. The ONLY thing
# keeping them out of git is .gitignore. There is no .gitattributes backstop.
#
# `git archive` emits the index and nothing else, so those files cannot reach
# the snapshot even if .gitignore were edited or a new secret appeared on disk.
# A robocopy, xcopy, Copy-Item -Recurse, or zip of the folder would sweep every
# one of them in. Do not "simplify" this script into a file copy.
#
# Usage:
#
#   scripts/make-snapshot.sh [DEST] [REF]
#
#   DEST  where to build          (default: ../lextract-snapshot)
#   REF   commit-ish to snapshot  (default: master)
#
# The script adds no remote and pushes nothing. Creating the repository and
# pushing are deliberately left to a human.

set -euo pipefail

DEST="${1:-../lextract-snapshot}"
REF="${2:-master}"

SRC="$(git rev-parse --show-toplevel)"
cd "$SRC"

if ! git rev-parse --verify --quiet "$REF^{commit}" >/dev/null; then
  echo "error: '$REF' is not a commit in $SRC" >&2
  exit 1
fi

# Refuse to overwrite anything that already exists, rather than merging a new
# tree into a stale one and leaving deleted files behind.
if [ -e "$DEST" ]; then
  echo "error: $DEST already exists. Remove it or choose another path." >&2
  exit 1
fi

mkdir -p "$DEST"
DEST_ABS="$(cd "$DEST" && pwd)"

echo "Snapshotting $REF from $SRC"
git archive --format=tar "$REF" | tar -x -C "$DEST_ABS"

cd "$DEST_ABS"
git init -q -b main
git add -A
git commit -q -m "Lextract: AI-powered commercial lease abstraction

Snapshot of the working repository. Development history lives in a separate
private repository and is not published here."

# ---------------------------------------------------------------------------
# Verification. A snapshot that silently included a secret would be worse than
# no snapshot, so these are assertions rather than advisory output.
# ---------------------------------------------------------------------------

fail=0

commits="$(git rev-list --all --count)"
[ "$commits" = "1" ] || { echo "FAIL: expected 1 commit, got $commits" >&2; fail=1; }

expected="$(git -C "$SRC" ls-tree -r "$REF" --name-only | wc -l)"
actual="$(git ls-files | wc -l)"
[ "$expected" = "$actual" ] \
  || { echo "FAIL: file count $actual != source tree $expected" >&2; fail=1; }

if git ls-files \
  | grep -Eq '^(e2e-artifacts|docs/fundraising|outputs|\.wrangler)/|(^|/)\.npmrc$|(^|/)\.env$|(^|/)\.dev\.vars$'; then
  echo "FAIL: a path that must never ship is present:" >&2
  git ls-files \
    | grep -E '^(e2e-artifacts|docs/fundraising|outputs|\.wrangler)/|(^|/)\.npmrc$|(^|/)\.env$|(^|/)\.dev\.vars$' >&2
  fail=1
fi

# Credential shapes, matched to each provider's real token format.
#
# The length floors are what separate a leak from a fixture. This test suite is
# full of strings like `sk_live_prod_key`, `signed-session-cookie` and
# `opaque-session-token`, which are the correct thing for a test to contain and
# must not fail the build. Real credentials from these providers are long
# unbroken alphanumeric runs, so requiring 20+ characters with no hyphens or
# underscores excludes every readable placeholder while still catching the
# genuine article.
#
# eyJhbGciOiJFZERTQSI is the base64 of {"alg":"EdDSA", the exact header of the
# production Neon Auth token, so it needs no length floor.
for pattern in 'eyJhbGciOiJFZERTQSI' \
               '__Secure-neon-auth[^ "]*=[A-Za-z0-9]{20,}' \
               'sk-or-v1-[A-Za-z0-9]{20,}' \
               'sk_live_[A-Za-z0-9]{20,}' \
               'AKIA[A-Z0-9]{16}'; do
  # This file is excluded from its own scan: it necessarily contains every
  # pattern as a literal, so it would always match itself.
  if git grep -nIE "$pattern" -- . ':(exclude)scripts/make-snapshot.sh' \
       >/dev/null 2>&1; then
    echo "FAIL: credential-shaped string matching /$pattern/:" >&2
    git grep -nIE "$pattern" -- . ':(exclude)scripts/make-snapshot.sh' >&2
    fail=1
  fi
done

if [ "$fail" -ne 0 ]; then
  echo "" >&2
  echo "Snapshot at $DEST_ABS FAILED verification. Do not publish it." >&2
  exit 1
fi

echo ""
echo "Snapshot ready at $DEST_ABS"
echo "  commit:  $(git log --format='%h %s' -1 | head -1)"
echo "  files:   $actual"
echo "  size:    $(du -sh .git | cut -f1) of git objects"
echo ""
echo "No remote is configured and nothing has been pushed."
