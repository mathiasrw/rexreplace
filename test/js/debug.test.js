import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

describe('--debug', () => {
	test('prints what happens to a file', () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = rr('o', 'x', {includeGlob: ['my.file'], debug: true});
		expect(result.err).toBe(
			[
				'"1 files found "',
				'"Open sync: my.file "',
				'"Work on content from: my.file"',
				'"Write new content to: my.file"',
				'my.file ',
				'',
			].join('\n')
		);
	});

	test('prints what happens to piped data', () => {
		const result = rr('o', 'x', {pipedData: 'foobar', debug: true});
		expect(result.err).toBe(
			'"Work on content from: Piped data"\n"Output result from: Piped data"\n'
		);
	});

	test('is not the default', () => {
		expect(rr('o', 'x', {pipedData: 'foobar'}).err).toBe('');
	});

	test('never writes to stdout', () => {
		expect(rr('o', 'x', {pipedData: 'foobar', debug: true}).out).toBe('fxxbar');
	});

	test('throws the full error for an invalid pattern', () => {
		expect(() => rr('(', 'x', {pipedData: 'foobar', debug: true})).toThrow(
			'Invalid regular expression'
		);
	});

	describe('combined', () => {
		test('with --verbose every step and the config is printed', () => {
			const config = {pipedData: 'foobar', debug: true, verbose: true, voidGlobal: true};
			const result = rr('o', 'x', config);
			expect(result.err).toContain('"Get flags"\n"im"');
			expect(result.err).toContain('"voidGlobal": true');
			expect(result.out).toBe('fxobar');
		});

		test('with --quiet and --quiet-total the debug info is still printed', () => {
			const config = {pipedData: 'foobar', debug: true};
			expect(rr('o', 'x', {...config, quiet: true}).err).toContain('Work on content from');
			expect(rr('o', 'x', {...config, quietTotal: true}).err).toContain(
				'Work on content from'
			);
		});

		test('with --output', () => {
			fs.writeFileSync('my.file', 'foobar');
			const result = rr('o', 'x', {includeGlob: ['my.file'], debug: true, output: true});
			expect(result.out).toBe('fxxbar');
			expect(result.err).toContain('"Output result from: my.file"');
			expect(result.err).not.toContain('Write new content');
		});

		test('with a file where nothing is replaced', () => {
			fs.writeFileSync('my.file', 'foobar');
			const result = rr('nope', 'x', {includeGlob: ['my.file'], debug: true});
			expect(result.err).toContain('"Nothing changed in: my.file "');
		});

		test('with --replacement-js and --output-match', () => {
			const js = rr('o', '1+1', {pipedData: 'fo', debug: true, replacementJs: true});
			expect(js.out).toBe('f2');
			const match = rr('o', '_', {pipedData: 'fo', debug: true, outputMatch: true});
			expect(match.out).toBe('o\n');
			expect(match.err).toBe('"Work on content from: Piped data"\n');
		});
	});
});
