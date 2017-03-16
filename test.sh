#!/usr/bin/env bash

source aserta.sh

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


reset
assert_success		"rexreplace -version"

reset
assert_success		"rexreplace -help"

reset
rexreplace x x myfile -Q
assert		 		"cat myfile "    "foobar"

reset
rexreplace o x myfile -Q
assert		 		"cat myfile"    "fxxbar"

reset
assert		 		"rexreplace x x myfile --output"    "foobar"

reset
assert		 		"rexreplace o x myfile --output"    "fxxbar"

reset
assert		 		"rexreplace '.€' € myfile -o --eurodollar"    'fooba$'

reset
assert		 		"rexreplace '.€' € myfile -o -€"    'fooba$'

reset
assert		 		"rexreplace '(f?(o))o(.*)' '\$3\$1\$2' myfile -o"    "barfoo"

reset
assert		 		"rexreplace Foo xxx myfile -o"    "xxxbar"

reset
assert		 		"rexreplace Foo xxx myfile -o --void-ignore-case"    "foobar"

reset
echo foobar >> myfile
assert		 		"rexreplace '^.' 'x' myfile -o"    "xoobar\nxoobar"

reset
echo foobar >> myfile
assert		 		"rexreplace '^.' 'x' myfile -o --void-multiline"    "xoobar\nfoobar"

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

reset

assert_end 			"rexreplace"










