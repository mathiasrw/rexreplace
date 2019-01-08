//console.log(rr.exe);

describe(__filename, function() {
	before(function() {
		//	rr.execCMD('echo 123', (x) => console.log);
	});

	after(function() {});
	describe('works with the CLI', function() {
		//	rr.test('x x my.file', 'foobar');

		/*
		
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

*/

		// -o

		rr.test('x x my.file', 'foobar');

		rr.test('o x my.file', 'fxxbar');

		// -E
		rr.test('o x my.file --output --engine RE2', 'fxxbar');

		/*
# -b
reset
rexreplace o x my.file --keep-backup
assert		 		"cat my.file"    "fxxbar"
assert		 		"cat my.file.*"  "foobar"
rm my.file.*


*/

		// # -I

		rr.test('Foo xxx my.file -o', 'xxxbar');
		rr.test('Foo xxx my.file -o --void-ignore-case', 'foobar');
		/*rr.test('', '');
rr.test('', '');
rr.test('', '');
rr.test('', '');
rr.test('', '');
rr.test('', '');
rr.test('', '');

reset
assert		 		"rexreplace "    ""

reset
assert		 		"rexreplace "    ""


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



/*
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
#assert		 		"rexreplace '[fb](.)' '€1.toUpperCase();' my.file -o --replacement-js"    'OoAr'


# Access to js variables
reset
assert		 		"rexreplace 'fo(o)bar' '[!!fs,!!globs,find,text.trim()].join(\":\")' my.file -o --replacement-js --js-full-text"    'true:true:fo(o)bar:foobar'


reset
assert		 		"rexreplace 'foobar' \"['filename:'+filename,'name:'+name,'ext:'+ext,'text:'+text].join(':')\" my.file -o --replacement-js --js-full-text"    'filename:my.file:name:my:ext:.file:text:foobar'


# Content manually testes
# todo: automate test of content
reset
assert		 		"printf foobar | rexreplace 'foobar' '[require, r, fs, globs, find, find_,  cwd, cwd_, now_obj, now, now_, time_obj, time, time_, _, nl].length' -o --replacement-js"    '16'

reset
assert		 		"rexreplace 'foobar' '[require, r, fs, globs, find, find_,  cwd, cwd_, now_obj, now, now_, time_obj, time, time_, bytes, bytes_, size, size_, _, nl, text].length' my.file -o --replacement-js --js-full-text"    '21'

reset
assert		 		"rexreplace 'foobar' '[require, r, fs, globs, find, find_,  cwd, cwd_, now_obj, now, now_, time_obj, time, time_, bytes, bytes_, size, size_, _, nl, file, file_, file_rel, file_rel_, dirpath, dirpath_,dirpath_rel, dirpath_rel_, filename, filename_, name, name_, ext, ext_, mtime, mtime_, mtime_obj, ctime, ctime_, ctime_obj ].length' my.file -o --replacement-js "    '40'

reset
assert		 		"rexreplace 'foobar' '[require, r, fs, globs, find, find_,  cwd, cwd_, now_obj, now, now_, time_obj, time, time_, bytes, bytes_, size, size_, _, nl, file, file_, file_rel, file_rel_, dirpath, dirpath_,dirpath_rel, dirpath_rel_, filename, filename_, name, name_, ext, ext_, mtime, mtime_, mtime_obj, ctime, ctime_, ctime_obj, text].length' my.file -o --replacement-js --js-full-text"    '41'




# same test for when matching each
reset
assert		 		"printf foobar | rexreplace 'foobar' '[€0, require, r, fs, globs, find, find_,  cwd, cwd_, now_obj, now, now_, time_obj, time, time_, _, nl].length' -o --replacement-js"    '17'

reset
assert		 		"rexreplace 'foobar' '[€0, require, r, fs, globs, find, find_,  cwd, cwd_, now_obj, now, now_, time_obj, time, time_, bytes, bytes_, size, size_, _, nl, text].length' my.file -o --replacement-js --js-full-text"    '22'

reset
assert		 		"rexreplace 'foobar' '[€0, require, r, fs, globs, find, find_,  cwd, cwd_, now_obj, now, now_, time_obj, time, time_, bytes, bytes_, size, size_, _, nl, file, file_, file_rel, file_rel_, dirpath, dirpath_,dirpath_rel, dirpath_rel_, filename, filename_, name, name_, ext, ext_, mtime, mtime_, mtime_obj, ctime, ctime_, ctime_obj ].length' my.file -o --replacement-js "    '41'

reset
assert		 		"rexreplace 'foobar' '[€0, require, r, fs, globs, find, find_,  cwd, cwd_, now_obj, now, now_, time_obj, time, time_, bytes, bytes_, size, size_, _, nl, file, file_, file_rel, file_rel_, dirpath, dirpath_,dirpath_rel, dirpath_rel_, filename, filename_, name, name_, ext, ext_, mtime, mtime_, mtime_obj, ctime, ctime_, ctime_obj, text].length' my.file -o --replacement-js --js-full-text"    '42'




# -R
reset
assert		 		"printf x | rexreplace 'b' _ my.file -o --replacement-pipe"    'fooxar'


# -L
reset
assert		 		"printf 'lots((([]))) of special chars' | rr '((([])))' '' -L"	"lots of special chars"



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

# Todo: test -H
# assert		 		"rexreplace ??? ??? my.file -H"    "foobar"
# reset

# Todo: test -d
# assert		 		"rexreplace ??? ??? my.file -d"    "foobar"
# reset

rm my.file

assert_end 			"rexreplace"
		*/
	});
});

// echo a | node -r ts-node/register --inspect src/cli.ts a b

/*





printf abn | node -r ts-node/register --inspect  ./src/cli.ts 'b' _ my.file -o --replacement-pipe -dV






*/
