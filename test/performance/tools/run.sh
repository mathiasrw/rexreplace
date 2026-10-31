#!/usr/bin/env bash

# Compares rr from the working tree, on Node and on Bun, with other tools that replace in files.
# Each tool removes the HTML tags from a file in place, on sizes from 1 KB to 100 MB.
# A tool that is not installed is left out. Give sizes as arguments to run only those, like `1KB 10MB`.

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DIR/../../.." && pwd)"
SIZES="${*:-1KB 10KB 100KB 1MB 10MB 100MB}"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# The packages are external, so the builds sit next to a node_modules
ln -s "$ROOT/node_modules" "$TMP/node_modules"
(cd "$ROOT" && bun build src/cli.node.ts --target=node --format=esm --packages=external --outfile="$TMP/node.mjs" > /dev/null)
(cd "$ROOT" && bun build src/cli.bun.ts --target=bun --format=esm --packages=external --outfile="$TMP/bun.mjs" > /dev/null)

# The book is 851 KB, so it is repeated to have enough text for the largest file
for i in $(seq 130); do cat "$DIR/1984.html"; done > "$TMP/book"

# sed and perl read a line at a time, so a tag over two lines stays.
# The tools that read the whole file get a pattern that stops at a line break, to do the same work.
TAGS='<[^>]*>'
TAGS_IN_A_LINE='<[^>\n]*>'
FILE="$TMP/test.file"

# BSD sed (macOS) needs an empty suffix after -i, GNU sed does not take one
if sed --version > /dev/null 2>&1; then
	SED_INPLACE="-i"
else
	SED_INPLACE="-i ''"
fi

TOOLS=(
	"rr on Node|node $TMP/node.mjs '$TAGS_IN_A_LINE' '' $FILE"
	"rr on Bun|bun $TMP/bun.mjs '$TAGS_IN_A_LINE' '' $FILE"
	"sed|sed $SED_INPLACE 's/$TAGS//g' $FILE"
	"gsed|gsed -i 's/$TAGS//g' $FILE"
	"perl|perl -pi -e 's/$TAGS//g' $FILE"
	"sd|sd '$TAGS_IN_A_LINE' '' $FILE"
	"replace-in-file|replace-in-file '/$TAGS_IN_A_LINE/g' '' $FILE --isRegex"
)

ARGS=()
for tool in "${TOOLS[@]}"; do
	name="${tool%%|*}"
	command="${tool#*|}"
	program="${command%% *}"
	command -v "$program" > /dev/null || continue
	ARGS+=(-n "$name" "$command")
done

# The runs start from the repo, a usual place for rr
cd "$ROOT"

for size in $SIZES; do
	number="${size//[!0-9]/}"
	unit="${size//[0-9]/}"
	case "$unit" in
		KB) bytes=$((number * 1024)) ;;
		MB) bytes=$((number * 1024 * 1024)) ;;
		*) echo "Unknown size $size, use KB or MB like 10KB" && exit 1 ;;
	esac
	head -c "$bytes" "$TMP/book" > "$TMP/$size.file"

	echo ''
	echo "## $size"
	hyperfine -N --warmup 2 --min-runs 10 --prepare "cp $TMP/$size.file $FILE" "${ARGS[@]}"
done
