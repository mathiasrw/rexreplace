// --expect-* checks the result, so a CI step can stop when it is not as expected
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {$} from 'bun';
import {cli, sh} from '../helper.js';

describe('--expect-*', () => {
	test('gives the exit code 1 when a check is not met', async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect(await sh($`bun ${cli} o x my.file -Z -S`)).toEqual({
			out: 'my.file\n',
			err: ' ❌ Expected no diff, but 1 file would change\n\n',
			exit: 1,
		});
		expect((await sh($`bun ${cli} nope x my.file -z`)).exit).toBe(1);
		expect((await sh($`bun ${cli} o x nope.file -F`)).exit).toBe(1);
	});

	test.each([['-z'], ['--expect-diff-all']])(
		'--expect-zero-diff can not be used with %s',
		async flag => {
			fs.writeFileSync('my.file', 'foobar');
			expect((await sh($`bun ${cli} o x my.file -Z ${flag}`)).exit).toBe(3);
			expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
		}
	);
});
