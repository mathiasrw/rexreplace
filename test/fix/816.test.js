// https://github.com/mathiasrw/rexreplace/issues/816
// A named group with a letter that is not ASCII was not seen in the code, so the code ran once per file, where the group was not there.
import {describe, test, expect} from 'bun:test';
import {rr} from '../helper.js';

describe('#816 named groups with letters that are not ASCII', () => {
	test.each([
		['año', '(?<año>\\d)', '"[" + rr_año + "]"', 'a[1]b[2]'],
		['日', '(?<日>\\d)', 'rr_日 * 2', 'a2b4'],
	])('can be used, like %s', async (name, pattern, code, out) => {
		expect((await rr(pattern, code, {pipedData: 'a1b2', replacementJs: true})).out).toBe(out);
	});

	test('can not end with _ either', async () => {
		const result = await rr('(?<año_>x)', 'rr_año', {pipedData: 'x', replacementJs: true});
		expect(result.err).toStartWith(' ❌ A named group can not end with _: año_');
		expect(result.exit).toBe(3);
	});
});
