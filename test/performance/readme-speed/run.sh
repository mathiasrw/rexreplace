#!/usr/bin/env bash

# Runs the speed test of the README again, rr against sed on the sizes of its table, with the last release of each major of rr.
# The files are made as the README says. Up to 500 KB they are cut from the book, and a larger file is the first 500 KB put together again and again.
# Give sizes as arguments to run only those, like `1KB 10MB`.

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DIR/../../.." && pwd)"
SIZES="${*:-1KB 5KB 10KB 100KB 500KB 1MB 5MB 10MB 25MB 50MB 100MB}"
VERSIONS='1.1.0 2.5.3 3.1.1 4.1.2 5.3.0 6.1.5 7.1.15'

# The file to change is in tmp of the repo, and given by a path from the repo, as rr 3 to 7 can not write to an absolute path outside the working folder
mkdir -p "$ROOT/tmp"
TMP="$(mktemp -d)"
WORK="$(mktemp -d "$ROOT/tmp/performance.XXXXXX")"
trap 'rm -rf "$TMP" "$WORK"' EXIT

source "$DIR/../shared/build.sh"
source "$DIR/../shared/check.sh"
build_rr "$ROOT" "$TMP/rr"

# rr 6 needs re2, and the version it asks for does not build on a new Node, so a later re2 stands in for it
for version in $VERSIONS; do
	mkdir "$TMP/$version"
	echo "{\"dependencies\": {\"rexreplace\": \"$version\"}, \"overrides\": {\"re2\": \"1.22.1\"}}" > "$TMP/$version/package.json"
	(cd "$TMP/$version" && npm install --silent --no-audit --no-fund > /dev/null)
done

# sed reads a line at a time, so a tag over two lines stays. rr reads the whole file, so its pattern stops at a line break to do the same work.
TAGS='<[^>]*>'
TAGS_IN_A_LINE='<[^>\n]*>'
FILE="${WORK#"$ROOT/"}/test.file"

# BSD sed (macOS) needs an empty suffix after -i, GNU sed does not take one
if sed --version > /dev/null 2>&1; then
	SED_INPLACE="-i"
else
	SED_INPLACE="-i ''"
fi

ARGS=(-n 'sed' "sed $SED_INPLACE 's/$TAGS//g' $FILE")
for version in $VERSIONS; do
	ARGS+=(-n "rr $version" "node $TMP/$version/node_modules/.bin/rexreplace '$TAGS_IN_A_LINE' '' $FILE")
done
ARGS+=(-n 'rr now' "node $TMP/rr/node.mjs '$TAGS_IN_A_LINE' '' $FILE")
ARGS+=(-n 'rr now on Bun' "bun $TMP/rr/bun.mjs '$TAGS_IN_A_LINE' '' $FILE")

head -c $((500 * 1024)) "$DIR/../tools/1984.html" > "$TMP/500KB.part"

# The runs start from the repo, a usual place for rr
cd "$ROOT"

for size in $SIZES; do
	number="${size//[!0-9]/}"
	unit="${size//[0-9]/}"
	case "$unit" in
		KB) head -c $((number * 1024)) "$DIR/../tools/1984.html" > "$TMP/$size.file" ;;
		MB) for i in $(seq $((number * 2))); do cat "$TMP/500KB.part"; done > "$TMP/$size.file" ;;
		*) echo "Unknown size $size, use KB or MB like 10KB" && exit 1 ;;
	esac

	cp "$TMP/$size.file" "$TMP/$size.reference"
	perl -pi -e "s/$TAGS//g" "$TMP/$size.reference"
	check_same "$TMP/$size.file" "$FILE" "$TMP/$size.reference" "${ARGS[@]}"

	echo ''
	echo "## $size"
	hyperfine -N --warmup 1 --runs 10 --prepare "cp $TMP/$size.file $FILE" --export-json "$TMP/$size.json" "${ARGS[@]}"
done

node "$DIR/../shared/table.js" $(for size in $SIZES; do echo "$TMP/$size.json"; done)
