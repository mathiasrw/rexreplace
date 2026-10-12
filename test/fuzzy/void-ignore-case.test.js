import {describe, test, expect} from 'bun:test';
import {rr, random} from '../js/helper.js';

describe('--void-ignore-case', () => {
	test('gives the same as String.replace with and without the i flag', async () => {
		const rnd = random(1);
		for (let i = 0; i < 500; i++) {
			const pattern = rnd.text('abAB.[]', 1, 4).replace(/[\[\]]/g, '');
			const text = rnd.text('abcABC \n', 0, 40);
			const note = JSON.stringify({pattern, text});

			expect((await rr(pattern, '_', {pipedData: text})).out, note).toBe(
				text.replace(new RegExp(pattern || '(?:)', 'gim'), '_')
			);
			expect(
				(await rr(pattern, '_', {pipedData: text, voidIgnoreCase: true})).out,
				note
			).toBe(text.replace(new RegExp(pattern || '(?:)', 'gm'), '_'));
		}
	});
});
