// https://github.com/mathiasrw/rexreplace/issues/691
// A replacement containing a real line break, a `\'` or a lone backslash at the end crashed the CLI with a SyntaxError and a stack trace.
// The replacement is unescaped by the CLI (not the engine), so these tests run the CLI itself.
import {describe, test, expect} from 'bun:test';
import {spawnSync} from 'child_process';
import fs from 'fs';
import path from 'path';

const cli = path.join(import.meta.dir, '../../../src/cli.ts');

// With --output the name of the file goes to stderr
const expectedOutput = 'my.file\n';

// Replace each `o` in `foobar` with the replacement and return what the CLI gives back.
// Without the tail only the result of the replacement is given.
function replaceO(replacement, ...flags) {
	fs.writeFileSync('my.file', 'foobar');
	const {stdout, stderr, status} = spawnSync(
		process.execPath,
		[cli, 'o', replacement, 'my.file', '--output', '--no-content-delimiter-tail', ...flags],
		{input: '', encoding: 'utf8'}
	);
	return {out: stdout, err: stderr, exit: status};
}

describe('#691 replacement that used to crash the CLI', () => {
	test('a real line break is inserted as a line break', () => {
		expect(replaceO('a\nb')).toEqual({out: 'fa\nba\nbbar', err: expectedOutput, exit: 0});
		expect(replaceO('a\r\nb').out).toBe('fa\r\nba\r\nbbar');
		expect(replaceO('\u2028\u2029').out).toBe('f\u2028\u2029\u2028\u2029bar');
	});

	test("`\\'` gives a single quote", () => {
		expect(replaceO("\\'")).toEqual({out: "f''bar", err: expectedOutput, exit: 0});
	});

	test('a lone backslash at the end gives a backslash', () => {
		expect(replaceO('\\')).toEqual({out: 'f\\\\bar', err: expectedOutput, exit: 0});
		expect(replaceO('x\\').out).toBe('fx\\x\\bar');
	});

	test('a backslash in front of a real line break still joins the lines (as before)', () => {
		expect(replaceO('a\\\nb')).toEqual({out: 'fababbar', err: expectedOutput, exit: 0});
		expect(replaceO('a\\\r\nb').out).toBe('fababbar');
		expect(replaceO('a \\\n  b \\\n  c').out).toBe('fa   b   ca   b   cbar');
	});

	test('the replacement can not run as code', () => {
		const result = replaceO("\\'+process.exit(3)//");
		expect(result).toEqual({
			out: "f'+process.exit(3)//'+process.exit(3)//bar",
			err: expectedOutput,
			exit: 0,
		});
	});

	test('an invalid escape sequence gives an error message and no stack trace', () => {
		const result = replaceO('\\x4');
		expect(result.out).toBe('');
		expect(result.err).toBe(' ❌ Invalid escape sequence in replacement: \\x4\n\n');
		expect(result.exit).toBe(1);
		expect(replaceO('\\x4', '--quiet-total')).toEqual({out: '', err: '', exit: 1});
	});

	test.each([
		['\\n', '\n'],
		['\\t', '\t'],
		['\\x41', 'A'],
		['\\u00e9', 'é'],
		['\\\\', '\\'],
		['\\\\n', '\\n'],
		["'", "'"],
		["\\\\'", "\\'"],
		['"', '"'],
		['`${1}`', '`${1}`'],
	])('%j still gives %j', (replacement, expected) => {
		expect(replaceO(replacement)).toEqual({
			out: `f${expected}${expected}bar`,
			err: expectedOutput,
			exit: 0,
		});
	});
});
