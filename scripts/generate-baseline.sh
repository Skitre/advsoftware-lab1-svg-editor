#!/usr/bin/env bash
# Replays Phase 1 sessions against a git ref (default: the `final` tag) and stores the
# byte-exact results in doc/transcript/expected/<session>/ as the compatibility baseline:
#   output.txt  stdout and stderr interleaved, exactly as `cli < session > out 2>&1` writes them
#   status      process exit code
#   files/      every file the session created in its working directory (e.g. saved SVGs)
# Each session runs in a fresh temporary working directory seeded with doc/transcript/fixtures/.
# Usage: scripts/generate-baseline.sh [ref] [session...]   (sessions default to cli-1 cli-2-flowchart cli-3-regression)
set -euo pipefail

repo=$(git rev-parse --show-toplevel)
ref=${1:-final}
shift || true
sessions=("$@")
[ ${#sessions[@]} -gt 0 ] || sessions=(cli-1 cli-2-flowchart cli-3-regression)

transcripts="$repo/doc/transcript"
work=$(mktemp -d)
cleanup() { git -C "$repo" worktree remove --force "$work/tree" >/dev/null 2>&1 || true; rm -rf "$work"; }
trap cleanup EXIT

git -C "$repo" worktree add --detach "$work/tree" "$ref" >/dev/null 2>&1
ln -s "$repo/node_modules" "$work/tree/node_modules"
tsx="$repo/node_modules/.bin/tsx"

for name in "${sessions[@]}"; do
  input="$transcripts/$name.txt"
  [ -f "$input" ] || { echo "missing session: $input" >&2; exit 1; }
  run="$work/run-$name"
  mkdir -p "$run"
  cp -R "$transcripts"/fixtures/. "$run"/
  status=0
  (cd "$run" && "$tsx" "$work/tree/src/main.ts" < "$input" > "$work/$name.out" 2>&1) || status=$?

  target="$transcripts/expected/$name"
  rm -rf "$target"
  mkdir -p "$target/files"
  cp "$work/$name.out" "$target/output.txt"
  printf '%s\n' "$status" > "$target/status"
  for file in "$run"/*; do
    [ -f "$file" ] || continue
    base=$(basename "$file")
    [ -e "$transcripts/fixtures/$base" ] && cmp -s "$file" "$transcripts/fixtures/$base" && continue
    cp "$file" "$target/files/$base"
  done
  echo "baseline $name: status $status, $(wc -l < "$target/output.txt" | tr -d ' ') lines ($ref)"
done
