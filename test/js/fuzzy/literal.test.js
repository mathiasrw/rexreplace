import {describe, test, expect} from 'bun:test';
import {rr, random} from '../helper.js';

describe('--literal', () => {
	const alphabet = 'abAB01 \t\n-[]{}()*+?.,/\\^$|#\'"`%&;<>!~=:@€§æ中';

	test('finds any text exactly as given', () => {
		const rnd = random(1);
		for (let i = 0; i < 500; i++) {
			const pattern = rnd.text(alphabet, 1, 6);
			const replacement = rnd.text('xy\'"\\\n ', 0, 3);
			const text = Array.from({length: rnd.int(5)}, () => rnd.text(alphabet, 0, 8)).join(
				pattern
			);
			const config = {
				pipedData: text,
				literal: true,
				voidIgnoreCase: true,
				voidEuro: true,
				voidSection: true,
			};

			expect(
				rr(pattern, replacement, config).out,
				JSON.stringify({pattern, replacement, text})
			).toBe(text.split(pattern).join(replacement));
		}
	});

	test('never changes a text that does not contain the pattern', () => {
		const rnd = random(2);
		for (let i = 0; i < 300; i++) {
			const pattern = rnd.text('.*+?()[]{}|^$\\', 1, 5);
			const text = rnd.text('abc \n', 0, 30);
			expect(rr(pattern, 'x', {pipedData: text, literal: true}).out, pattern).toBe(text);
		}
	});
});
