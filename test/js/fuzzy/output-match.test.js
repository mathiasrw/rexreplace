import {describe, test, expect} from 'bun:test';
import {rr, random} from '../helper.js';

describe('--output-match', () => {
	test('prints what String.match finds', () => {
		const rnd = random(1);
		for (let i = 0; i < 500; i++) {
			const pattern = rnd.pick(['a', 'ab', 'a+', '[ab]c', 'b.', '\\S+', 'c$', '^a']);
			const text = rnd.text('abcAB \n', 0, 30);
			const matches = text.match(new RegExp(pattern, 'gim')) || [];
			expect(
				rr(pattern, '_', {pipedData: text, outputMatch: true}).out,
				JSON.stringify({pattern, text})
			).toBe(matches.map((match) => match + '\n').join(''));
		}
	});

	test('prints the groups of what String.matchAll finds', () => {
		const rnd = random(2);
		for (let i = 0; i < 300; i++) {
			const pattern = rnd.pick(['(a)(b)', '(a+)(b*)', '((a)b)', '(.)c(.)', '(\\S)\\s(\\S)']);
			const text = rnd.text('abc \n', 0, 30);
			const matches = Array.from(text.matchAll(new RegExp(pattern, 'gim')));
			expect(
				rr(pattern, '_', {pipedData: text, outputMatch: true}).out,
				JSON.stringify({pattern, text})
			).toBe(matches.map((match) => match.slice(1).join('') + '\n').join(''));
		}
	});
});
