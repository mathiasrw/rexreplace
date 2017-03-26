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
        echo 'foobar' > myfile
}

# Plain usage
reset
rexreplace x x myfile
assert		 		"cat myfile "    "foobar"

reset
rexreplace o x myfile
assert		 		"cat myfile"    "fxxbar"


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


# # -P
# # -R
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










