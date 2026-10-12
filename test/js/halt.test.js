import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

describe('--halt', () => {
	test('stops the process on the first error', () => {
		const result = rr('o', 'x', {includeGlob: ['nope.file'], halt: true});
		expect(result.err).toContain('0 files found');
		expect(result.exit).not.toBe(null);
	});

	test('is not the default', () => {
		const result = rr('o', 'x', {includeGlob: ['nope.file']});
		expect(result.err).toContain('0 files found');
		expect(result.exit).toBe(null);
	});

	test('changes nothing when all goes well', () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = rr('o', 'x', {includeGlob: ['my.file'], halt: true});
		expect(result).toEqual({out: '', err: 'my.file \n', exit: null});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
	});

	test.todo(
		'BUG #681: stops with a number as exit code (now the error message is used as exit code)',
		() => {
			expect(rr('o', 'x', {includeGlob: ['nope.file'], halt: true}).exit).toBe(1);
			expect(rr('(', 'x', {pipedData: 'foobar', halt: true}).exit).toBe(1);
		}
	);

	describe('combined', () => {
		test.each(['quiet', 'quietTotal'])('with --%s it still stops', (flag) => {
			const result = rr('o', 'x', {includeGlob: ['nope.file'], halt: true, [flag]: true});
			expect(result.exit).not.toBe(null);
		});

		test('with an invalid pattern it stops with or without it', () => {
			expect(rr('(', 'x', {pipedData: 'foobar', halt: true}).exit).not.toBe(null);
			expect(rr('(', 'x', {pipedData: 'foobar'}).exit).toBe(1);
		});

		test('with piped data and several flags when all goes well', () => {
			const config = {
				pipedData: 'Foo foo',
				halt: true,
				voidIgnoreCase: true,
				voidGlobal: true,
			};
			expect(rr('f', 'x', config)).toEqual({out: 'Foo xoo', err: '', exit: null});
		});

		test('with --exclude-glob leaving no files', () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {includeGlob: ['my.file'], excludeGlob: ['*.file'], halt: true};
			expect(rr('o', 'x', config).exit).not.toBe(null);
			expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
		});
	});
});
