import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

describe('--quiet-total', () => {
	test('does not name the files that were changed', () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = rr('o', 'x', {includeGlob: ['my.file'], quietTotal: true});
		expect(result).toEqual({out: '', err: '', exit: null});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
	});

	test('does not display errors', () => {
		expect(rr('(', 'x', {pipedData: 'foobar', quietTotal: true}).err).toBe('');
		expect(rr('o', 'x', {includeGlob: ['nope.file'], quietTotal: true}).err).toBe('');
		expect(rr('o', 'x', {pipedData: 'foobar', engine: 'nope', quietTotal: true}).err).toBe('');
	});

	test('is not the default', () => {
		expect(rr('(', 'x', {pipedData: 'foobar'}).err).not.toBe('');
		expect(rr('o', 'x', {includeGlob: ['nope.file']}).err).not.toBe('');
	});

	test('still stops on an error', () => {
		fs.writeFileSync('my.file', 'foobar');
		expect(rr('(', 'x', {includeGlob: ['my.file'], quietTotal: true}).exit).toBe(1);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
	});

	describe('combined', () => {
		test('with --quiet and --verbose it stays silent', () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {includeGlob: ['my.file'], quietTotal: true, quiet: true, verbose: true};
			expect(rr('o', 'x', config).err).toBe('');
		});

		test('with --debug the debug info is still shown', () => {
			const result = rr('o', 'x', {pipedData: 'foobar', quietTotal: true, debug: true});
			expect(result.err).toContain('Work on content from: Piped data');
		});

		test.each(['output', 'outputMatch'])('with --%s stdout is not affected', (flag) => {
			fs.writeFileSync('my.file', 'foobar');
			const result = rr('o', 'x', {includeGlob: ['my.file'], quietTotal: true, [flag]: true});
			expect(result.out).not.toBe('');
			expect(result.err).toBe('');
		});

		test('with --replacement-pipe and nothing piped it stops in silence', () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {includeGlob: ['my.file'], quietTotal: true, replacementPipe: true};
			expect(rr('o', '_', config)).toEqual({out: '', err: '', exit: 1});
		});

		test('with --halt it stops in silence', () => {
			const result = rr('o', 'x', {includeGlob: ['nope.file'], quietTotal: true, halt: true});
			expect(result.err).toBe('');
			expect(result.exit).not.toBe(null);
		});
	});
});
