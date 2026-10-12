import {describe, test, expect} from 'bun:test';
import {rr, random} from '../js/helper.js';

const js = async (pattern, code, pipedData, config) =>
	(await rr(pattern, code, {pipedData, replacementJs: true, ...config})).out;

describe('--replacement-js', () => {
	const alphabet = 'ab01 \t\r\n\\\'"`$€§%&{}[]()*+?.^|#æ中🦖\u2028';

	test('hands over any match untouched', async () => {
		const rnd = random(1);
		for (let i = 0; i < 500; i++) {
			const text = rnd.text(alphabet, 1, 20);
			expect(await js('[^]+', '$0', text), JSON.stringify(text)).toBe(text);
			expect(await js('([^]+)', '$1.length', text), JSON.stringify(text)).toBe(
				String(text.length)
			);
		}
	});

	test('hands over any group untouched', async () => {
		const rnd = random(2);
		for (let i = 0; i < 300; i++) {
			const text = rnd.text(alphabet.replace('🦖', ''), 0, 20);
			expect(await js('(.)(.)', '$2 + $1', text, {dotAll: true}), JSON.stringify(text)).toBe(
				text.replace(/(.)(.)/gs, '$2$1')
			);
		}
	});

	test('does math like javascript', async () => {
		const rnd = random(3);
		for (let i = 0; i < 300; i++) {
			const numbers = Array.from({length: 1 + rnd.int(5)}, () => rnd.int(1000));
			const operator = rnd.pick(['+', '-', '*', '%', '/']);
			const operand = 1 + rnd.int(9);
			expect(await js('(\\d+)', `$1 ${operator} ${operand}`, numbers.join(' '))).toBe(
				numbers.map((n) => eval(`"${n}" ${operator} ${operand}`)).join(' ')
			);
		}
	});
});
