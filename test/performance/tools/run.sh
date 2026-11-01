#!/usr/bin/env bash

# Compares rr from the working tree, on Node and on Bun, with other tools that replace in files.
# Each tool removes the HTML tags from a file in place, on sizes from 1 KB to 100 MB.
# Give sizes as arguments to run only those, like `1KB 10MB`.

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DIR/../../.." && pwd)"
SIZES="${*:-1KB 10KB 100KB 500KB 1MB 5MB 10MB 50MB 100MB}"

# The file to change is in tmp of the repo, and given by a path from the repo, as rr is most often run on files under the working folder
mkdir -p "$ROOT/tmp"
TMP="$(mktemp -d)"
WORK="$(mktemp -d "$ROOT/tmp/performance.XXXXXX")"
trap 'rm -rf "$TMP" "$WORK"' EXIT

source "$DIR/../shared/build.sh"
source "$DIR/../shared/check.sh"
build_rr "$ROOT" "$TMP/rr"

# The tools from npm are the latest, in the temp folder, so nothing is installed for good
npm install --silent --no-audit --no-fund --prefix "$TMP/npm" replace-in-file replace-x replace > /dev/null
NPM="$TMP/npm/node_modules/.bin"
echo "From npm $(cd "$TMP/npm" && npm ls --depth=0 2>/dev/null | tail -n +2 | grep -o '[a-z-]*@[0-9.]*' | tr '\n' ' ')"

# The book is 851 KB, so it is repeated to have enough text for the largest file
for i in $(seq 130); do cat "$DIR/1984.html"; done > "$TMP/book"

# sed and perl read a line at a time, so a tag over two lines stays.
# The tools that read the whole file get a pattern that stops at a line break, to do the same work.
TAGS='<[^>]*>'
TAGS_IN_A_LINE='<[^>\n]*>'
FILE="${WORK#"$ROOT/"}/test.file"

# BSD sed (macOS) needs an empty suffix after -i, GNU sed does not take one
if sed --version > /dev/null 2>&1; then
	SED_INPLACE="-i"
else
	SED_INPLACE="-i ''"
fi

TOOLS=(
	"rr on Node|node $TMP/rr/node.mjs '$TAGS_IN_A_LINE' '' $FILE"
	"rr on Bun|bun $TMP/rr/bun.mjs '$TAGS_IN_A_LINE' '' $FILE"
	"sed|sed $SED_INPLACE 's/$TAGS//g' $FILE"
	"gsed|gsed -i 's/$TAGS//g' $FILE"
	"perl|perl -pi -e 's/$TAGS//g' $FILE"
	"sd|sd '$TAGS_IN_A_LINE' '' $FILE"
	"replace-in-file|$NPM/replace-in-file '/$TAGS_IN_A_LINE/g' '' $FILE --isRegex"
	"replace-x|$NPM/replace-x '$TAGS_IN_A_LINE' '' $FILE"
	"replace|$NPM/replace '$TAGS_IN_A_LINE' '' $FILE"
)

# A tool that is not installed is left out
ARGS=()
for tool in "${TOOLS[@]}"; do
	name="${tool%%|*}"
	command="${tool#*|}"
	program="${command%% *}"
	if command -v "$program" > /dev/null; then
		ARGS+=(-n "$name" "$command")
	else
		echo "Left out $name, as it is not installed"
	fi
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

	cp "$TMP/$size.file" "$TMP/$size.reference"
	perl -pi -e "s/$TAGS//g" "$TMP/$size.reference"
	check_same "$TMP/$size.file" "$FILE" "$TMP/$size.reference" "${ARGS[@]}"

	echo ''
	echo "## $size"
	hyperfine -N --warmup 2 --min-runs 10 --prepare "cp $TMP/$size.file $FILE" --export-json "$TMP/$size.json" "${ARGS[@]}"
done

node "$DIR/../shared/table.js" $(for size in $SIZES; do echo "$TMP/$size.json"; done)
