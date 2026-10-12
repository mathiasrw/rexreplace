import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

describe('--name-delimiter', () => {
	test('puts the delimiter between names and not after the last', async () => {
		['a', 'b', 'c'].forEach((name) => fs.writeFileSync(name + '.file', 'foo'));
		const result = await rr('o', 'x', {
			includeGlob: ['*.file'],
			nameDelimiter: ', ',
		});
		expect(result.out).toBe('a.file, b.file, c.file');
		expect(result.err).toBe('');
	});

	test('prints a single name with no delimiter or line break', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('o', 'x', {
			includeGlob: ['my.file'],
			nameDelimiter: ', ',
		});
		expect(result.out).toBe('my.file');
		expect(result.err).toBe('');
	});

	test('joins names with the given delimiter string', async () => {
		['a', 'b'].forEach((name) => fs.writeFileSync(name + '.file', 'foo'));
		// Engine path gets the already-unescaped delimiter (CLI does unescaping).
		const result = await rr('o', 'x', {
			includeGlob: ['*.file'],
			nameDelimiter: '\t',
		});
		expect(result.out).toBe('a.file\tb.file');
	});

	test('still respects --quiet', async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect(
			await rr('o', 'x', {includeGlob: ['my.file'], nameDelimiter: ',', quiet: true})
		).toEqual({out: '', err: '', exit: null});
	});

	test('does not print names when using --output', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('o', 'x', {
			includeGlob: ['my.file'],
			nameDelimiter: ', ',
			output: true,
		});
		expect(result.out).toBe('fxxbar');
		expect(result.err).toBe('');
	});
});
