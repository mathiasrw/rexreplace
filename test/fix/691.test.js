// https://github.com/mathiasrw/rexreplace/issues/691
// A replacement containing a real line break, a `\'` or a lone backslash at the end crashed the CLI with a SyntaxError and a stack trace.
// The replacement is unescaped by the CLI (not the engine), so these tests run the CLI itself.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {$} from 'bun';
import {cli, sh} from '../helper.js';

// With --output the name of the file goes to stderr
const expectedOutput = 'my.file\n';

// Each test replaces each `o` in `foobar` with the replacement. Without the tail only the result of the replacement is given.
describe('#691 replacement that used to crash the CLI', () => {
	test('a real line break is inserted as a line break', async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect(
			await sh($`bun ${cli} o ${'a\nb'} my.file --output --no-content-delimiter-tail`)
		).toEqual({out: 'fa\nba\nbbar', err: expectedOutput, exit: 0});
		expect(
			(await sh($`bun ${cli} o ${'a\r\nb'} my.file --output --no-content-delimiter-tail`)).out
		).toBe('fa\r\nba\r\nbbar');
		expect(
			(await sh($`bun ${cli} o ${'\u2028\u2029'} my.file --output --no-content-delimiter-tail`)).out
		).toBe('f\u2028\u2029\u2028\u2029bar');
	});

	test("`\\'` gives a single quote", async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect(await sh($`bun ${cli} o ${"\\'"} my.file --output --no-content-delimiter-tail`)).toEqual(
			{out: "f''bar", err: expectedOutput, exit: 0}
		);
	});

	test('a lone backslash at the end gives a backslash', async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect(await sh($`bun ${cli} o ${'\\'} my.file --output --no-content-delimiter-tail`)).toEqual({
			out: 'f\\\\bar',
			err: expectedOutput,
			exit: 0,
		});
		expect(
			(await sh($`bun ${cli} o ${'x\\'} my.file --output --no-content-delimiter-tail`)).out
		).toBe('fx\\x\\bar');
	});

	test('a backslash in front of a real line break still joins the lines (as before)', async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect(
			await sh($`bun ${cli} o ${'a\\\nb'} my.file --output --no-content-delimiter-tail`)
		).toEqual({out: 'fababbar', err: expectedOutput, exit: 0});
		expect(
			(await sh($`bun ${cli} o ${'a\\\r\nb'} my.file --output --no-content-delimiter-tail`)).out
		).toBe('fababbar');
		expect(
			(
				await sh(
					$`bun ${cli} o ${'a \\\n  b \\\n  c'} my.file --output --no-content-delimiter-tail`
				)
			).out
		).toBe('fa   b   ca   b   cbar');
	});

	test('the replacement can not run as code', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await sh(
			$`bun ${cli} o ${"\\'+process.exit(3)//"} my.file --output --no-content-delimiter-tail`
		);
		expect(result).toEqual({
			out: "f'+process.exit(3)//'+process.exit(3)//bar",
			err: expectedOutput,
			exit: 0,
		});
	});

	test('an invalid escape sequence gives an error message and no stack trace', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await sh($`bun ${cli} o ${'\\x4'} my.file --output --no-content-delimiter-tail`);
		expect(result.out).toBe('');
		expect(result.err).toBe(
			' ❌ Invalid escape sequence in replacement\n    \\x4\n    No further processing.\n\n'
		);
		expect(result.exit).toBe(3);
		expect(
			await sh($`bun ${cli} o ${'\\x4'} my.file --output --no-content-delimiter-tail --quiet-total`)
		).toEqual({out: '', err: '', exit: 3});
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
	])('%j still gives %j', async (replacement, expected) => {
		fs.writeFileSync('my.file', 'foobar');
		expect(
			await sh($`bun ${cli} o ${replacement} my.file --output --no-content-delimiter-tail`)
		).toEqual({
			out: `f${expected}${expected}bar`,
			err: expectedOutput,
			exit: 0,
		});
	});
});
