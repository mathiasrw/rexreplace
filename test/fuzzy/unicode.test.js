import {describe, test, expect} from 'bun:test';
import {rr, random} from '../js/helper.js';

describe('--unicode', () => {
	const alphabet = ['a', 'b', ' ', '\n', 'æ', '中', '🦖', '🦕', '👍🏽', 'é'];

	test('gives the same as String.replace with and without the u flag', async () => {
		const rnd = random(1);
		for (let i = 0; i < 500; i++) {
			const pattern = rnd.pick([
				'.',
				'..',
				'[^a]',
				'\\S+',
				'a.',
				'.b',
				'[🦖🦕]',
				'🦖+',
				'\\W',
			]);
			const text = rnd.text(alphabet, 0, 15);
			const note = JSON.stringify({pattern, text});

			expect((await rr(pattern, '_', {pipedData: text})).out, note).toBe(
				text.replace(new RegExp(pattern, 'gim'), '_')
			);
			expect((await rr(pattern, '_', {pipedData: text, unicode: true})).out, note).toBe(
				text.replace(new RegExp(pattern, 'gimu'), '_')
			);
		}
	});

	test('sees as many chars as there are code points', async () => {
		const rnd = random(2);
		for (let i = 0; i < 300; i++) {
			const text = rnd.text(alphabet, 0, 15);
			const config = {pipedData: text, unicode: true, dotAll: true};
			expect((await rr('.', '_', config)).out, JSON.stringify(text)).toBe(
				'_'.repeat(Array.from(text).length)
			);
		}
	});
});
