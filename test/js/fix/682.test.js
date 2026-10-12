// https://github.com/mathiasrw/rexreplace/issues/682
// `--quiet` promises "Only display errors (no other info)" but used to hide errors too (making it behave like `--quiet-total`).
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('#682 --quiet still displays errors', () => {
	test('invalid regular expression', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('(', 'x', {includeGlob: ['my.file'], quiet: true});
		expect(result.err).toContain('Invalid regular expression');
		expect(result.exit).toBe(1);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
	});

	test('no files found', async () => {
		expect((await rr('o', 'x', {includeGlob: ['nope.file'], quiet: true})).err).toContain(
			'0 files found'
		);
	});

	test('piped data with invalid regular expression', async () => {
		expect((await rr('(', 'x', {pipedData: 'foobar', quiet: true})).err).toContain(
			'Invalid regular expression'
		);
	});

	test('still hides the info about changed files', async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect((await rr('o', 'x', {includeGlob: ['my.file'], quiet: true})).err).toBe('');
	});

	test('--quiet-total still hides errors', async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect(await rr('(', 'x', {includeGlob: ['my.file'], quietTotal: true})).toEqual({
			out: '',
			err: '',
			exit: 1,
		});
		expect((await rr('o', 'x', {includeGlob: ['nope.file'], quietTotal: true})).err).toBe('');
	});
});
