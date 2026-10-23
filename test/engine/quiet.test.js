import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('--quiet', () => {
	test('does not name the files that were changed', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('o', 'x', {includeGlob: ['my.file'], quiet: true});
		expect(result).toEqual({out: '', err: '', exit: null});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
	});

	test('is not the default', async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect((await rr('o', 'x', {includeGlob: ['my.file']})).out).toBe('my.file\n');
	});

	test('still stops on an invalid pattern', async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect((await rr('(', 'x', {includeGlob: ['my.file'], quiet: true})).exit).toBe(3);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
	});

	test('still displays errors (as the help text promises)', async () => {
		expect((await rr('(', 'x', {pipedData: 'foobar', quiet: true})).err).toContain(
			'Invalid regular expression'
		);
		fs.writeFileSync('a.file', 'foo');
		fs.chmodSync('a.file', 0);
		expect((await rr('o', 'x', {includeGlob: ['a.file'], quiet: true})).err).toContain('EACCES');
	});

	describe('combined', () => {
		test('with --verbose the chatter is still shown, as it was asked for', async () => {
			fs.writeFileSync('my.file', 'foobar');
			const result = await rr('o', 'x', {
				includeGlob: ['my.file'],
				quiet: true,
				verbose: true,
			});
			expect(result.out).toBe('');
			expect(result.err).toContain('Open sync: my.file');
		});

		test.each(['output', 'outputMatch'])('with --%s stdout is not affected', async flag => {
			fs.writeFileSync('my.file', 'foobar');
			const result = await rr('o', 'x', {
				includeGlob: ['my.file'],
				quiet: true,
				[flag]: true,
			});
			expect(result.out).not.toBe('');
			expect(result.err).toBe('');
		});

		test('with piped data', async () => {
			expect(await rr('o', 'x', {pipedData: 'foobar', quiet: true})).toEqual({
				out: 'fxxbar',
				err: '',
				exit: null,
			});
		});

		test('with --keep-backup the backup is still made', async () => {
			fs.writeFileSync('my.file', 'foobar');
			await rr('o', 'x', {includeGlob: ['my.file'], quiet: true, keepBackup: true});
			expect(fs.readdirSync('.')).toHaveLength(2);
		});
	});
});
