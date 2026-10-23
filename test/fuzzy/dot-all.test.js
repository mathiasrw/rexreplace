import {describe, test, expect} from 'bun:test';
import {rr, random} from '../helper.js';

describe('--dot-all', () => {
	test('gives the same as String.replace with and without the s flag', async () => {
		const rnd = random(1);
		for (let i = 0; i < 500; i++) {
			const pattern = rnd.text('ab.*+?', 1, 4);
			const text = rnd.text('ab\n\r ', 0, 30);
			const note = JSON.stringify({pattern, text});

			let regex;
			try {
				regex = new RegExp(pattern, 'gim');
			} catch (e) {
				continue;
			}

			expect((await rr(pattern, '_', {pipedData: text})).out, note).toBe(text.replace(regex, '_'));
			expect((await rr(pattern, '_', {pipedData: text, dotAll: true})).out, note).toBe(
				text.replace(new RegExp(pattern, 'gims'), '_')
			);
		}
	});
});
