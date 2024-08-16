// Each test will start with "foobar" in my.file and 'abc123' in your.file
// See setup.ts for details of global includes

// @ts-ignore
import {expect, test, describe} from 'bun:test';

import {cat, run, testPrep, reset} from '../setup.ts';

testPrep();

describe('Basic use', () => {
	test('Replace x with x', () => {
		run(`rexreplace x x my.file`);
		expect(cat('my.file')).toBe('foobar');
	});

	test('Replace o with x', () => {
		run(`rexreplace o x my.file`);
		expect(cat('my.file')).toBe('fxxbar');
	});

	test('Replace b with newline', () => {
		run(`rexreplace b \\\\n my.file`);
		expect(cat('my.file')).toBe('foo\nar');
	});

	test('Replace start of line with - and then modify', () => {
		run(`rexreplace '^(.+)$' '- $1' my.file`);
		run(`rexreplace '- f' '_' my.file`);
		expect(cat('my.file')).toBe('_oobar');
	});

	test('Pipe data', () => {
		expect(run(`cat my.file | rexreplace foo xxx`)).toBe('xxxbar');
	});

	test('-v --version', () => {
		expect(run(`rexreplace -version`)).toMatch(/PACKAGE_VERSION|\d/);
	});

	test('-h --help', () => {
		expect(run(`rexreplace -help`)).toContain('rexreplace');
	});

	describe('Back references', () => {
		test('Use numbered back references', () => {
			expect(run(`rexreplace '(f?(o))o(.*)' '\$3\$1\$2' my.file -o`)).toBe('barfoo');
		});

		test('Use euro symbol for back references', () => {
			expect(run(`rexreplace '(f?(o))o(.*)' '€3€1€2' my.file -o`)).toBe('barfoo');
		});
	});

	describe.todo('Handle globs', () => {
		test('Apply replacement to multiple files', () => {
			console.log({my: cat('my.file')});
			run(`echo foobar > my_file`);
			console.log({
				my: cat('my.file'),
				my_: cat('my_file'),
				rr: run(`rexreplace o x 'my*file' -o`),
			});

			run(`rexreplace o x 'my*file'`);
			expect(run(`cat my.file my_file`)).toBe('fxxbar\nfxxbar');
			run(`rm my_file`);
		});
	});
});

describe('-o --output', () => {
	test('Output flag with no change', () => {
		expect(run(`rexreplace x x my.file --output`)).toBe('foobar');
	});

	test('Output flag with replacement', () => {
		expect(run(`rexreplace o x my.file --output`)).toBe('fxxbar');
	});
});

describe('-E --engine', () => {
	test('Use V8 engine', () => {
		expect(run(`rexreplace o x my.file --output --engine V8`)).toBe('fxxbar');
	});
});

describe('-b --keep-backup', () => {
	test('Keep backup when replacing', () => {
		run(`rexreplace o x my.file --keep-backup`);
		expect(run(`cat my.file`)).toBe('fxxbar');
		expect(run(`cat my.file.*`)).toBe('foobar');
		run(`rm my.file.*`);
	});
});

describe('-I --void-ignore-case', () => {
	test('Default: Case-sensitive replacement', () => {
		expect(run(`rexreplace Foo xxx my.file -o`)).toBe('xxxbar');
	});

	test('Case-insensitive replacement', () => {
		expect(run(`rexreplace Foo xxx my.file -o --void-ignore-case`)).toBe('foobar');
	});
});

describe('-G --void-global', () => {
	test('Default: Replace all occurrences', () => {
		expect(run(`rexreplace o x my.file -o`)).toBe('fxxbar');
	});

	test('Replace only first occurrence', () => {
		expect(run(`rexreplace o x my.file -o --void-global`)).toBe('fxobar');
	});
});

describe('-m --output-match', () => {
	test('Output matching parts', () => {
		expect(run(`rexreplace '[fb].' _ my.file --output-match`)).toBe('fo\nba');
	});

	test('Output first matching part only', () => {
		expect(run(`rexreplace '[fb].' _ my.file --output-match --voidGlobal`)).toBe('fo');
	});
});

describe('-s --dot-all', () => {
	test('Dot matches newline', () => {
		run(`echo foobar > my.file`);
		run(`echo foobar >> my.file`);
		expect(run(`rexreplace 'ar.foo' _ my.file -o --dot-all`)).toBe('foob_bar');
	});
});

describe('-M --void-multiline', () => {
	test('Default: Multiline enabled', () => {
		run(`echo foobar > my.file`);
		run(`echo foobar >> my.file`);
		expect(run(`rexreplace '^.' 'x' my.file -o`)).toBe('xoobar\nxoobar');
	});

	test('Multiline disabled', () => {
		run(`echo foobar > my.file`);
		run(`echo foobar >> my.file`);
		expect(run(`rexreplace '^.' 'x' my.file -o --void-multiline`)).toBe('xoobar\nfoobar');
	});
});

describe('-€ --void-euro', () => {
	test('Default: Treat euro as dollar', () => {
		expect(run(`rexreplace '.$' '€' my.file -o`)).toBe('fooba$');
	});

	test('Disable euro as dollar', () => {
		expect(run(`rexreplace '.€' '€' my.file -o --void-euro`)).toBe('foobar');
	});
});

describe('-§ --void-section', () => {
	test('Default: Treat section as escape', () => {
		run(`echo 'foo[bar]' > my.file`);
		expect(run(`rexreplace '[§]]' '[' my.file -o`)).toBe('foo[bar[');
	});

	test('Disable section as escape', () => {
		run(`echo 'foo[bar]' > my.file`);
		expect(run(`rexreplace '[§]]' '[' my.file -o --void-section`)).toBe('foo[bar]');
	});
});

describe('-j --replacement-js', () => {
	test('Use JavaScript expression in replacement', () => {
		expect(run(`rexreplace 'foo' '2+2' my.file -o --replacement-js`)).toBe('4bar');
	});

	test('Use JavaScript statement in replacement', () => {
		expect(run(`rexreplace 'foo' 'var i = 2; i + 2' my.file -o --replacement-js`)).toBe('4bar');
	});
});

describe('-R --replacement-pipe', () => {
	test('Example', () => {
		expect(run(`printf x | rexreplace 'b' _ my.file -o --replacement-pipe`)).toBe('fooxar');
	});
});

describe('-L --literal', () => {
	test('Treat special characters in replacement as regular chars', () => {
		run(`rexreplace 'b' '*+*' my.file`);
		expect(cat('my.file')).toBe('foo*+*ar');
		run(`rexreplace 'b' '*+*' my.file`);
		expect(run(`rexreplace '*+*' 'z' my.file -o --literal`)).toBe('foozar');
	});
});

describe('-x --exclude-re', () => {
	test('Exclude files via regex', () => {
		run(`rexreplace 'b' '*+*' 'my.file'`);
		expect(cat('my.file')).toBe('foo*+*ar');
		expect(cat('your.file')).toBe('abc123');
		reset();

		run(`rexreplace 'b' '*+*' '*.file'`);
		expect(cat('my.file')).toBe('foo*+*ar');
		expect(cat('your.file')).toBe('a*+*c123');
		reset();

		run(`rexreplace 'b' '*+*' '*.file -x y'`); // both files got a 'y' in the name
		expect(cat('my.file')).toBe('foobar');
		expect(cat('your.file')).toBe('abc123');
		reset();

		run(`rexreplace 'b' '*+*' '*.file' -x ^y`); // only one starts with a 'y'
		expect(cat('my.file')).toBe('foo*+*ar');
		expect(cat('your.file')).toBe('abc123');
	});
});

describe('-X --exclude-glob', () => {
	test('Exclude files via glob', () => {
		run(`rexreplace 'b' '*+*' '*.file' -X '*.file'`);
		expect(cat('my.file')).toBe('foobar');
		expect(cat('your.file')).toBe('abc123');
		reset();

		run(`rexreplace 'b' '*+*' '*.file' -X 'y*'`);
		expect(cat('my.file')).toBe('foo*+*ar');
		expect(cat('your.file')).toBe('abc123');
	});
});

describe('-V --verbose', () => {
	test('Verbose output includes file name', () => {
		expect(run(`rexreplace o x my.file -V 2>&1 echo`)).toContain('my.file');
	});
});

describe('-q --quiet', () => {
	test('Quiet mode only outputs errors', () => {
		expect(run(`rexreplace o x my.file -q`)).toBe('');
	});
});

describe('-Q --quiet-total', () => {
	test('Works as expected (note: not a real test of functionality)', () => {
		expect(run(`rexreplace o x my.file -Q`)).toBe('');
	});
});

describe('-H --halt', () => {
	test('Works as expected (note: not a real test of functionality)', () => {
		expect(() => run(`rexreplace o x my.file -H`)).not.toThrow();
	});
});

describe('-d --debug', () => {
	test('Debug mode outputs expected information', () => {
		expect(run(`rexreplace o x my.file -d 2>&1 echo`)).toContain('Work on content from');
	});
});

describe('-A --void-', () => {
	test('Works as expected (note: not a real test of functionality)', () => {
		expect(() => run(`rexreplace o x my.file -A`)).not.toThrow();
	});
});

describe('-B --void-backup', () => {
	test('Works as expected (note: not a real test of functionality)', () => {
		expect(() => run(`rexreplace o x my.file -B`)).not.toThrow();
	});
});

describe('-T --trim-pipe', () => {
	test('Trims piped data', () => {
		expect(run(`echo "  foobar  " | rexreplace o x -T`)).toBe('fxxbar');
	});

	test('Trims piped replacement', () => {
		expect(run(`echo "  xxx  " | rexreplace b _ my.file -o -R -T`)).toBe('fooxxxar');
	});
});

describe('-u --unicode', () => {
	test('Handles unicode patterns', () => {
		run(`echo "foo🍎bar" > unicode.file`);
		expect(run(`rexreplace 🍎 🍊 unicode.file -o -u`)).toBe('foo🍊bar');
	});
});

describe('-e --encoding', () => {
	test('Handles specified encoding', () => {
		expect(run(`rexreplace o x my.file -o -e utf8`)).toBe('fxxbar');
	});
});
