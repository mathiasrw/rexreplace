// Each test will start with "foobar" in my.file and 'abc123' in your.file
// See setup.ts for details of global includes

// @ts-ignore
import {expect, test, describe, beforeEach, afterAll} from 'bun:test';
// @ts-ignore
import Bun from 'bun';
import {unlinkSync} from 'node:fs';

const myFile = 'my.file';
const yourFile = 'your.file';
const my_file = 'my_file';

const my = Bun.file(myFile);
const your = Bun.file(yourFile);
const my_ = Bun.file(my_file);

//Bun.write(my, 'meeega');
//console.log(await my.text());

// @ts-ignore
import runtime from '../../src/env/bun.runtime.ts';

// @ts-ignore
import {cli2conf, executeReplacement} from '../../src/cli.ts';

async function reset() {
	await Bun.write(my, 'foobar');
	await Bun.write(my_, 'foobar');
	await Bun.write(your, 'abc123');
}

function cleanup() {
	[myFile, my_file, yourFile].forEach(file => unlinkSync(file));
}

beforeEach(async () => {
	reset();
});

afterAll(() => {
	cleanup();
});
let stdout = '';
let stderr = '';

// Create a function that appends the logged message to the output strings
function captureLog(...args: any[]): void {
	stdout +=
		args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ') + '\n';
}

function captureError(...args: any[]): void {
	stderr +=
		args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ') + '\n';
}

// Replace the console.log and console.error with your capture functions
const runtime_ = {
	...runtime,
	logInfo: captureLog,
	logWarn: captureError,
	logErr: captureError,
};

function rr(args: any[], pipeData?: string): string {
	stdout = '';
	stderr = '';
	const conf = cli2conf(runtime_, args);
	executeReplacement(runtime_, conf, pipeData);
	return stdout;
}

describe('Basic use', () => {
	test('Replace x with x', async () => {
		rr(['x', 'x', myFile]);
		expect(await my.text()).toBe('foobar');
	});

	test('Replace o with x', async () => {
		rr(['o', 'x', myFile]);
		expect(await my.text()).toBe('fxxbar');
	});

	test('Replace b with newline', async () => {
		rr(['b', '\\n', myFile]);
		expect(await my.text()).toBe('foo\nar');
	});

	test('Replace start of line with - and then modify', async () => {
		rr(['^(.+)$', '- $1', myFile]);
		rr(['- f', '_', myFile]);
		expect(await my.text()).toBe('_oobar');
	});

	test('Pipe data', () => {
		expect(rr(['foo', 'xxx'], 'foobar')).toBe('xxxbar');
	});

	test('-v --version', () => {
		expect(rr(['-version'])).toMatch(/PACKAGE_VERSION|\d/);
	});

	test('-h --help', () => {
		expect(rr(['-help'])).toContain('rexreplace');
	});

	describe('Back references', () => {
		test('Use numbered back references', () => {
			expect(rr(['(f?(o))o(.*)', '$3$1$2', myFile, '-o', '--voidAsync'])).toBe('barfoo');
		});

		test('Use euro symbol for back references', () => {
			expect(rr(['(f?(o))o(.*)', '€3€1€2', myFile, '-o'])).toBe('barfoo');
		});
	});

	describe.todo('Handle globs', () => {
		test('Apply replacement to multiple files', async () => {
			rr(['o', 'x', 'my*file']);
			expect(await my.text()).toBe('fxxbar');
			expect(await my_.text()).toBe('fxxbar');
		});
	});
});

describe('-o --output', () => {
	test('Output flag with no change', async () => {
		expect(rr(['x', 'x', myFile, '--output'])).toBe('foobar');
		expect(await my.text()).toBe('foobar');
	});

	test('Output flag with replacement', async () => {
		expect(rr(['o', 'x', myFile, '--output'])).toBe('fxxbar');
		expect(await my.text()).toBe('foobar');
	});
});

describe('-E --engine', () => {
	test('Use V8 engine', () => {
		expect(rr(['o', 'x', myFile, '--output', '--engine', 'V8'])).toBe('fxxbar');
	});
});

describe('-b --keep-backup', () => {
	test('Keep backup when replacing', async () => {
		await Bun.$`${{raw: 'rm my.file.*'}}`;
		const fileDotStar = parseInt(await Bun.$`ls *.file.* | wc -l`.nothrow().text());
		rr(['o', 'x', myFile, '--keep-backup']);
		expect(parseInt(await Bun.$`ls *.file.* | wc -l`.nothrow().text())).toBe(fileDotStar + 1);
		expect(await Bun.$`cat ${myFile}`.text()).toBe('fxxbar');
		expect(await Bun.$`cat ${myFile}.*`.text()).toBe('foobar');
		await Bun.$`${{raw: 'rm my.file.*'}}`;
	});
});

describe('-I --void-ignore-case', () => {
	test('Default: Case-sensitive replacement', () => {
		expect(rr(['Foo', 'xxx', myFile, '-o'])).toBe('xxxbar');
	});

	test('Case-insensitive replacement', () => {
		expect(rr(['Foo', 'xxx', myFile, '-o', '--void-ignore-case'])).toBe('foobar');
	});
});

describe('-G --void-global', () => {
	test('Default: Replace all occurrences', () => {
		expect(rr(['o', 'x', myFile, '-o'])).toBe('fxxbar');
	});

	test('Replace only first occurrence', () => {
		expect(rr(['o', 'x', myFile, '-o', '--void-global'])).toBe('fxobar');
	});
});

describe('-m --output-match', () => {
	test('Output matching parts', () => {
		expect(rr(['[fb].', '_', myFile, '--output-match'])).toBe('fo\nba');
	});

	test('Output first matching part only', () => {
		expect(rr(['[fb].', '_', myFile, '--output-match', '--voidGlobal'])).toBe('fo');
	});
});

describe('-s --dot-all', () => {
	test('Dot matches newline', async () => {
		await Bun.write(my, 'foobar\nfoobar');
		expect(rr(['ar.foo', '_', myFile, '-o', '--dot-all'])).toBe('foob_bar');
	});
});

describe('-M --void-multiline', () => {
	test('Default: Multiline enabled', async () => {
		await Bun.write(my, 'foobar\nfoobar');
		rr(['^.', 'x', myFile]);
		expect(await my.text()).toBe('xoobar\nxoobar');
	});

	test('Multiline disabled', async () => {
		await Bun.write(my, 'foobar\nfoobar');
		rr(['^.', 'x', myFile, '--void-multiline']);
		expect(await my.text()).toBe('xoobar\nfoobar');
	});
});

describe('-€ --void-euro', () => {
	test('Default: Treat euro as dollar', () => {
		expect(rr(['.$', '€', myFile, '-o'])).toBe('fooba$');
	});

	test('Disable euro as dollar', () => {
		expect(rr(['.€', '€', myFile, '-o', '--void-euro'])).toBe('foobar');
	});
});

describe('-§ --void-section', () => {
	test('Default: Treat section as escape', async () => {
		await Bun.write(my, 'foo[bar]');

		expect(rr(['[§]]', '[', myFile, '-o'])).toBe('foo[bar[');

		rr(['[§]]', '[', myFile]);
		expect(await my.text()).toBe('foo[bar[');
	});

	test('Disable section as escape', async () => {
		await Bun.write(my, 'foo[bar]');

		expect(rr(['[§]]', '[', myFile, '-o', '--void-section'])).toBe('foo[bar]');

		rr(['[§]]', '[', myFile, '--void-section']);
		expect(await my.text()).toBe('foo[bar]');
	});
});

describe('-j --replacement-js', () => {
	test('Use JavaScript expression in replacement', () => {
		expect(rr(['foo', '2+2', myFile, '-o', '--replacement-js'])).toBe('4bar');
	});

	test('Use JavaScript statement in replacement', () => {
		expect(rr(['foo', 'var i = 2; i + 2', myFile, '-o', '--replacement-js'])).toBe('4bar');
	});
});

describe('-R --replacement-pipe', () => {
	test('Example', async () => {
		expect(rr(['b', '_', myFile, '-o', '--replacement-pipe', 'x'])).toBe('fooxar');

		rr(['b', '_', myFile, '-o', '--replacement-pipe', 'x']);
		expect(await my.text()).toBe('fooxar');
	});
});

describe('-L --literal', () => {
	test('Treat special characters in replacement as regular chars', async () => {
		rr(['b', '[z]', myFile]);
		expect(await my.text()).toBe('foo[z]ar');

		rr(['[z]', '_', myFile]); // only changing the actual character
		expect(await my.text()).toBe('foo[_]ar');

		rr(['[_]', 'b', myFile, '--literal']); // Replacing the full literal string
		expect(await my.text()).toBe('foobar');
	});

	test.todo('One expect per regex special character', async () => {});
});

describe('-x --exclude-re', () => {
	test('Exclude files via regex', async () => {
		rr(['b', '*+*', myFile]);
		expect(await my.text()).toBe('foo*+*ar');
		expect(await your.text()).toBe('abc123');

		reset();
		rr(['b', '*+*', '*.file']);
		expect(await my.text()).toBe('foo*+*ar');
		expect(await your.text()).toBe('a*+*c123');

		reset();
		rr(['b', '*+*', '*.file', '-x', 'y']); // both files got a 'y' in the name
		expect(await my.text()).toBe('foobar');
		expect(await your.text()).toBe('abc123');

		reset();
		rr(['b', '*+*', '*.file', '-x', '^y']); // only one starts with a 'y'
		expect(await my.text()).toBe('foo*+*ar');
		expect(await your.text()).toBe('abc123');
	});
});

describe('-X --exclude-glob', () => {
	test('Exclude files via glob', async () => {
		rr(['b', '*+*', '*.file', '-X', '*.file']);
		expect(await my.text()).toBe('foobar');
		expect(await your.text()).toBe('abc123');
		reset();

		rr(['b', '*+*', '*.file', '-X', 'y*']);
		expect(await my.text()).toBe('foo*+*ar');
		expect(await your.text()).toBe('abc123');
	});
});

describe('-V --verbose', () => {
	test('Verbose output includes file name', () => {
		expect(rr(['o', 'x', myFile, '-V', '2>&1', 'echo'])).toContain(myFile);
	});
});

describe('-q --quiet', () => {
	test('Quiet mode only outputs errors', () => {
		expect(rr(['o', 'x', myFile, '-q'])).toBe('');
	});
});

describe('-Q --quiet-total', () => {
	test('Works as expected (note: not a real test of functionality)', () => {
		expect(rr(['o', 'x', myFile, '-Q'])).toBe('');
	});
});

describe('-H --halt', () => {
	test('Works as expected (note: not a real test of functionality)', () => {
		expect(() => rr(['o', 'x', myFile, '-H'])).not.toThrow();
	});
});

describe('-d --debug', () => {
	test('Debug mode outputs expected information', () => {
		expect(rr(['o', 'x', myFile, '-d', '2>&1', 'echo'])).toContain('Work on content from');
	});
});

describe('-A --void-', () => {
	test('Works as expected (note: not a real test of functionality)', () => {
		expect(() => rr(['o', 'x', myFile, '-A'])).not.toThrow();
	});
});

describe('-B --void-backup', () => {
	test('Works as expected (note: not a real test of functionality)', () => {
		expect(() => rr(['o', 'x', myFile, '-B'])).not.toThrow();
	});
});

describe('-T --trim-pipe', () => {
	test('Trims piped data', () => {
		expect(rr(['o', 'x', '-T'], '  foobar  ')).toBe('fxxbar');
	});

	test('Trims piped replacement', async () => {
		expect(rr(['b', '_', myFile, '-o', '-R', '-T'], '  xxx  ')).toBe('fooxxxar');
		expect(await my.text()).toBe('foobar');

		rr(['b', '_', myFile, '-R', '-T'], '  xxx  ');
		expect(await my.text()).toBe('fooxxxar');
	});
});

describe('-u --unicode', () => {
	test('Handles unicode patterns', async () => {
		Bun.write(my, 'foo🍎bar');
		expect(rr(['🍎', '🍊', myFile, '-o', '-u'])).toBe('foo🍊bar');
		rr(['🍎', '🍊', myFile, '-o', '-u']);
		expect(await my.text()).toBe('foo🍊bar');
	});
});

describe('-e --encoding', () => {
	test('Handles specified encoding', () => {
		expect(rr(['o', 'x', myFile, '-o', '-e', 'utf8'])).toBe('fxxbar');
	});
});
