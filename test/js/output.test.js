import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

describe('--output', () => {
	test('sends the result to stdout and leaves the file alone', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('o', 'x', {includeGlob: ['my.file'], output: true});
		expect(result).toEqual({out: 'fxxbar', err: '', exit: null});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
	});

	test('is not the default for files', async () => {
		fs.writeFileSync('my.file', 'foobar');
		// Default in-place edit prints the changed file name on stdout (not the content)
		expect((await rr('o', 'x', {includeGlob: ['my.file']})).out).toBe('my.file\n');
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
	});

	test('sends the content even if nothing was replaced', async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect((await rr('x', 'x', {includeGlob: ['my.file'], output: true})).out).toBe('foobar');
	});

	test('adds nothing to the content', async () => {
		fs.writeFileSync('my.file', 'foo\n\n');
		fs.writeFileSync('empty.file', '');
		expect((await rr('o', 'x', {includeGlob: ['my.file'], output: true})).out).toBe('fxx\n\n');
		expect((await rr('o', 'x', {includeGlob: ['empty.file'], output: true})).out).toBe('');
	});

	test('sends several files right after each other in alphabetical order', async () => {
		fs.writeFileSync('b.file', 'boo\n');
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('c.file', 'zoo');
		expect(
			(await rr('o', 'x', {includeGlob: ['c.file', 'b.file', 'a.file'], output: true})).out
		).toBe('fxxbxx\nzxx');
	});

	test('is always on for piped data', async () => {
		expect((await rr('o', 'x', {pipedData: 'foobar'})).out).toBe('fxxbar');
		expect((await rr('o', 'x', {pipedData: 'foobar', output: false})).out).toBe('fxxbar');
	});

	describe('combined', () => {
		test('with --keep-backup there is nothing to back up', async () => {
			fs.writeFileSync('my.file', 'foobar');
			await rr('o', 'x', {includeGlob: ['my.file'], output: true, keepBackup: true});
			expect(fs.readdirSync('.')).toEqual(['my.file']);
		});

		test('with --output-match only the matches are sent', async () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {includeGlob: ['my.file'], output: true, outputMatch: true};
			expect((await rr('[fb].', '_', config)).out).toBe('fo\nba\n');
		});

		test('with --quiet and --quiet-total the result is still sent', async () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {includeGlob: ['my.file'], output: true};
			expect((await rr('o', 'x', {...config, quiet: true})).out).toBe('fxxbar');
			expect((await rr('o', 'x', {...config, quietTotal: true})).out).toBe('fxxbar');
		});

		test('with --verbose and --debug the chatter goes to stderr only', async () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {includeGlob: ['my.file'], output: true, verbose: true, debug: true};
			const result = await rr('o', 'x', config);
			expect(result.out).toBe('fxxbar');
			expect(result.err).toContain('Output result from: my.file');
		});

		test('with --replacement-js and several files', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'foo');
			const config = {includeGlob: ['*.file'], output: true, replacementJs: true};
			expect((await rr('foo', 'name + nl', config)).out).toBe('a\nb\n');
		});

		test('with --exclude-glob', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'boo');
			const config = {includeGlob: ['*.file'], excludeGlob: ['a.*'], output: true};
			expect((await rr('o', 'x', config)).out).toBe('bxx');
		});

		test.each([{voidAsync: true}, {voidBackup: true}, {voidAsync: true, voidBackup: true}])(
			'with %o the file is still left alone',
			async (config) => {
				fs.writeFileSync('my.file', 'foobar');
				const result = await rr('o', 'x', {
					includeGlob: ['my.file'],
					output: true,
					...config,
				});
				expect(result.out).toBe('fxxbar');
				expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
			}
		);
	});
});
