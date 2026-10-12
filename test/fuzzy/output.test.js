import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr, random} from '../js/helper.js';

describe('--output', () => {
	test('sends exactly what would have been written to the files', async () => {
		const rnd = random(1);
		for (let i = 0; i < 100; i++) {
			const names = ['a', 'b', 'c', 'd']
				.slice(0, 1 + rnd.int(3))
				.map((name) => name + '.file');
			const texts = names.map(() => rnd.text('abAB \næ中', 0, 20));
			const pattern = rnd.pick(['a', 'b+', '^.', '\\s', 'ab']);
			names.forEach((name, n) => fs.writeFileSync(name, texts[n]));

			const out = (await rr(pattern, '_', {includeGlob: names, output: true})).out;
			expect(names.map((name) => fs.readFileSync(name, 'utf8'))).toEqual(texts);

			await rr(pattern, '_', {includeGlob: names});
			expect(out, JSON.stringify({pattern, texts})).toBe(
				names.map((name) => fs.readFileSync(name, 'utf8')).join('')
			);
		}
	});
});
