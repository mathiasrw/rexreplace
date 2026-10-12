// https://github.com/mathiasrw/rexreplace/issues/691
// A replacement containing a real line break, a `\'` or a lone backslash at the end crashed the CLI with a SyntaxError and a stack trace.
// The replacement is unescaped by the CLI (not the engine), so these tests run the CLI itself.
import {describe, test, expect} from 'bun:test';
import {spawnSync} from 'child_process';
import fs from 'fs';
import path from 'path';

const cli = path.join(import.meta.dir, '../../../src/cli.ts');

// Replace each `o` in `foobar` with the replacement and return what the CLI gives back
function replaceO(replacement, ...flags) {
	fs.writeFileSync('my.file', 'foobar');
	const {stdout, stderr, status} = spawnSync(
		process.execPath,
		[cli, 'o', replacement, 'my.file', '--output', ...flags],
		{input: '', encoding: 'utf8'}
	);
	return {out: stdout, err: stderr, exit: status};
}

describe('#691 replacement that used to crash the CLI', () => {
	test('a real line break is inserted as a line break', () => {
		expect(replaceO('a\nb')).toEqual({out: 'fa\nba\nbbar', err: '', exit: 0});
		expect(replaceO('a\r\nb').out).toBe('fa\r\nba\r\nbbar');
		expect(replaceO('\u2028\u2029').out).toBe('f\u2028\u2029\u2028\u2029bar');
	});

	test("`\\'` gives a single quote", () => {
		expect(replaceO("\\'")).toEqual({out: "f''bar", err: '', exit: 0});
	});

	test('a lone backslash at the end gives a backslash', () => {
		expect(replaceO('\\')).toEqual({out: 'f\\\\bar', err: '', exit: 0});
		expect(replaceO('x\\').out).toBe('fx\\x\\bar');
	});

	test('a backslash in front of a real line break keeps the line break', () => {
		expect(replaceO('a\\\nb').out).toBe('fa\nba\nbbar');
	});

	test('the replacement can not run as code', () => {
		const result = replaceO("\\'+process.exit(3)//");
		expect(result).toEqual({
			out: "f'+process.exit(3)//'+process.exit(3)//bar",
			err: '',
			exit: 0,
		});
	});

	test('an invalid escape sequence gives an error message and no stack trace', () => {
		const result = replaceO('\\x4');
		expect(result.out).toBe('');
		expect(result.err).toBe(' ❌ Invalid escape sequence in replacement: \\x4\n');
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
			err: '',
			exit: 0,
		});
	});
});
