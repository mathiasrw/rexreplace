import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

describe('--quiet', () => {
	test('does not name the files that were changed', () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = rr('o', 'x', {includeGlob: ['my.file'], quiet: true});
		expect(result).toEqual({out: '', err: '', exit: null});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
	});

	test('is not the default', () => {
		fs.writeFileSync('my.file', 'foobar');
		expect(rr('o', 'x', {includeGlob: ['my.file']}).err).toBe('my.file \n');
	});

	test('still stops on an invalid pattern', () => {
		fs.writeFileSync('my.file', 'foobar');
		expect(rr('(', 'x', {includeGlob: ['my.file'], quiet: true}).exit).toBe(1);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
	});

	test.todo('BUG #682: errors are still displayed (as the help text promises)', () => {
		expect(rr('(', 'x', {pipedData: 'foobar', quiet: true}).err).toContain(
			'Invalid regular expression'
		);
		expect(rr('o', 'x', {includeGlob: ['nope.file'], quiet: true}).err).toContain(
			'0 files found'
		);
	});

	describe('combined', () => {
		test('with --verbose it stays quiet', () => {
			fs.writeFileSync('my.file', 'foobar');
			expect(rr('o', 'x', {includeGlob: ['my.file'], quiet: true, verbose: true}).err).toBe(
				''
			);
		});

		test('with --debug the debug info is still shown', () => {
			fs.writeFileSync('my.file', 'foobar');
			const result = rr('o', 'x', {includeGlob: ['my.file'], quiet: true, debug: true});
			expect(result.err).toContain('Work on content from: my.file');
			expect(result.err).not.toContain('my.file \n');
		});

		test.each(['output', 'outputMatch'])('with --%s stdout is not affected', (flag) => {
			fs.writeFileSync('my.file', 'foobar');
			const result = rr('o', 'x', {includeGlob: ['my.file'], quiet: true, [flag]: true});
			expect(result.out).not.toBe('');
			expect(result.err).toBe('');
		});

		test('with piped data', () => {
			expect(rr('o', 'x', {pipedData: 'foobar', quiet: true})).toEqual({
				out: 'fxxbar',
				err: '',
				exit: null,
			});
		});

		test('with --keep-backup the backup is still made', () => {
			fs.writeFileSync('my.file', 'foobar');
			rr('o', 'x', {includeGlob: ['my.file'], quiet: true, keepBackup: true});
			expect(fs.readdirSync('.')).toHaveLength(2);
		});
	});
});
