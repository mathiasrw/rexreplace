import {describe, test, expect} from 'bun:test';
import {rr, random} from '../js/helper.js';

describe('--void-multiline', () => {
	test('gives the same as String.replace with and without the m flag', async () => {
		const rnd = random(1);
		for (let i = 0; i < 500; i++) {
			const pattern = rnd.pick(['^', '$', '^a', 'b$', '^.', '.$', '^$', '^.*$', '^a|b$']);
			const text = rnd.text('ab\n\r', 0, 20);
			const note = JSON.stringify({pattern, text});

			expect((await rr(pattern, '_', {pipedData: text})).out, note).toBe(
				text.replace(new RegExp(pattern, 'gim'), '_')
			);
			expect((await rr(pattern, '_', {pipedData: text, voidMultiline: true})).out, note).toBe(
				text.replace(new RegExp(pattern, 'gi'), '_')
			);
		}
	});
});
