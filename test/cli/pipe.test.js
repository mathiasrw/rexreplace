import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {$} from 'bun';
import {cli, sh} from '../helper.js';

describe('--js-pipe', () => {
	test('without it the code does not get the piped data', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		expect(await sh($`echo -n x | bun ${cli} foo pipe my.file -o --js`)).toEqual({
			out: 'nullbar\n',
			err: 'my.file\n',
			exit: 0,
		});
	});

	test('gives the code the piped data as pipe', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		expect((await sh($`echo -n x | bun ${cli} foo pipe my.file -o --js-pipe`)).out).toBe('xbar\n');
	});

	test('--trim-pipe trims the piped data first', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		expect((await sh($`echo -n ' x ' | bun ${cli} foo pipe my.file -o --js-pipe -T`)).out).toBe(
			'xbar\n'
		);
	});

	test.each([['--pipe'], ['-p']])('%s is gone, as --js-pipe does the same', async flag => {
		fs.writeFileSync('my.file', 'foobar\n');
		const result = await sh($`echo -n x | bun ${cli} foo pipe my.file -o --js ${flag}`);
		expect(result.exit).toBe(3);
		expect(result.err).toContain('Unknown argument');
	});
});
