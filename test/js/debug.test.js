import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

describe('--debug', () => {
	test('prints what happens to a file', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('o', 'x', {includeGlob: ['my.file'], debug: true});
		expect(result.err).toBe(
			[
				'"1 files found"',
				'"Open sync: my.file"',
				'"Work on content from: my.file"',
				'"Write new content to: my.file"',
				'',
			].join('\n')
		);
		expect(result.out).toBe('my.file\n');
	});

	test('prints what happens to piped data', async () => {
		const result = await rr('o', 'x', {pipedData: 'foobar', debug: true});
		expect(result.err).toBe(
			'"Work on content from: Piped data"\n"Output result from: Piped data"\n'
		);
	});

	test('is not the default', async () => {
		expect((await rr('o', 'x', {pipedData: 'foobar'})).err).toBe('');
	});

	test('never writes to stdout', async () => {
		expect((await rr('o', 'x', {pipedData: 'foobar', debug: true})).out).toBe('fxxbar');
	});

	test('throws the full error for an invalid pattern', async () => {
		await expect(rr('(', 'x', {pipedData: 'foobar', debug: true})).rejects.toThrow(
			'Invalid regular expression'
		);
	});

	describe('combined', () => {
		test('with --verbose every step and the config is printed', async () => {
			const config = {pipedData: 'foobar', debug: true, verbose: true, voidGlobal: true};
			const result = await rr('o', 'x', config);
			expect(result.err).toContain('"Get flags"\n"im"');
			expect(result.err).toContain('"voidGlobal": true');
			expect(result.out).toBe('fxobar');
		});

		test('with --quiet and --quiet-total the debug info is still printed', async () => {
			const config = {pipedData: 'foobar', debug: true};
			expect((await rr('o', 'x', {...config, quiet: true})).err).toContain(
				'Work on content from'
			);
			expect((await rr('o', 'x', {...config, quietTotal: true})).err).toContain(
				'Work on content from'
			);
		});

		test('with --output', async () => {
			fs.writeFileSync('my.file', 'foobar');
			const result = await rr('o', 'x', {
				includeGlob: ['my.file'],
				debug: true,
				output: true,
			});
			expect(result.out).toBe('fxxbar\n');
			expect(result.err).toContain('"Output result from: my.file"');
			expect(result.err).not.toContain('Write new content');
		});

		test('with a file where nothing is replaced', async () => {
			fs.writeFileSync('my.file', 'foobar');
			const result = await rr('nope', 'x', {includeGlob: ['my.file'], debug: true});
			expect(result.err).toContain('"Nothing changed in: my.file"');
		});

		test('with --replacement-js and --output-match', async () => {
			const js = await rr('o', '1+1', {pipedData: 'fo', debug: true, replacementJs: true});
			expect(js.out).toBe('f2');
			const match = await rr('o', '_', {pipedData: 'fo', debug: true, outputMatch: true});
			expect(match.out).toBe('o');
			expect(match.err).toBe('"Work on content from: Piped data"\n');
		});
	});
});
