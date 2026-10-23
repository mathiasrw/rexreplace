// https://github.com/mathiasrw/rexreplace/issues/742
// The CLI is the only part that acts on the process. It prints the status report with --status and --status-compact.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {$} from 'bun';
import {cli, sh} from '../../helper.js';

describe('#742 the CLI', () => {
	test('--status prints a line break and the status report with an indent of two spaces after the result', async () => {
		fs.writeFileSync('a.file', 'foo');
		const result = await sh($`bun ${cli} o x a.file --status`);
		const status = {
			files: {searched: ['a.file'], updated: ['a.file']},
			pipe: null,
			warnings: [],
			errors: [],
		};
		expect(result).toEqual({
			out: 'a.file\n\n' + JSON.stringify(status, null, 2) + '\n',
			err: '',
			exit: 0,
		});
	});

	test.each(['--status-compact', '-c'])(
		'%s prints the status report on one line, with no line break in front',
		async flag => {
			fs.writeFileSync('a.file', 'foo');
			const result = await sh($`bun ${cli} o x a.file ${flag} --quiet-total`);
			expect(result.out).toBe(
				'{"files":{"searched":["a.file"],"updated":["a.file"]},"pipe":null,"warnings":[],"errors":[]}\n'
			);
		}
	);

	test('sets the exit code to 2 when a file gives an error, and prints the status report', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.chmodSync('a.file', 0);
		const result = await sh($`bun ${cli} o x a.file --status-compact --quiet-total`);
		expect(JSON.parse(result.out).errors[0]).toContain('EACCES');
		expect(result.exit).toBe(2);
	});

	test('ends the process on a panic, and still prints the status report', async () => {
		fs.writeFileSync('a.file', 'foo');
		const result = await sh($`bun ${cli} '(' x a.file --status-compact --quiet-total`);
		expect(JSON.parse(result.out).errors).toHaveLength(1);
		expect(result.exit).toBe(3);
	});
});
