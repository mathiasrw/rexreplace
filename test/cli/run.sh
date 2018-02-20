#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

source $DIR/aserta.sh

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
		echo 'Resetting testdata'
        echo 'foobar' > myfile
}



# Plain usage
reset
rexreplace x x myfile
assert		 		"cat myfile "    "foobar"

reset
rexreplace o x myfile
assert		 		"cat myfile"    "fxxbar"

# rr can handle a pattern and replcaement starting with '-'
reset
rexreplace '^(.+)$' '- $1' myfile
rexreplace '- f' '_' myfile
assert		 		"cat myfile"    "_oobar"

# Piped data
reset
assert		 		"cat myfile | rexreplace Foo xxx"    "xxxbar"



# -v
reset
assert_success		"rexreplace -version"


# -h
reset
assert_success		"rexreplace -help"


# -o
reset
assert		 		"rexreplace x x myfile --output"    "foobar"

reset
assert		 		"rexreplace o x myfile --output"    "fxxbar"



# -I
reset
assert		 		"rexreplace Foo xxx myfile -o"    "xxxbar"

reset
assert		 		"rexreplace Foo xxx myfile -o --void-ignore-case"    "foobar"



# -G
reset
assert		 		"rexreplace o x myfile -o --void-global"    "fxobar"


# -O
reset
assert		 		"rexreplace [fb]. _ myfile --output-match"    "fo\\nba"


# -GO
reset
assert		 		"rexreplace [fb]. _ myfile --output-match --voidGlobal"    "fo"



# -M
reset
echo foobar >> myfile
assert		 		"rexreplace '^.' 'x' myfile -o"    "xoobar\nxoobar"

reset
echo foobar >> myfile
assert		 		"rexreplace '^.' 'x' myfile -o --void-multiline"    "xoobar\nfoobar"


# back reference
reset
assert		 		"rexreplace '(f?(o))o(.*)' '\$3\$1\$2' myfile -o"    "barfoo"

reset
assert		 		"rexreplace '(f?(o))o(.*)' '€3€1€2' myfile -o"    "barfoo"


# globs
reset
echo foobar >> my_file
assert		 		"rexreplace o x my*le -o"    "fxxbar\nfxxbar"
rm my_file


# -€
reset
assert		 		"rexreplace '.$' '$' myfile -o"    'fooba$'

reset
assert		 		"rexreplace '.€' '€' myfile -o"    'fooba$'

reset
assert		 		"rexreplace '.€' '€' myfile -o --void-euro"    'foobar'


# -J
reset
assert		 		"rexreplace 'foo' '2+2' myfile -o --replacement-js"    '4bar'

reset
assert		 		"rexreplace 'foo' 'var i = 2; i + 2' myfile -o --replacement-js"    '4bar'

# -j
reset
assert		 		"rexreplace '[fb](.)' '€1.toUpperCase();' myfile -o --replacement-js-dynamic"    'OoAr'

# Access to js variables
reset
assert		 		"printf x | rexreplace '[fb]' '_pipe;' myfile -o --replacement-js"    'xooxar'


# -R
reset
assert		 		"printf x | rexreplace 'b' _ myfile -o --replacement-pipe"    'fooxar'




# # -P
# reset
# echo '.€' > pattern.txt
# echo '€' > replacement.txt
# assert		 		"rexreplace 'pattern.txt' 'replacement.txt' myfile -o --pattern-file --replacement-file"    'fooba$'
# rm pattern.txt
# rm replacement.txt

# # Multiply lines in files!
# reset
# echo " . \n € " > pattern.txt
# echo " €\n " > replacement.txt
# assert		 		"rexreplace 'pattern.txt' 'replacement.txt' myfile -o --pattern-file --replacement-file"    'fooba$'
# rm pattern.txt
# rm replacement.txt


# # Ssinge line file (with space)
# reset
# echo 'fooba r' > myfile
# echo ' .€' > pattern.txt
# echo ' €' > replacement.txt
# assert		 		"rexreplace 'pattern.txt' 'replacement.txt' myfile -o --pattern-file --replacement-file"    'fooba $'
# rm pattern.txt
# rm replacement.txt




# Todo: test -e
# assert		 		"rexreplace ??? ??? myfile -e"    "foobar"
# reset

# Todo: test -q
# assert		 		"rexreplace ??? ??? myfile -q"    "foobar"
# reset

# Todo: test -Q
# assert		 		"rexreplace ??? ??? myfile -Q"    "foobar"
# reset

# Todo: test -H
# assert		 		"rexreplace ??? ??? myfile -H"    "foobar"
# reset

# Todo: test -d
# assert		 		"rexreplace ??? ??? myfile -d"    "foobar"
# reset

rm myfile

assert_end 			"rexreplace"










