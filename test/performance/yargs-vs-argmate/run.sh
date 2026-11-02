#!/usr/bin/env bash

# Compares the start of the CLI with yargs against the CLI of the working tree, on Node and on Bun.
# Most of a short run is the start, so this is where the parser of the flags shows.
# Give a git ref as the first argument to compare against another commit.

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DIR/../../.." && pwd)"
cd "$ROOT"

# The last commit with yargs is the parent of the one that took it out of src/cli.ts
BEFORE="${1:-$(git log -1 --format=%h -S"'yargs'" -- src/cli.ts)^}"

TMP="$(mktemp -d)"
trap 'git -C "$ROOT" worktree remove --force "$TMP/yargs"; rm -rf "$TMP"' EXIT
git worktree add --quiet --detach "$TMP/yargs" "$BEFORE"

source "$DIR/../shared/build.sh"
build_rr "$TMP/yargs" "$TMP/yargs"
build_rr "$ROOT" "$TMP/argmate"

echo 'foobar' > "$TMP/my.file"

# The runs start from the repo, a usual place for rr. yargs reads each folder above the working folder,
# so in the temp folder of macOS, with tens of thousands of entries, yargs takes some 45 ms more.
cd "$ROOT"

echo "yargs from $(git -C "$ROOT" log -1 --format='%h %s' "$BEFORE")"
echo 'argmate from the working tree'

ROWS=()
compare() {
	ROWS+=("$TMP/$1.json")
	hyperfine -N --warmup 10 --runs 40 --export-json "$TMP/$1.json" \
		-n yargs "$2 $TMP/yargs/$2.mjs $3" \
		-n argmate "$2 $TMP/argmate/$2.mjs $3"
}

for runtime in node bun; do
	compare "$runtime, no flags" "$runtime" "o x $TMP/my.file -S"
	compare "$runtime, many flags" "$runtime" "o x $TMP/my.file -S -V -m -e utf8 --sort natural -x nope -X nope --name-delimiter , --expect-files"
	compare "$runtime, help" "$runtime" "-h"
done

node "$DIR/../shared/table.js" "${ROWS[@]}"
