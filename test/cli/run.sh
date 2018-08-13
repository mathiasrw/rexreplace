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
        echo 'foobar' > my.file
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


# -h
reset
assert_success		"rexreplace -help"


# -o
reset
assert		 		"rexreplace x x my.file --output"    "foobar"

reset
assert		 		"rexreplace o x my.file --output"    "fxxbar"


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


# -j
reset
assert		 		"rexreplace 'foo' '2+2' my.file -o --replacement-js"    '4bar'

reset
assert		 		"rexreplace 'foo' 'var i = 2; i + 2' my.file -o --replacement-js"    '4bar'

reset
assert		 		"rexreplace '[fb](.)' '€1.toUpperCase();' my.file -o --replacement-js"    'OoAr'


# Access to js variables
reset
assert		 		"rexreplace 'fo(o)bar' '[!!fs,!!globs,_find,_text.trim()].join(\":\")' my.file -o --replacement-js"    'true:true:fo(o)bar:foobar'


reset
assert		 		"printf foobar | rexreplace 'foobar' \"['file:'+_file,'path:'+_path,'filename:'+_filename,'name:'+_name,'ext:'+_ext,'text:'+_text].join(':')\" -o --replacement-js"    'file::path::filename::name::ext::text:foobar'


reset
assert		 		"rexreplace 'foobar' \"['filename:'+_filename,'name:'+_name,'ext:'+_ext,'text:'+_text].join(':')\" my.file -o --replacement-js"    'filename:my.file:name:my:ext:.file:text:foobar'


# -R
reset
assert		 		"printf x | rexreplace 'b' _ my.file -o --replacement-pipe"    'fooxar'




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


# # Ssinge line file (with space)
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

# Todo: test -H
# assert		 		"rexreplace ??? ??? my.file -H"    "foobar"
# reset

# Todo: test -d
# assert		 		"rexreplace ??? ??? my.file -d"    "foobar"
# reset

rm my.file

assert_end 			"rexreplace"










