// https://github.com/mathiasrw/rexreplace/issues/820
// Names that natural sees as the same kept the order of the glob, which differs between Node and Bun,
// and natural followed the locale of the user on Node, but not on Bun.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('#820 the natural order', () => {
	test('orders the names it sees as the same by ascii', async () => {
		for (const name of ['file1.md', 'file01.md', 'file001.md', 'cafe.md', 'café.md']) {
			fs.writeFileSync(name, 'foo');
		}
		expect(
			(await rr('foo', 'bar', {includeGlob: ['*.md'], simulate: true, sort: 'natural'})).out
		).toBe('cafe.md\ncafé.md\nfile001.md\nfile01.md\nfile1.md\n');
	});
});
