#!/usr/bin/env bash

# Compares the start of the CLI with yargs against the CLI of the working tree, on Node and on Bun.
# Most of a short run is the start, so this is where the parser of the flags shows.
# Give a git ref as the first argument to compare against another commit.

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

# The last commit with yargs is the parent of the one that took it out of src/cli.ts
BEFORE="${1:-$(git log -1 --format=%h -S"'yargs'" -- src/cli.ts)^}"

TMP="$(mktemp -d)"
trap 'git -C "$ROOT" worktree remove --force "$TMP/yargs"; rm -rf "$TMP"' EXIT
git worktree add --quiet --detach "$TMP/yargs" "$BEFORE"
mkdir "$TMP/argmate"

# The packages are external, so each build sits next to a node_modules.
# .mjs as the folders have no package.json that says the files are ES modules.
for side in yargs argmate; do
	src="$ROOT"
	[ "$side" = yargs ] && src="$TMP/yargs"
	ln -sfn "$ROOT/node_modules" "$TMP/$side/node_modules"
	(cd "$src" && bun build src/cli.node.ts --target=node --format=esm --packages=external --outfile="$TMP/$side/node.mjs" > /dev/null)
	(cd "$src" && bun build src/cli.bun.ts --target=bun --format=esm --packages=external --outfile="$TMP/$side/bun.mjs" > /dev/null)
done

echo 'foobar' > "$TMP/my.file"

# The runs start from the repo, a usual place for rr. yargs reads each folder above the working folder,
# so in the temp folder of macOS, with tens of thousands of entries, yargs takes some 45 ms more.
cd "$ROOT"

echo "yargs from $(git -C "$ROOT" log -1 --format='%h %s' "$BEFORE")"
echo 'argmate from the working tree'

compare() {
	hyperfine -N --warmup 10 --runs 40 \
		-n "yargs   $1" "$2 $TMP/yargs/$3 $4" \
		-n "argmate $1" "$2 $TMP/argmate/$3 $4"
}

for runtime in node bun; do
	compare "$runtime, no flags" "$runtime" "$runtime.mjs" "o x $TMP/my.file -S"
	compare "$runtime, many flags" "$runtime" "$runtime.mjs" "o x $TMP/my.file -S -V -m -e utf8 --sort natural -x nope -X nope --name-delimiter , --expect-files"
	compare "$runtime, help" "$runtime" "$runtime.mjs" "-h"
done
