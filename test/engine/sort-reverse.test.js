import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('--sort-reverse', () => {
	test('turns the order around', async () => {
		fs.writeFileSync('file10.md', 'foo');
		fs.writeFileSync('file2.md', 'foo');
		expect((await rr('o', 'x', {includeGlob: ['*.md'], sortReverse: true})).out).toBe(
			'file10.md\nfile2.md\n'
		);
	});

	test('works with the other sorts', async () => {
		fs.writeFileSync('a.md', 'ooo');
		fs.writeFileSync('b.md', 'o');
		const config = {includeGlob: ['*.md'], sort: 'size', sortReverse: true};
		expect((await rr('o', 'x', config)).out).toBe('a.md\nb.md\n');
	});
});
