// https://github.com/mathiasrw/rexreplace/issues/799
// Named groups had no variable in --js, and a pattern with one gave the position of the match as an extra group variable.
import {describe, test, expect} from 'bun:test';
import {rr} from '../helper.js';

describe('#799 groups in --js', () => {
	test('only the groups of the pattern get a variable, also with a named group', async () => {
		const config = {pipedData: 'ab', replacementJs: true};
		expect((await rr('(?<x>a)(b)', '$1 + $2 + typeof $3', config)).out).toBe('abundefined');
	});

	test('a named group is a variable with _ in front, and _ at the end has a space', async () => {
		const config = {pipedData: '2024-05 1999-12', replacementJs: true};
		const pattern = '(?<year>\\d{4})-(?<month>\\d\\d)';
		expect((await rr(pattern, '_month + "/" + _year', config)).out).toBe('05/2024 12/1999');
		expect((await rr(pattern, '_month_ + _year', config)).out).toBe('05 2024 12 1999');
	});

	test('a named group that took no part in the match is undefined', async () => {
		const config = {pipedData: 'ab', replacementJs: true};
		expect((await rr('(?<x>a)|(?<y>b)', 'String(_x) + String(_y) + ","', config)).out).toBe(
			'aundefined,undefinedb,'
		);
	});
});
