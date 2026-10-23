// https://github.com/mathiasrw/rexreplace/issues/817
// The path of --replacement-file went through the escapes and the € and § aliases of a typed replacement,
// so a backslash in a Windows path was lost, and price€.txt was looked for as price$.txt.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {$} from 'bun';
import {cli, sh} from '../helper.js';

describe('#817 the path of --replacement-file', () => {
	test('keeps a backslash', async () => {
		fs.mkdirSync('my\\dir');
		fs.writeFileSync('my\\dir/new.txt', 'NEW');
		fs.writeFileSync('page.txt', 'X');
		const result = await sh($`bun ${cli} X ${'my\\dir/new.txt'} page.txt -o --replacement-file`);
		expect(result).toEqual({out: 'NEW\n', err: 'page.txt\n', exit: 0});
	});

	test('keeps € and §, as the aliases are not used in file names', async () => {
		fs.writeFileSync('price€§.txt', 'PRICE');
		fs.writeFileSync('page.txt', 'X');
		const result = await sh($`bun ${cli} X ${'price€§.txt'} page.txt -o --replacement-file`);
		expect(result.out).toBe('PRICE\n');
	});

	test('still uses the aliases in the code of --js, which gives the path', async () => {
		fs.writeFileSync('new.txt', 'NEW');
		fs.writeFileSync('page.txt', 'X');
		const code = '"new" + €0.replace("X", ".txt")';
		const result = await sh($`bun ${cli} X ${code} page.txt -o --replacement-file --js`);
		expect(result.out).toBe('NEW\n');
	});
});
