import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('--halt', () => {
	// a.file can not be read, and the files are handled in the order of the list
	test('stops the process on the first error', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		fs.chmodSync('a.file', 0);
		const result = await rr('o', 'x', {includeGlob: ['a.file', 'b.file'], halt: true});
		expect(result.err).toContain('EACCES');
		expect(result.exit).toBe(3);
		expect(fs.readFileSync('b.file', 'utf8')).toBe('foo');
	});

	test('is not the default, so the other files are still handled', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		fs.chmodSync('a.file', 0);
		const result = await rr('o', 'x', {includeGlob: ['a.file', 'b.file']});
		expect(result.err).toContain('EACCES');
		expect(result.exit).toBe(2);
		expect(fs.readFileSync('b.file', 'utf8')).toBe('fxx');
	});

	test('changes nothing when all goes well', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('o', 'x', {includeGlob: ['my.file'], halt: true});
		expect(result).toEqual({out: 'my.file\n', err: '', exit: null});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
	});

	test('stops with a number as exit code', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.chmodSync('a.file', 0);
		expect((await rr('o', 'x', {includeGlob: ['a.file'], halt: true})).exit).toBe(3);
		expect((await rr('(', 'x', {pipedData: 'foobar', halt: true})).exit).toBe(3);
	});

	describe('combined', () => {
		test.each(['quiet', 'quietTotal'])('with --%s it still stops', async flag => {
			fs.writeFileSync('a.file', 'foo');
			fs.chmodSync('a.file', 0);
			const result = await rr('o', 'x', {
				includeGlob: ['a.file'],
				halt: true,
				[flag]: true,
			});
			expect(result.exit).not.toBe(null);
		});

		test('with an invalid pattern it stops with or without it', async () => {
			expect((await rr('(', 'x', {pipedData: 'foobar', halt: true})).exit).not.toBe(null);
			expect((await rr('(', 'x', {pipedData: 'foobar'})).exit).toBe(3);
		});

		test('with piped data and several flags when all goes well', async () => {
			const config = {
				pipedData: 'Foo foo',
				halt: true,
				voidIgnoreCase: true,
				voidGlobal: true,
			};
			expect(await rr('f', 'x', config)).toEqual({out: 'Foo xoo', err: '', exit: null});
		});

		test('with --exclude-glob leaving no files it does not stop, as that is a warning', async () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {includeGlob: ['my.file'], excludeGlob: ['*.file'], halt: true};
			expect(await rr('o', 'x', config)).toEqual({
				out: '',
				err: ' 🟡 0 files found\n\n',
				exit: null,
			});
			expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
		});
	});
});
