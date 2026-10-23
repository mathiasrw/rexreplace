#!/usr/bin/env bash

# A demo of how RexReplace is used, with a few examples of each feature.
# The checks of many combinations are in test/cli/*.test.js.

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

source $DIR/aserta.sh

# The tests call `rexreplace`. Set RR to test another command (like `rexreplace-bun`).
if [ -n "$RR" ]; then
	rexreplace() { command $RR "$@"; }
fi

reset() {
		echo
		echo "$(date +'%Y-%m-%d %H:%M:%S') - Reset test data "
		rm -f *.file
        echo 'foobar' > my.file
        echo 'abc123' > your.file
}



# Plain usage: the file is changed, and its name is printed
reset
assert		 		"rexreplace o x my.file"    "my.file"
assert		 		"cat my.file"    "fxxbar"

reset
rexreplace "b" "\n" my.file
assert		 		"cat my.file"    "foo\nar"

# The pattern and the replacement can start with '-'
reset
rexreplace '^(.+)$' '- $1' my.file
rexreplace '- f' '_' my.file
assert		 		"cat my.file"    "_oobar"


# Piped data is the text to search, and the result is printed
reset
assert		 		"cat my.file | rexreplace foo xxx"    "xxxbar"


# --version and --help, also as -v and -h
reset
assert_matches		"rexreplace --version"    "(dev|[0-9])"
assert		 		"rexreplace -v"    "$(rexreplace --version)"
assert_success		"rexreplace --help"
assert_success		"rexreplace -h"
# A single argument that only has -v or -h in it is not a request for the version or help
assert_failure		"rexreplace my-vile"
assert_failure		"rexreplace o-ho"


# The exit code: 0 when done, 2 when a file gave an error and the run went on, 3 when the run stopped
# --halt (or --bail) stops at the first error, here that my.file can not be read
reset
chmod 000 my.file
assert_raises		"rexreplace b x my.file your.file --halt"    3
assert_raises		"rexreplace b x my.file your.file --bail"    3
assert			"cat your.file"    "abc123"
assert_raises		"rexreplace b x my.file your.file"    2
assert			"cat your.file"    "axc123"

# Finding no files is a warning and not an error
assert_raises		"rexreplace o x nope.file"    0


# --output prints the result and leaves the file as it is
reset
assert		 		"rexreplace o x my.file --output"    "fxxbar"
assert		 		"cat my.file"    "foobar"


# --engine: `default` is the engine of the runtime: V8 with Node and JSC with Bun
reset
assert		 		"rexreplace o x my.file --output --engine default"    "fxxbar"
if [[ "$(rexreplace --version)" == *+bun ]]; then
	assert_failure		"rexreplace o x my.file --output --engine V8"
else
	assert_failure		"rexreplace o x my.file --output --engine JSC"
fi


# --encoding
reset
assert		 		"printf foo | rexreplace o x --encoding latin1"    'fxx'
assert_failure		"rexreplace o x my.file --encoding nope"


# --keep-backup
reset
rexreplace o x my.file --keep-backup
assert		 		"cat my.file"    "fxxbar"
assert		 		"cat my.file.*"  "foobar"
rm my.file.*


# The search is case-insensitive, unless --void-ignore-case
reset
assert		 		"rexreplace Foo xxx my.file -o"    "xxxbar"
assert		 		"rexreplace Foo xxx my.file -o --void-ignore-case"    "foobar"


# --void-global replaces only the first match
reset
assert		 		"rexreplace o x my.file -o --void-global"    "fxobar"


# --output-match prints the matches, or the groups if the pattern has any
reset
assert		 		"rexreplace '[fb].' _ my.file --output-match"    "fo\nba"
assert		 		"rexreplace '([fb](.))' _ my.file --output-match"    "foo\nbaa"


# --dot-all lets . match a line break
reset
echo foobar >> my.file
assert		 		"rexreplace ar.foo _ my.file -o --dot-all"    "foob_bar"


# ^ is the start of each line, unless --void-multiline
reset
echo foobar >> my.file
assert		 		"rexreplace '^.' 'x' my.file -o"    "xoobar\nxoobar"
assert		 		"rexreplace '^.' 'x' my.file -o --void-multiline"    "xoobar\nfoobar"


# Groups in the replacement, with $ or the alias €
reset
assert		 		"rexreplace '(f?(o))o(.*)' '\$3\$1\$2' my.file -o"    "barfoo"
assert		 		"rexreplace '(f?(o))o(.*)' '€3€1€2' my.file -o"    "barfoo"
assert		 		"rexreplace '.€' '€' my.file -o --void-euro"    'foobar'


# § is an alias for \, also in the replacement, unless --void-section
reset
echo foo[bar] > my.file
assert		 		"rexreplace '[§]]' '[' my.file -o"    'foo[bar['
assert		 		"rexreplace '[§]]' '[' my.file -o --void-section"    'foo[bar]'
reset
rexreplace 'b' '§n' my.file
assert		 		"cat my.file"    "foo\nar"


# Globs
reset
echo barfoo > my_file
assert		 		"rexreplace o x 'my*le' -o"    "fxxbar\nbarfxx"
rm my_file

# A path to a file is used as it is, also with glob characters in its name
reset
echo foo > 'a[1].file'
echo foo > a1.file
assert		 		"rexreplace o x 'a[1].file'"    'a[1].file'
assert		 		"cat a1.file"    'foo'

# Globs are case-insensitive like the search
reset
assert		 		"rexreplace 'oo' 'x' '*.FILE' -X 'YOUR*'"    'my.file'


# --exclude-glob and --exclude-re
reset
rexreplace 'b' 'x' '*.file' --exclude-glob 'y*'
assert		 		"cat your.file"    'abc123'
reset
rexreplace 'b' 'x' '*.file' --exclude-re '^y'
assert		 		"cat my.file"    'fooxar'
assert		 		"cat your.file"    'abc123'


# --literal searches for the pattern as plain text
reset
assert		 		"rexreplace '*+*' 'b' my.file -o --literal"    'foobar'


# --replacement-js: the code gives the replacement
reset
assert		 		"rexreplace 'foo' '2+2' my.file -o --replacement-js"    '4bar'
assert		 		"rexreplace 'foo((b)ar)' '€1+€2' my.file -o --js"    'barb'
assert		 		"rexreplace 'foobar' \"[filename, name, ext].join(':')\" my.file -o -j"    'my.file:my:.file'


# --replacement-pipe: the replacement is piped in
reset
assert		 		"printf x | rexreplace 'b' _ my.file -o --replacement-pipe"    'fooxar'

# --js-pipe: the code gets the piped data as `pipe`
reset
assert		 		"printf x | rexreplace 'foo' 'pipe' my.file -o --js-pipe"    'xbar'

# Data that is piped in but not used gives a warning
reset
assert		 		"printf x | rexreplace 'o' 'x' my.file --pipe 2>&1 >/dev/null | grep -c 'Data is piped in'"    '1'


# The names of the changed files go to stdout, so they can be piped on
reset
assert		 		"rexreplace 'b' 'x' my.file your.file -A"    'my.file\nyour.file'
reset
assert		 		"rexreplace 'b' 'x' '*.file' -A | xargs cat"    'fooxar\naxc123'
reset
assert		 		"rexreplace 'b' 'x' my.file your.file -A --null-out | xargs -0 cat"    'fooxar\naxc123'

# With --output stdout has the result, so the names go to stderr
reset
assert		 		"rexreplace 'b' 'x' my.file -o 2>&1 >/dev/null"    'my.file'

# --name-all also names the files where nothing was changed
reset
assert		 		"rexreplace 'z' 'x' my.file your.file -A --name-all"    'my.file\nyour.file'

# --name-delimiter, with no tail after the last name
reset
assert		 		"rexreplace 'b' 'x' my.file your.file -A --name-delimiter ', ' --no-name-delimiter-tail"    'my.file, your.file'

# --content-delimiter goes after the content of each file. A value that starts with - is given with =
reset
assert		 		"rexreplace 'b' 'x' my.file your.file -o --content-delimiter='---\n'"    'fooxar\n---\naxc123\n---'

# --nl ends what is printed with a line break (tr shows it)
reset
assert		 		"printf foo | rexreplace 'o' 'x' --nl | tr '\n' '+'"    'fxx+'


# --simulate names the files that would be changed, but writes nothing
reset
assert		 		"rexreplace 'oo' 'x' my.file your.file --simulate"    'my.file'
assert		 		"cat my.file"    'foobar'


# --rename (-r) does the search and replace on the name, and renames the file to the result
reset
assert		 		"rexreplace '^my' 'our' my.file --rename"    'our.file'
assert		 		"cat our.file"    'foobar'
# --rename-path does it on the whole path, so the file can be moved
assert		 		"rexreplace '^' 'sub/' our.file --rename-path"    'sub/our.file'
assert		 		"cat sub/our.file"    'foobar'
rm -rf sub

# --rename with --simulate prints the old names to stderr and the new ones to stdout
reset
assert		 		"rexreplace '^my' 'our' my.file -r --simulate 2>/dev/null"    'our.file'
assert		 		"rexreplace '^my' 'our' my.file -r --simulate 2>&1 >/dev/null"    'my.file'

# If two planned renames clash, the run stops before any file is renamed
reset
assert_raises		"rexreplace '^(my|your)' 'our' my.file your.file -r"    3
assert		 		"cat my.file"    'foobar'


# --expect-* checks the result, so a CI step can stop. When a check is not met, the exit code is 1.
reset
assert_raises		"rexreplace 'oo' 'x' my.file --expect-zero-diff --simulate"    1
assert		 		"cat my.file"    'foobar'
assert_raises		"rexreplace 'nope' 'x' my.file --expect-diff"    1
assert_raises		"rexreplace 'oo' 'x' my.file -z"    0
assert_raises		"rexreplace 'oo' 'x' nope.file --expect-files"    1


# --full-path prints the full path of each name
reset
assert		 		"rexreplace 'b' 'x' my.file --full-path"    "$(pwd -P)/my.file"


# --glob-pipe: the files to work on are piped in
reset
assert		 		"printf 'my.file\nyour.file\n' | rexreplace 'b' 'x' --glob-pipe -A"    'my.file\nyour.file'
# The changed files of one run go on to the next run
reset
assert		 		"rexreplace 'oo' 'x' '*.file' --null-out | rexreplace 'x' 'y' --glob-pipe --null-in"    'my.file'
assert		 		"cat my.file"    'fybar'


# Null bytes are kept
reset
assert		 		"printf 'foo\0boo\0' | rexreplace 'o' 'x' | tr '\0' '|'"    'fxx|bxx|'
assert		 		"printf 'foo\0boo\0' | rexreplace 'o' '_' --output-match --null-out | tr '\0' '|'"    'o|o|o|o|'


# UTF-8 goes in and out as it is
reset
assert		 		"printf 'a🦖b' | rexreplace '🦖' '👩‍💻'"    'a👩‍💻b'
assert		 		"printf 'x🦖y' | rexreplace 'x.y' '_' --unicode"    '_'
echo foo > '🦖 中.file'
assert		 		"rexreplace 'o' 'x' '🦖 中.file'"    '🦖 中.file'



rm -f *.file

assert_end 			"rexreplace cli"
