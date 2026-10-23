import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('--quiet-total', () => {
	test('does not name the files that were changed', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('o', 'x', {includeGlob: ['my.file'], quietTotal: true});
		expect(result).toEqual({out: '', err: '', exit: null});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
	});

	test('does not display errors', async () => {
		expect((await rr('(', 'x', {pipedData: 'foobar', quietTotal: true})).err).toBe('');
		expect((await rr('o', 'x', {includeGlob: ['nope.file'], quietTotal: true})).err).toBe('');
		expect((await rr('o', 'x', {pipedData: 'foobar', engine: 'nope', quietTotal: true})).err).toBe(
			''
		);
	});

	test('is not the default', async () => {
		expect((await rr('(', 'x', {pipedData: 'foobar'})).err).not.toBe('');
		expect((await rr('o', 'x', {includeGlob: ['nope.file']})).err).not.toBe('');
	});

	test('still stops on an error', async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect((await rr('(', 'x', {includeGlob: ['my.file'], quietTotal: true})).exit).toBe(3);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
	});

	describe('combined', () => {
		test('with --verbose it stays silent, as --quiet-total wins', async () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {includeGlob: ['my.file'], quietTotal: true, verbose: true};
			expect(await rr('o', 'x', config)).toEqual({out: '', err: '', exit: null});
		});

		test.each(['output', 'outputMatch'])('with --%s stdout is not affected', async flag => {
			fs.writeFileSync('my.file', 'foobar');
			const result = await rr('o', 'x', {
				includeGlob: ['my.file'],
				quietTotal: true,
				[flag]: true,
			});
			expect(result.out).not.toBe('');
			expect(result.err).toBe('');
		});

		test('with --replacement-pipe and nothing piped it stops in silence', async () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {includeGlob: ['my.file'], quietTotal: true, replacementPipe: true};
			expect(await rr('o', '_', config)).toEqual({out: '', err: '', exit: 3});
		});

		test('with --halt it stops in silence', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.chmodSync('a.file', 0);
			const result = await rr('o', 'x', {
				includeGlob: ['a.file'],
				quietTotal: true,
				halt: true,
			});
			expect(result.err).toBe('');
			expect(result.exit).not.toBe(null);
		});
	});
});
