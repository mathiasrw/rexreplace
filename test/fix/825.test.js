// https://github.com/mathiasrw/rexreplace/issues/825
// A named group was a variable like _year, which could clash: with groups a and a_, _a_ was both a_ and a with a space,
// and a group named _require_ broke r().
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

const js = {pipedData: 'in 1999 and 2024', replacementJs: true};

describe('#825 named groups in --js', () => {
	test.each([
		['a name in lowercase', '(?<year>\\d+)', '"<" + rr_year + ">"', 'in <1999> and <2024>'],
		[
			'the cousin with a space at the end',
			'(?<year>\\d+)',
			'rr_year + "," + rr_year_',
			'in 1999,1999  and 2024,2024 ',
		],
		['a name in uppercase', '(?<Year>\\d+)', '"Y" + rr_Year', 'in Y1999 and Y2024'],
		['a name with a number', '(?<y2k>\\d+)', '"Y" + rr_y2k', 'in Y1999 and Y2024'],
		['a name with $', '(?<a$>\\d+)', '"Y" + rr_a$', 'in Y1999 and Y2024'],
		['two names that only differ by case', '(?<y>\\d)(?<Y>\\d)', 'rr_Y + rr_y', 'in 9199 and 0242'],
		['a name next to its number', '(?<year>\\d+)', '$1 + rr_year', 'in 19991999 and 20242024'],
	])('gives %s', async (name, pattern, code, out) => {
		expect(await rr(pattern, code, js)).toEqual({out, err: '', exit: null});
	});

	test('have rr_ in front, so they can not clash with what RexReplace uses', async () => {
		// With _ in front, the group _require with a space was __require_, which r() uses itself.
		// $1 makes the code run once per match, where the variables of the groups are made.
		const config = {pipedData: 'ab', replacementJs: true};
		expect((await rr('(?<_require>a)', '$1 + r("path").sep', config)).out).toBe('a/b');
	});

	test('are gone with _ in front', async () => {
		expect((await rr('(?<year>\\d+)', '_year', js)).err).toContain('ReferenceError');
	});
});

describe('#825 a named group that ends with _', () => {
	test.each([['a_'], ['Year_'], ['_'], ['y2_']])(
		'panics for %s, as that is the name of another group with a space, and nothing is changed',
		async name => {
			fs.writeFileSync('a.md', 'in 1999');
			const result = await rr(`(?<${name}>\\d+)`, '"x"', {
				includeGlob: ['a.md'],
				replacementJs: true,
			});
			expect(result).toEqual({
				out: '',
				err: ` ❌ A named group can not end with _\n    ${name}\n    No further processing.\n\n`,
				exit: 3,
			});
			expect(fs.readFileSync('a.md', 'utf8')).toBe('in 1999');
		}
	);

	test('is fine with --output-match, as the code is not run', async () => {
		const config = {pipedData: 'ab', replacementJs: true, outputMatch: true};
		expect((await rr('(?<a_>a)', 'x', config)).exit).toBe(null);
	});

	test('is fine without --js, as there are no variables then', async () => {
		expect((await rr('(?<a_>o)', 'x', {pipedData: 'foo'})).out).toBe('fxx');
	});
});
