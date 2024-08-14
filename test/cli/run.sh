#!/usr/bin/env bash

#rexreplace() {
  # node dist/env/node.js "$@"
  #npx node-ts src/env/node.ts "$@"
  # npx ts-node src/env/node.ts "$@"
  # bun src/env/bun.ts "$@"
#}

echo RexReplace v$(rexreplace -v)
# where rexreplace

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

export STOP=1
#export DEBUG=1
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

counter=0

reset() {
		counter=$((counter + 1))
		echo "$counter: Reset test data"
        echo 'foobar' > my.file
        echo 'abc123' > your.file
		echo -n > stdout.log
		echo -n > stderr.log
}



echo
echo '>' Plain
reset
rexreplace x x my.file
assert		 		"cat my.file"    "foobar"


reset
rr x x my.file
assert		 		"cat my.file"    "foobar"


reset
rexreplace o x my.file
assert		 		"cat my.file"    "fxxbar"


reset
rexreplace "b" "\n" my.file
assert		 		"cat my.file"    "foo\nar"




echo
echo '>' rr can handle a pattern and replcaement starting with '-'
reset
rexreplace '^(.+)$' '- $1' my.file
rexreplace '- f' '_' my.file
assert		 		"cat my.file"    "_oobar"




echo
echo '>' Piped data
reset
assert		 		"cat my.file | rexreplace foo xxx"    "xxxbar"




echo
echo '>' --version
reset
assert_success		"rexreplace -version"
assert_success		"rexreplace --version"
assert_success		"rexreplace -v"




echo
echo '>' --help
reset
assert_success		"rexreplace -help"
assert_success		"rexreplace --help"
assert_success		"rexreplace -h"




echo
echo '>' --output
reset
assert		 		"rexreplace x x my.file --output --verbose --debug"	"foobar"
assert		 		"rexreplace x x my.file -o"   		"foobar"


reset
assert		 		"rexreplace o x my.file --output"	"fxxbar"


reset 
assert 				"rexreplace 'b' '*+*' my.file -o" 	'foo*+*ar'




echo
echo '>' --output to pipe output
reset
rexreplace o x my.file --output > stdout.log 2> stderr.log
assert		 		"cat my.file"   		"foobar"
assert		 		"cat stdout.log"    	"fxxbar"
assert		 		"cat stderr.log"    	""


reset
rexreplace o x my.file --output --verbose > stdout.log 2> stderr.log
assert		 		"cat my.file"   		"foobar"
assert		 		"cat stdout.log"    	"fxxbar"
assert		 		"cat stderr.log"    	"my.file"


reset
rexreplace o x my.file > stdout.log 2> stderr.log
assert		 		"cat my.file"   		"fxxbar"
assert		 		"cat stdout.log"    	"my.file"
assert		 		"cat stderr.log"    	""




echo
echo '>' --engine
#reset
# assert		 		"rexreplace o x my.file --output --engine RE2"    "fxxbar"		# RE2	 depricated


reset
assert		 		"rexreplace o x my.file --output --engine V8"    "fxxbar"


reset
assert		 		"rexreplace o x my.file --output -E V8"    "fxxbar"


reset
assert_failure		 "rexreplace o x my.file --output -E xxxyyyzzz" 




echo
echo '>' --keep-backup
reset
rexreplace o x my.file --keep-backup
assert		 		"cat my.file"    "fxxbar"
assert		 		"cat my.file.*"  "foobar"
rm my.file.*


reset
rexreplace o x my.file -b
assert		 		"cat my.file"    "fxxbar"
assert		 		"cat my.file.*"  "foobar"
rm my.file.*




echo
echo '>' --void-ignore-case
reset
assert		 		"rexreplace Foo xxx my.file -o"    "xxxbar"


reset
assert		 		"rexreplace Foo xxx my.file -o --void-ignore-case"    "foobar"


reset
assert		 		"rexreplace Foo xxx my.file -o --I"    "foobar"




echo
echo '>' --void-global
reset
assert		 		"rexreplace o x my.file -o "    			 "fxxbar"


reset
assert		 		"rexreplace o x my.file -o --void-global"    "fxobar"


reset
assert		 		"rexreplace o x my.file -o -G"    			 "fxobar"




echo
echo '>' --output-match
reset
assert		 		"rexreplace [fb]. _ my.file --output-match"    "fo\\nba"


reset
assert		 		"rexreplace [fb]. _ my.file -O"    "fo\\nba"


reset
assert		 		"rexreplace '([fb](.))' _ my.file --output-match"    "foo\\nbaa"




echo
echo ": Combine multiple flags (-GO)"
reset
assert		 		"rexreplace [fb]. _ my.file --output-match --voidGlobal"    "fo"


reset
assert		 		"rexreplace [fb]. _ my.file -GO"    "fo"




echo
echo '>' --dot-all
reset
echo foobar >> my.file
assert		 		"rexreplace ar.foo _ my.file -o --dot-all "    "foob_bar"


reset
echo foobar >> my.file
assert		 		"rexreplace ar.foo _ my.file -o -s"    "foob_bar"




echo
echo '>' --void-multiline
reset
echo foobar >> my.file
assert		 		"rexreplace '^.' 'x' my.file -o"    "xoobar\nxoobar"


reset
echo foobar >> my.file
assert		 		"rexreplace '^.' 'x' my.file -o --void-multiline"    "xoobar\nfoobar"


reset
echo foobar >> my.file
assert		 		"rexreplace '^.' 'x' my.file -o"    	"xoobar\nxoobar"
echo foobar >> my.file
assert		 		"rexreplace '^.' 'x' my.file -o -M"		"xoobar\nfoobar"




echo Reference groups in replcaement
reset
assert		 		"rexreplace '(f?(o))o(.*)' '\$3\$1\$2' my.file -o"    "barfoo"


reset
assert		 		"rexreplace '(f?(o))o(.*)' '€3€1€2' my.file -o"    "barfoo"




echo
echo '>' Globs
reset
					echo foobar > my_file
assert		 		"rexreplace o x my*file -o"    "fxxbar\nfxxbar"
assert		 		"cat my.file"    "foobar"
rm my_file




echo
echo '>' --void-euro
reset
assert		 		"rexreplace '.$' '$' my.file -o"    'fooba$'


reset
assert		 		"rexreplace '.€' '€' my.file -o"    'fooba$'


reset
assert		 		"rexreplace '.€' '€' my.file -o --void-euro"    'foobar'


reset
assert		 		"rexreplace '.€' '€' my.file -o -€"    'foobar'




echo
echo '>' --void-section
reset
echo foo[bar] > my.file
assert		 		"rexreplace '[\]]' '[' my.file -o"    'foo[bar['


reset
echo foo[bar] > my.file
assert		 		"rexreplace '[§]]' '[' my.file -o"    'foo[bar['


reset
echo foo[bar] > my.file
assert		 		"rexreplace '[§]]' '[' my.file -o --void-section"    'foo[bar]'


reset
echo foo[bar] > my.file
assert		 		"rexreplace '[§]]' '[' my.file -o -§"    'foo[bar]'




echo
echo '>' --replacement-js
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

echo
echo '>' require from JS
reset
echo '{versions:999, version:'v1.2.3'}' > my.json
assert "echo VERSION | rexreplace 'VERSION' 'require(`my.json`).version' -j" "v1.2.3"
assert "echo VERSION | rr 'VERSION' 'r(`my.json`).version' -j" "v1.2.3"
rm my.json



echo
echo '>' Access to js variables
reset
assert		 		"rexreplace 'fo(o)bar' '[!!fs,!!globs,find,text.trim()].join(\":\")' my.file -o --replacement-js"    'true:true:fo(o)bar:foobar'


reset
assert		 		"printf foobar | rexreplace 'foobar' \"['file:'+file,'dirpath:'+dirpath,'filename:'+filename,'name:'+name,'ext:'+ext,'text:'+text].join('|')\" -o --replacement-js"    'file:❌|dirpath:❌|filename:❌|name:❌|ext:❌|text:foobar'


reset
assert		 		"rexreplace 'foobar' \"['filename:'+filename,'name:'+name,'ext:'+ext,'text:'+text].join('|')\" my.file -o --replacement-js"    'filename:my.file|name:my|ext:.file|text:foobar'


reset
assert		 		"rexreplace 'foo((b)ar)' '€1+€2' my.file -o --replacement-js"    'barb'




echo
echo '>' Content manually testes 
# todo: automate test of content
reset
assert		 		"rexreplace 'foobar' '[require, fs, globs, path, pipe, pipe_, find, find_, text, text_, file, file_, file_rel, file_rel_, dirpath, dirpath_, dirpath_rel, dirpath_rel_, dirname, dirname_, filename, filename_, name, name_, ext, ext_, cwd, cwd_, now, now_, time_obj, time, time_, mtime_obj, mtime, mtime_, ctime_obj, ctime, ctime_, bytes, bytes_, size, size_, _].length' my.file -o --replacement-js"    '44'




echo '>' --replacement-pipe
reset
assert		 		"printf x | rexreplace 'b' _ my.file -o --replacement-pipe"    'fooxar'


reset
assert		 		"printf x | rexreplace 'b' _ my.file -o -R"    'fooxar'

	


echo
echo '>' --literal
reset
assert		 		"rexreplace 'b' '*+*' my.file -o"    		'foo*+*ar'
assert		 		"rexreplace '*+*' 'b' my.file -o --literal"	'foobar'


reset
					rexreplace 'b' '*+*' my.file 
assert		 		"cat my.file"    							'foo*+*ar'
assert		 		"rexreplace '*+*' 'b' my.file -o -L"    	'foobar'




echo
echo '>' --exclude-re
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
assert		 		"cat my.file"    					'foo*+*ar'
assert		 		"cat your.file"    					'abc123'


reset
					rexreplace 'b' '*+*' '*.file' -x ^y
assert		 		"cat my.file"    					'foo*+*ar'
assert		 		"cat your.file"    					'abc123'


reset
					rexreplace 'b' '*+*' '*.file' --exclude-re ^y
assert		 		"cat my.file"    					'foo*+*ar'
assert		 		"cat your.file"    					'abc123'


reset
					rexreplace 'b' '*+*' '*.file' -x=^y
assert		 		"cat my.file"    					'foo*+*ar'
assert		 		"cat your.file"    					'abc123'


reset
					rexreplace 'b' '*+*' '*.file' --exclude-re=^y
assert		 		"cat my.file"    					'foo*+*ar'
assert		 		"cat your.file"    					'abc123'




echo
echo '>' --exclude-glob
reset
					rexreplace 'b' '*+*' '*.file' -X '*.file'
assert		 		"cat my.file"    					'foobar'
assert		 		"cat your.file"    					'abc123'


reset
					rexreplace 'b' '*+*' '*.file' -X 'y*'
assert		 		"cat my.file"    					'foo*+*ar'
assert		 		"cat your.file"    					'abc123'


reset
					rexreplace 'b' '*+*' '*.file' -X='y*'
assert		 		"cat my.file"    					'foo*+*ar'
assert		 		"cat your.file"    					'abc123'


reset
					rexreplace 'b' '*+*' '*.file' --exclude-glob '*.file'
assert		 		"cat my.file"    					'foobar'
assert		 		"cat your.file"    					'abc123'


reset
					rexreplace 'b' '*+*' '*.file' --exclude-glob 'y*'
assert		 		"cat my.file"    					'foo*+*ar'
assert		 		"cat your.file"    					'abc123'




echo
echo '>' --simulate 
reset
					rexreplace 'b' '_' 'my.file' -S &> 'your.file'
assert				"cat your.file"    'my.file'
assert		 		"cat 'my.file'"    'foobar'


reset
					rexreplace 'b' '_' 'my.file' --simulate &> 'your.file'
assert				"cat your.file"    'my.file'
assert		 		"cat 'my.file'"    'foobar'




echo
echo
echo "# Edge Cases"




echo
echo '>' Invalid File Paths
reset 
rexreplace 'foo' 'bar' invalidfile.md -o > stdout.log 2>stderr.log
assert 					"cat stdout.log" 		""
assert_startswith 		"cat stderr.log" 		"0 files found"




echo
echo '>' Illegal Regex

reset 
assert_failure	"rexreplace '*foo' 'bar' my.file"



# non existent flag
# missspelled flag
# Multiple Files in 1 glob
# Multiple globs
# Multiple globs picking up the same file 




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
# assert		 		"rexreplace ??? ??? my.file -q"    ""
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

reset
rm my.file
rm your.file
rm stdout.log
rm stderr.log


assert_end 			"rexreplace"










