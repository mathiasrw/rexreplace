import {describe, test, expect} from 'bun:test';
import {rr, random} from '../js/helper.js';

describe('--void-euro', () => {
	test('€ and $ can be swapped freely unless voided', async () => {
		const rnd = random(1);
		for (let i = 0; i < 300; i++) {
			const pattern = rnd.pick(['(a)(b)', '(a|b)$', '^(.)(.)', '(b+)']);
			const replacement = rnd.text(['$1', '$2', '$&', '$$', '-', 'x'], 0, 4);
			const text = rnd.text('ab \n', 0, 20);
			const expected = text.replace(new RegExp(pattern, 'gim'), replacement);
			const euro = str => str.replace(/\$/g, '€');
			const note = JSON.stringify({pattern, replacement, text});

			expect((await rr(pattern, replacement, {pipedData: text})).out, note).toBe(expected);
			expect((await rr(euro(pattern), euro(replacement), {pipedData: text})).out, note).toBe(
				expected
			);
			expect((await rr(pattern, replacement, {pipedData: text, voidEuro: true})).out, note).toBe(
				expected
			);
		}
	});

	test('a voided € is a char like any other', async () => {
		const rnd = random(2);
		for (let i = 0; i < 300; i++) {
			const text = rnd.text('ab€$ ', 0, 20);
			expect((await rr('€', '<€>', {pipedData: text, voidEuro: true})).out, text).toBe(
				text.split('€').join('<€>')
			);
		}
	});
});
