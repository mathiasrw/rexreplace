#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

source $DIR/aserta.sh

# The tests call `rexreplace`. Set RR to test another command (like `rr` or `bun run rexreplace-bun`).
if [ -n "$RR" ]; then
	rexreplace() { command $RR "$@"; }
fi

# # Command exit codes
# assert_success    "true"
# assert_failure    "false"
# assert_raises     "unknown_cmd" 127
# 
# Expected output
# assert            "echo test"    "test"
# assert            "seq 3"        "1\n2\n3"
# assert_contains   "echo foobar"  "oba"
# assert_startswith "echo foobar"  "foo"
# assert_endswith   "echo foobar"  "bar"
# assert_matches    "echo foobar"  "^f.*r$"
# 
# assert_end "example"

reset() {
		echo
		echo "$(date +'%Y-%m-%d %H:%M:%S') - Reset test data "
		rm -f *.file
        echo 'foobar' > my.file
        echo 'abc123' > your.file
}



# Plain usage
reset
rexreplace x x my.file
assert		 		"cat my.file"    "foobar"

reset
rexreplace o x my.file
assert		 		"cat my.file"    "fxxbar"

reset
rexreplace "b" "\n" my.file
assert		 		"cat my.file"    "foo\nar"


# Replacement with a real line break, an escaped single quote or a lone backslash at the end (#691)
reset
rexreplace "b" $'\n' my.file
assert		 		"cat my.file"    "foo\nar"

reset
rexreplace "b" "\\'" my.file
assert		 		"cat my.file"    "foo'ar"

reset
rexreplace "r" '\' my.file
assert		 		"cat my.file"    'fooba\\'


# rr can handle a pattern and replcaement starting with '-'
reset
rexreplace '^(.+)$' '- $1' my.file
rexreplace '- f' '_' my.file
assert		 		"cat my.file"    "_oobar"


# Piped data
reset
assert		 		"cat my.file | rexreplace foo xxx"    "xxxbar"



# -v
reset
assert_success		"rexreplace -version"
assert		 		"rexreplace -v"    "$(rexreplace --version)"
assert		 		"rexreplace --version"    "$(rexreplace -version)"

# a single argument only containing -v is not a request for the version (-V is verbose)
assert_failure		"rexreplace my-vile"
assert_failure		"rexreplace -V"


# -h
reset
assert_success		"rexreplace -help"
assert_success		"rexreplace -h"
assert_success		"rexreplace --help"

# a single argument only containing -h is not a request for help (-H is halt)
assert_failure		"rexreplace o-ho"
assert_failure		"rexreplace -H"

# -H, --halt, --bail
reset
assert_success		"rexreplace --help | grep -F -- '--bail' >/dev/null"
assert_raises		"rexreplace o x nope.file --bail" 1
assert_raises		"rexreplace o x nope.file --halt" 1
assert_raises		"rexreplace o x nope.file -H" 1
# --bail is accepted (not an unknown argument) and leaves files untouched when nothing fails
assert_success		"rexreplace o x my.file --bail"
assert				"cat my.file" "fxxbar"


# -o
reset
assert		 		"rexreplace x x my.file --output"    "foobar"

reset
assert		 		"rexreplace o x my.file --output"    "fxxbar"


# -E 
# `default` is the engine of the runtime: V8 with Node and JSC with Bun. The engine of the other runtime can not be picked.
reset
# assert		 		"rexreplace o x my.file --output --engine RE2"    "fxxbar"		# RE2	 depricated
assert		 		"rexreplace o x my.file --output --engine default"    "fxxbar"

if [[ "$(rexreplace --version)" == *+bun ]]; then
	assert		 		"rexreplace o x my.file --output --engine JSC"    "fxxbar"
	assert_failure		"rexreplace o x my.file --output --engine V8"
else
	assert		 		"rexreplace o x my.file --output --engine V8"    "fxxbar"
	assert_failure		"rexreplace o x my.file --output --engine JSC"
fi


# -b
reset
rexreplace o x my.file --keep-backup
assert		 		"cat my.file"    "fxxbar"
assert		 		"cat my.file.*"  "foobar"
rm my.file.*

# -I
reset
assert		 		"rexreplace Foo xxx my.file -o"    "xxxbar"

reset
assert		 		"rexreplace Foo xxx my.file -o --void-ignore-case"    "foobar"


# -G
reset
assert		 		"rexreplace o x my.file -o --void-global"    "fxobar"


# -O
reset
assert		 		"rexreplace [fb]. _ my.file --output-match"    "fo\\nba"

reset
assert		 		"rexreplace '([fb](.))' _ my.file --output-match"    "foo\\nbaa"

# -GO
reset
assert		 		"rexreplace [fb]. _ my.file --output-match --voidGlobal"    "fo"



# -s
reset
echo foobar >> my.file
assert		 		"rexreplace ar.foo _ my.file -o --dot-all "    "foob_bar"




# -M
reset
echo foobar >> my.file
assert		 		"rexreplace '^.' 'x' my.file -o"    "xoobar\nxoobar"

reset
echo foobar >> my.file
assert		 		"rexreplace '^.' 'x' my.file -o --void-multiline"    "xoobar\nfoobar"


# back reference
reset
assert		 		"rexreplace '(f?(o))o(.*)' '\$3\$1\$2' my.file -o"    "barfoo"

reset
assert		 		"rexreplace '(f?(o))o(.*)' '€3€1€2' my.file -o"    "barfoo"


# globs
reset
echo foobar >> my_file
assert		 		"rexreplace o x my*le -o"    "fxxbar\nfxxbar"
rm my_file


# -€
reset
assert		 		"rexreplace '.$' '$' my.file -o"    'fooba$'

reset
assert		 		"rexreplace '.€' '€' my.file -o"    'fooba$'

reset
assert		 		"rexreplace '.€' '€' my.file -o --void-euro"    'foobar'


# -§
reset
echo foo[bar] > my.file
assert		 		"rexreplace '[\]]' '[' my.file -o"    'foo[bar['


reset
echo foo[bar] > my.file
assert		 		"rexreplace '[§]]' '[' my.file -o"    'foo[bar['

reset
echo foo[bar] > my.file
assert		 		"rexreplace '[§]]' '[' my.file -o --void-section"    'foo[bar]'

# § works like \ in the replacement too (#700)
reset
rexreplace 'b' '§n' my.file
assert		 		"cat my.file"    "foo\nar"

reset
rexreplace 'r' '§§' my.file
assert		 		"cat my.file"    'fooba\\'

reset
rexreplace 'b' '§n' my.file --void-section
assert		 		"cat my.file"    'foo§nar'


# -j
reset
assert		 		"rexreplace 'foo' '2+2' my.file -o --replacement-js"    '4bar'

reset
assert		 		"rexreplace 'foo' '2+2' my.file -o -j"    '4bar'

reset
assert		 		"rexreplace 'foo' '2+2' my.file -o --js"    '4bar'

reset
assert		 		"rexreplace 'foo' 'var i = 2; i + 2' my.file -o --replacement-js"    '4bar'

reset
#assert		 		"rexreplace '[fb](.)' '€1.toUpperCase();' my.file -o --replacement-js"    'OoAr'


# Access to js variables
reset
assert		 		"rexreplace 'fo(o)bar' '[!!fs,!!globs,find,text.trim()].join(\":\")' my.file -o --replacement-js"    'true:true:fo(o)bar:foobar'


reset
assert		 		"printf foobar | rexreplace 'foobar' \"['file:'+file,'dirpath:'+dirpath,'filename:'+filename,'name:'+name,'ext:'+ext,'text:'+text].join(':')\" -o --replacement-js"    'file:❌:dirpath:❌:filename:❌:name:❌:ext:❌:text:foobar'


reset
assert		 		"rexreplace 'foobar' \"['filename:'+filename,'name:'+name,'ext:'+ext,'text:'+text].join(':')\" my.file -o --replacement-js"    'filename:my.file:name:my:ext:.file:text:foobar'

reset
assert		 		"rexreplace 'foo((b)ar)' '€1+€2' my.file -o --replacement-js"    'barb'

## Test replacement-js on multiple files
reset
assert		 		"rexreplace 'foo((b)ar)' '€1+€2' *.file -o --replacement-js"    'barb\nabc123'

reset
assert		 		"rexreplace 'a(.+)' '\"_replace_\"+€1' *.file -o --replacement-js"    'foob_replace_r\n_replace_bc123'

# Content manually testes
# todo: automate test of content
reset
assert		 		"rexreplace 'foobar' '[require, fs, globs, path, pipe, pipe_, find, find_, text, text_, file, file_, file_rel, file_rel_, dirpath, dirpath_, dirpath_rel, dirpath_rel_, dirname, dirname_, filename, filename_, name, name_, ext, ext_, cwd, cwd_, now, now_, time_obj, time, time_, mtime_obj, mtime, mtime_, ctime_obj, ctime, ctime_, bytes, bytes_, size, size_, _].length' my.file -o --replacement-js"    '44'


# -R
reset
assert		 		"printf x | rexreplace 'b' _ my.file -o --replacement-pipe"    'fooxar'


# -P
reset
assert		 		"printf x | rexreplace 'foo' 'pipe' my.file -o --replacement-js"    'xbar'
assert		 		"printf x | rexreplace 'foo' 'pipe' my.file -o --replacement-js -P"    'nullbar'
assert		 		"printf x | rexreplace 'foo' 'pipe' my.file -o --replacement-js --void-pipe"    'nullbar'
assert_failure		"printf x | rexreplace 'b' _ my.file -P -R"
assert_failure		"printf x | rexreplace 'b' _ my.file -P -T"


# Warning when piped data is not used
reset
assert		 		"printf x | rexreplace 'o' 'x' my.file 2>&1 | grep 'Data is piped in'"    ' 🟡 Data is piped in, but no flag tells what to do with it. It is not used. '
assert		 		"cat my.file"    'fxxbar'
assert_failure		"printf x | rexreplace 'o' 'x' my.file -q 2>&1 | grep 'Data is piped in'"
assert_failure		"printf x | rexreplace 'o' 'x' my.file -P 2>&1 | grep 'Data is piped in'"
assert_failure		"printf x | rexreplace 'b' _ my.file -R 2>&1 | grep 'Data is piped in'"
assert_failure		"printf x | rexreplace 'b' 'pipe' my.file -j 2>&1 | grep 'Data is piped in'"
assert_failure		"printf '' | rexreplace 'o' 'x' my.file 2>&1 | grep 'Data is piped in'"
assert_failure		"printf '\n' | rexreplace 'o' 'x' my.file 2>&1 | grep 'Data is piped in'"
assert_failure		"printf '\r\n' | rexreplace 'o' 'x' my.file 2>&1 | grep 'Data is piped in'"


# RR_VOID_PIPE
reset
assert		 		"printf x | RR_VOID_PIPE=1 rexreplace 'foo' 'pipe' my.file -o --replacement-js 2>&1"    'nullbar'
assert		 		"printf x | RR_VOID_PIPE= rexreplace 'foo' 'pipe' my.file -o --replacement-js"    'xbar'
assert		 		"printf x | RR_VOID_PIPE=1 rexreplace 'foo' 'pipe' my.file -o --replacement-js -T"    'nullbar'
assert		 		"printf x | RR_VOID_PIPE=1 rexreplace 'foo' 'pipe' my.file -o --replacement-js -T 2>&1 >/dev/null"    ' 🟡 The flag --trim-pipe conflicts with the env. var RR_VOID_PIPE as no data will be piped. '
assert		 		"printf x | RR_VOID_PIPE=1 rexreplace 'foo' 'pipe' my.file -o --replacement-js -T -q 2>&1"    'nullbar'
assert		 		"printf x | RR_VOID_PIPE=1 rexreplace 'foo' 'pipe' my.file -o --replacement-js -T -Q 2>&1"    'nullbar'
assert_failure		"printf x | RR_VOID_PIPE=1 rexreplace 'b' _ my.file -R"
assert		 		"printf x | RR_VOID_PIPE=1 rexreplace 'b' _ my.file -R 2>&1 | grep -E 'RR_VOID_PIPE as|No data piped'"    ' 🟡 The flag --replacement-pipe conflicts with the env. var RR_VOID_PIPE as no data will be piped. \n ❌ No data piped into replacement '
assert		 		"printf x | RR_VOID_PIPE=1 rexreplace 'b' _ my.file -R -T 2>&1 | grep -E 'RR_VOID_PIPE as|No data piped'"    ' 🟡 The flag --replacement-pipe conflicts with the env. var RR_VOID_PIPE as no data will be piped. \n 🟡 The flag --trim-pipe conflicts with the env. var RR_VOID_PIPE as no data will be piped. \n ❌ No data piped into replacement '
assert_failure		"printf x | RR_VOID_PIPE=1 rexreplace 'b' _ my.file -R -q"
assert		 		"printf x | RR_VOID_PIPE=1 rexreplace 'b' _ my.file -R -q 2>&1 | grep -v 'exited with code'"    ' ❌ No data piped into replacement '
assert_failure		"printf x | RR_VOID_PIPE=1 rexreplace 'b' _ my.file -R -Q"
assert		 		"printf x | RR_VOID_PIPE=1 rexreplace 'b' _ my.file -R -Q 2>&1 | grep -v 'exited with code'"    ''
assert		 		"cat my.file"    'foobar'


	

# -L
reset
assert		 		"rexreplace 'b' '*+*' my.file -o"    'foo*+*ar'
assert		 		"rexreplace '*+*' 'b' my.file -o --literal"    'foobar'



# -x
reset
					rexreplace 'b' '*+*' my.file
assert		 		"cat my.file"    					'foo*+*ar'
assert		 		"cat your.file"    					'abc123'
reset
					rexreplace 'b' '*+*' '*.file'
assert		 		"cat my.file"    					'foo*+*ar'
assert		 		"cat your.file"    					'a*+*c123'
reset
					rexreplace 'b' '*+*' '*.file' -x y
assert		 		"cat my.file"    					'foobar'
assert		 		"cat your.file"    					'abc123'
reset
					rexreplace 'b' '*+*' '*.file' -x ^y
assert		 		"cat my.file"    					'foo*+*ar'
assert		 		"cat your.file"    					'abc123'
reset
					rexreplace 'b' '*+*' '*.file' -x ^Y
assert		 		"cat my.file"    					'foo*+*ar'
assert		 		"cat your.file"    					'abc123'
reset
					rexreplace 'b' '*+*' '*.file' -x ^Y --void-ignore-case
assert		 		"cat my.file"    					'foo*+*ar'
assert		 		"cat your.file"    					'a*+*c123'


# -X
reset
					rexreplace 'b' '*+*' '*.file' -X '*.file'
assert		 		"cat my.file"    					'foobar'
assert		 		"cat your.file"    					'abc123'
reset
					rexreplace 'b' '*+*' '*.file' -X 'y*'
assert		 		"cat my.file"    					'foo*+*ar'
assert		 		"cat your.file"    					'abc123'










# # -P
# reset
# echo '.€' > pattern.txt
# echo '€' > replacement.txt
# assert		 		"rexreplace 'pattern.txt' 'replacement.txt' my.file -o --pattern-file --replacement-file"    'fooba$'
# rm pattern.txt
# rm replacement.txt

# # Multiply lines in files!
# reset
# echo " . \n € " > pattern.txt
# echo " €\n " > replacement.txt
# assert		 		"rexreplace 'pattern.txt' 'replacement.txt' my.file -o --pattern-file --replacement-file"    'fooba$'
# rm pattern.txt
# rm replacement.txt


# # Singe line file (with space)
# reset
# echo 'fooba r' > my.file
# echo ' .€' > pattern.txt
# echo ' €' > replacement.txt
# assert		 		"rexreplace 'pattern.txt' 'replacement.txt' my.file -o --pattern-file --replacement-file"    'fooba $'
# rm pattern.txt
# rm replacement.txt




# Todo: test -e
# assert		 		"rexreplace ??? ??? my.file -e"    "foobar"
# reset

# Todo: test -q
# assert		 		"rexreplace ??? ??? my.file -q"    "foobar"
# reset

# Todo: test -Q
# assert		 		"rexreplace ??? ??? my.file -Q"    "foobar"
# reset

# Todo: test -d
# assert		 		"rexreplace ??? ??? my.file -d"    "foobar"
# reset

rm my.file
rm your.file

assert_end 			"rexreplace cli"










