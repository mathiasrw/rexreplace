#!/usr/bin/env bash

# Compares the regex engines of rr, and the default flags against the flag u and the flag v.
# rr from the working tree runs on Node and on Bun, on short and long files, with a pattern that matches often and one that never matches.
# Give sizes as arguments to run only those, like `1KB 10MB`.

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DIR/../../.." && pwd)"
SIZES="${*:-1KB 100KB 1MB 10MB 100MB}"

# The file to change is in tmp of the repo, and given by a path from the repo, as rr is most often run on files under the working folder
mkdir -p "$ROOT/tmp"
TMP="$(mktemp -d)"
WORK="$(mktemp -d "$ROOT/tmp/performance.XXXXXX")"
trap 'rm -rf "$TMP" "$WORK"' EXIT

source "$DIR/../shared/build.sh"
source "$DIR/../shared/check.sh"
build_rr "$ROOT" "$TMP/rr"

# The book is 851 KB, so it is repeated to have enough text for the largest file
for i in $(seq 130); do cat "$DIR/../tools/1984.html"; done > "$TMP/book"

# Both patterns try at each < and read the tag, so they do the same work, but ~> is not in the book, so the second never matches
MATCHES='<[^>\n]*>'
NO_MATCHES='<[^>\n]*~>'
FILE="${WORK#"$ROOT/"}/test.file"

# The runs start from the repo, a usual place for rr
cd "$ROOT"

ROWS=()
for size in $SIZES; do
	number="${size//[!0-9]/}"
	unit="${size//[0-9]/}"
	case "$unit" in
		KB) bytes=$((number * 1024)) ;;
		MB) bytes=$((number * 1024 * 1024)) ;;
		*) echo "Unknown size $size, use KB or MB like 10KB" && exit 1 ;;
	esac
	head -c "$bytes" "$TMP/book" > "$TMP/$size.file"

	cp "$TMP/$size.file" "$TMP/$size.matches"
	perl -pi -e 's/<[^>]*>//g' "$TMP/$size.matches"
	cp "$TMP/$size.file" "$TMP/$size.no-matches"

	for kind in matches no-matches; do
		pattern="$MATCHES"
		[ "$kind" = no-matches ] && pattern="$NO_MATCHES"
		for runtime in Node Bun; do
			rr="node $TMP/rr/node.mjs '$pattern' '' $FILE"
			[ "$runtime" = Bun ] && rr="bun $TMP/rr/bun.mjs '$pattern' '' $FILE"
			# Grouped by flag, as the flag is what moves the time. The default flags are gim, so --flags gimv is the default with v added
			ARGS=(
				-n 'rr' "$rr"
				-n 'runtime' "$rr -E runtime"
				-n 'rr -u' "$rr -u"
				-n 'runtime -u' "$rr -E runtime -u"
				-n 'rr v' "$rr --flags gimv"
				-n 'runtime v' "$rr -E runtime --flags gimv"
				-n 'regex+' "$rr -E regex+"
			)
			check_same "$TMP/$size.file" "$FILE" "$TMP/$size.$kind" "${ARGS[@]}"

			row="$size $kind on $runtime"
			echo ''
			echo "## $row"
			hyperfine -N --warmup 2 --min-runs 10 --prepare "cp $TMP/$size.file $FILE" --export-json "$TMP/$row.json" "${ARGS[@]}"
			ROWS+=("$TMP/$row.json")
		done
	done
done

node "$DIR/../shared/table.js" "${ROWS[@]}"
