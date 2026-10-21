import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

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
		expect((await rr('(', 'x', {includeGlob: ['my.file'], quiet: true})).exit).toBe(1);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
	});

	test('still displays errors (as the help text promises)', async () => {
		expect((await rr('(', 'x', {pipedData: 'foobar', quiet: true})).err).toContain(
			'Invalid regular expression'
		);
		expect((await rr('o', 'x', {includeGlob: ['nope.file'], quiet: true})).err).toContain(
			'0 files found'
		);
	});

	describe('combined', () => {
		test('with --verbose it stays quiet', async () => {
			fs.writeFileSync('my.file', 'foobar');
			expect(
				(await rr('o', 'x', {includeGlob: ['my.file'], quiet: true, verbose: true})).err
			).toBe('');
		});

		test('with --debug the debug info is still shown', async () => {
			fs.writeFileSync('my.file', 'foobar');
			const result = await rr('o', 'x', {includeGlob: ['my.file'], quiet: true, debug: true});
			expect(result.err).toContain('Work on content from: my.file');
			expect(result.out).toBe('');
		});

		test.each(['output', 'outputMatch'])('with --%s stdout is not affected', async (flag) => {
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
