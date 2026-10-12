import {describe, test, expect} from 'bun:test';
import {rr, random} from '../js/helper.js';

describe('--void-global', () => {
	test('gives the same as String.replace without the g flag', async () => {
		const rnd = random(1);
		for (let i = 0; i < 500; i++) {
			const pattern = rnd.text('ab.^$', 1, 3);
			const text = rnd.text('abAB \n', 0, 30);
			expect(
				(await rr(pattern, '_', {pipedData: text, voidGlobal: true})).out,
				JSON.stringify({pattern, text})
			).toBe(text.replace(new RegExp(pattern, 'im'), '_'));
		}
	});

	test('replaces one match at most', async () => {
		const rnd = random(2);
		for (let i = 0; i < 300; i++) {
			const text = rnd.text('ab ', 0, 30);
			const out = (await rr('a', '', {pipedData: text, voidGlobal: true})).out;
			expect(text.length - out.length, text).toBe(text.includes('a') ? 1 : 0);
		}
	});
});
