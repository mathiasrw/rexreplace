// https://github.com/mathiasrw/rexreplace/issues/820
// Names that natural sees as the same kept the order of the glob, which differs between Node and Bun,
// and natural followed the locale of the user on Node, but not on Bun. The locale is checked in test/cli/run.sh.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

async function sorted(names, config = {}) {
	names.forEach(name => fs.writeFileSync(name, 'foo'));
	const result = await rr('foo', 'bar', {
		includeGlob: ['*.md'],
		simulate: true,
		sort: 'natural',
		...config,
	});
	return result.out.split('\n').filter(Boolean);
}

describe('#820 the natural order', () => {
	test.each([
		['numbers as numbers', ['file10.md', 'file9.md'], ['file9.md', 'file10.md']],
		['case ignored', ['B.md', 'a.md'], ['a.md', 'B.md']],
		['accents ignored', ['cafe2.md', 'café1.md'], ['café1.md', 'cafe2.md']],
		['aa as two a, like in English', ['b.md', 'aab.md'], ['aab.md', 'b.md']],
		[
			'ascii for the names it sees as the same',
			['file1.md', 'file01.md', 'file001.md', 'cafe.md', 'café.md'],
			['cafe.md', 'café.md', 'file001.md', 'file01.md', 'file1.md'],
		],
	])('has %s', async (name, names, order) => {
		expect(await sorted(names)).toEqual(order);
	});

	test('is turned around with --sort-reverse, also for the names it sees as the same', async () => {
		expect(await sorted(['file1.md', 'file01.md', 'B.md', 'a.md'], {sortReverse: true})).toEqual([
			'file1.md',
			'file01.md',
			'B.md',
			'a.md',
		]);
	});
});
