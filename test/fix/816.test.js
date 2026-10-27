// https://github.com/mathiasrw/rexreplace/issues/816
// A named group with a letter that is not ASCII was not seen in the code, so the code ran once per file, where the group was not there.
import {describe, test, expect} from 'bun:test';
import {rr} from '../helper.js';

describe('#816 named groups with letters that are not ASCII', () => {
	test.each([
		['año', '(?<año>\\d)', '"[" + $año + "]"', 'a[1]b[2]'],
		['日', '(?<日>\\d)', '$日 * 2', 'a2b4'],
		['año with a space at the end', '(?<año>\\d)', '$año_ + "|"', 'a1 |b2 |'],
		['𝒜, outside the BMP', '(?<𝒜>\\d)', '$𝒜 * 2', 'a2b4'],
		['$é, with $', '(?<$é>\\d)', '$$é * 2', 'a2b4'],
		['Æble, in uppercase', '(?<Æble>\\d)', '$Æble * 2', 'a2b4'],
		['x٣, with a digit that is not ASCII', '(?<x٣>\\d)', '$x٣ * 2', 'a2b4'],
	])('can be used, like %s', async (name, pattern, code, out) => {
		expect((await rr(pattern, code, {pipedData: 'a1b2', replacementJs: true})).out).toBe(out);
	});

	test('can end with _', async () => {
		expect((await rr('(?<año_>x)', '$año_', {pipedData: 'x', replacementJs: true})).out).toBe('x');
	});

	test('are read from the regex, so text that only looks like a group is not one', async () => {
		const config = {replacementJs: true};
		expect((await rr('\\(?<a_>b', '"z"', {...config, pipedData: 'x(?<a_>b'})).out).toBe('x(?z');
		expect((await rr('[(?<a_>]', '"z"', {...config, pipedData: 'ab'})).out).toBe('zb');
	});

	test('are only seen as the whole name, so $years is not the group year', async () => {
		const result = await rr('(?<year>\\d)', '$years', {pipedData: '1', replacementJs: true});
		expect(result.err).toContain('ReferenceError: $years is not defined');
		expect(result.exit).toBe(3);
	});

	test('can be used with a space at the end on its own, like $year_', async () => {
		const config = {pipedData: '2024', replacementJs: true};
		expect((await rr('(?<year>\\d+)', '$year_ + "|"', config)).out).toBe('2024 |');
	});
});
