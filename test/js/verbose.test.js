import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

describe('--verbose', () => {
	test('tells what is going on', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('o', 'x', {includeGlob: ['my.file'], verbose: true});
		expect(result.err).toBe('1 files found \nOpen sync: my.file \n');
		expect(result.out).toBe('my.file\n');
	});

	test('is not the default', async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect((await rr('o', 'x', {includeGlob: ['my.file']})).out).toBe('my.file\n');
	});

	test('tells when nothing was changed in a file', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('nope', 'x', {includeGlob: ['my.file'], verbose: true});
		expect(result.err).toContain('Nothing changed in: my.file');
		expect((await rr('nope', 'x', {includeGlob: ['my.file']})).err).toBe('');
	});

	test('tells how many files were found', async () => {
		['a', 'b', 'c'].forEach((name) => fs.writeFileSync(name + '.file', 'foo'));
		expect((await rr('o', 'x', {includeGlob: ['*.file'], verbose: true})).err).toContain(
			'3 files found'
		);
	});

	test('tells when piped data is not used', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const config = {includeGlob: ['my.file'], pipedData: 'boo'};
		expect((await rr('o', 'x', {...config, verbose: true})).err).toContain(
			'Piped data never used.'
		);
		expect((await rr('x', 'o', config)).err).not.toContain('Piped data');
	});

	test('never writes to stdout', async () => {
		expect((await rr('o', 'x', {pipedData: 'foobar', verbose: true})).out).toBe('fxxbar');
	});

	describe('combined', () => {
		test('with --quiet or --quiet-total nothing is told', async () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {includeGlob: ['my.file'], verbose: true};
			expect((await rr('o', 'x', {...config, quiet: true})).err).toBe('');
			expect((await rr('x', 'o', {...config, quietTotal: true})).err).toBe('');
		});

		test('with --debug every step and the full config is shown', async () => {
			const result = await rr('o', 'x', {pipedData: 'foobar', verbose: true, debug: true});
			expect(result.err).toContain('"Displaying steps for:"');
			expect(result.err).toContain('"pattern": "o"');
			// The tests are run by Bun, and Bun has JSC
			expect(result.err).toContain('"Get final regex with engine: JSC"');
			expect(result.err).toContain('"gim"');
			expect(result.out).toBe('fxxbar');
		});

		test('with --debug the steps are not shown without --verbose', async () => {
			const result = await rr('o', 'x', {pipedData: 'foobar', debug: true});
			expect(result.err).not.toContain('Displaying steps for');
		});

		test('with --output the result is still clean', async () => {
			fs.writeFileSync('my.file', 'foobar');
			const result = await rr('o', 'x', {
				includeGlob: ['my.file'],
				verbose: true,
				output: true,
			});
			expect(result.out).toBe('fxxbar');
			expect(result.err).toBe('1 files found \nOpen sync: my.file \n');
		});

		test('with --replacement-js piped data counts as used', async () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {
				includeGlob: ['my.file'],
				pipedData: 'boo',
				verbose: true,
				replacementJs: true,
			};
			expect((await rr('foo', 'pipe', config)).err).not.toContain('Piped data never used');
			expect(fs.readFileSync('my.file', 'utf8')).toBe('boobar');
		});
	});
});
