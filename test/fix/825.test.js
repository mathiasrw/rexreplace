// https://github.com/mathiasrw/rexreplace/issues/825
// A named group was a variable like _year, which could clash: with groups a and a_, _a_ was both a_ and a with a space,
// and a group named _require_ broke r().
import {describe, test, expect} from 'bun:test';
import {rr} from '../helper.js';

const js = {pipedData: 'in 1999 and 2024', replacementJs: true};

describe('#825 named groups in --js', () => {
	test.each([
		['a name in lowercase', '(?<year>\\d+)', '"<" + $year + ">"', 'in <1999> and <2024>'],
		[
			'the cousin with a space at the end',
			'(?<year>\\d+)',
			'$year + "," + $year_',
			'in 1999,1999  and 2024,2024 ',
		],
		['a name in uppercase', '(?<Year>\\d+)', '"Y" + $Year', 'in Y1999 and Y2024'],
		['a name with a number', '(?<y2k>\\d+)', '"Y" + $y2k', 'in Y1999 and Y2024'],
		['a name with $', '(?<a$>\\d+)', '"Y" + $a$', 'in Y1999 and Y2024'],
		['two names that only differ by case', '(?<y>\\d)(?<Y>\\d)', '$Y + $y', 'in 9199 and 0242'],
		['a name next to its number', '(?<year>\\d+)', '$1 + $year', 'in 19991999 and 20242024'],
	])('gives %s', async (name, pattern, code, out) => {
		expect(await rr(pattern, code, js)).toEqual({out, err: '', exit: null});
	});

	test('have $ in front, so they can not clash with what RexReplace uses', async () => {
		// With _ in front, the group _require with a space was __require_, which r() uses itself.
		// $1 makes the code run once per match, where the variables of the groups are made.
		const config = {pipedData: 'ab', replacementJs: true};
		expect((await rr('(?<_require>a)', '$1 + r("path").sep', config)).out).toBe('a/b');
	});

	test('are gone with _ in front', async () => {
		expect((await rr('(?<year>\\d+)', '_year', js)).err).toContain('ReferenceError');
	});
});

describe('#825 a named group with the name of another variable', () => {
	// The variables of the groups come after the others, so the group wins
	test('wins over the number, like n over $n, but not over its cousins with zeros', async () => {
		expect((await rr('(?<n>\\w)', '$n + $n_ + $n00', {...js, pipedData: 'ab'})).out).toBe(
			'aa 001bb 001'
		);
	});

	test('can end with _, and then wins over the cousin with a space of the group without it', async () => {
		expect((await rr('(?<a>\\d)(?<a_>\\w)', '$a + $a_', {...js, pipedData: '1x'})).out).toBe('1x');
	});
});
