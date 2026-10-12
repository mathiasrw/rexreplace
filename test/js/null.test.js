import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

describe('--null', () => {
	test('ends each changed file name with a NUL byte', async () => {
		['a', 'b'].forEach((name) => fs.writeFileSync(name + '.file', 'foo'));
		const result = await rr('o', 'x', {includeGlob: ['*.file'], null: true});
		expect(result.out).toBe('a.file\0b.file\0');
		expect(result.err).toBe('');
	});

	test('still respects --quiet', async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect(await rr('o', 'x', {includeGlob: ['my.file'], null: true, quiet: true})).toEqual({
			out: '',
			err: '',
			exit: null,
		});
	});

	test('is not used when nothing is written to disk', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('o', 'x', {
			includeGlob: ['my.file'],
			null: true,
			output: true,
		});
		expect(result.out).toBe('fxxbar');
		expect(result.err).toBe('');
	});
});
