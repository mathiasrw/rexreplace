// https://github.com/mathiasrw/rexreplace/issues/815
// The numbers and the named groups were made with var in front of the code, so code that declared the same name with let or const did not run.
import {describe, test, expect} from 'bun:test';
import {rr} from '../helper.js';

describe('#815 --js code can declare its own variables', () => {
	test.each([
		['a cousin with const', 'o', 'const $n00 = "C"; $n00', 'fCC'],
		['a number with var, as before', 'o', 'var $t = "V"; $t', 'fVV'],
		['a function', 'o', 'function $t() { return "F"; } $t()', 'fFF'],
		['a number with let', 'o', 'let $t = "T"; $t', 'fTT'],
		['a group with const', '(o)', 'const $1 = "X"; $1', 'fXX'],
		['a named group with let', '(?<o>o)', 'let $o = "N"; $o', 'fNN'],
	])('with the name of %s', async (name, pattern, code, out) => {
		expect((await rr(pattern, code, {pipedData: 'foo', replacementJs: true})).out).toBe(out);
	});

	test('the value is still the value of the last statement, also with a comment at the end', async () => {
		expect(
			(await rr('o', 'const a = 1; a + 1 // two', {pipedData: 'foo', replacementJs: true})).out
		).toBe('f22');
	});
});
