import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr, random} from '../js/helper.js';

describe('--void-async', () => {
	test('the sync and the async flow end up with the same files', async () => {
		const rnd = random(1);
		for (let i = 0; i < 30; i++) {
			const names = ['a', 'b', 'c', 'd', 'e'].slice(0, 1 + rnd.int(4));
			const texts = names.map(() => rnd.text('ab \næ🦖', 0, 20));
			const pattern = rnd.pick(['a', 'b+', '\\s', 'ab']);
			const expected = texts.map(text => text.replace(new RegExp(pattern, 'gim'), '_'));
			const result = dir => names.map(name => fs.readFileSync(dir + name, 'utf8'));

			const [sync, async] = [`sync${i}/`, `async${i}/`];
			[sync, async].forEach(dir => {
				fs.mkdirSync(dir, {recursive: true});
				names.forEach((name, n) => fs.writeFileSync(dir + name, texts[n]));
			});

			await rr(pattern, '_', {includeGlob: [sync + '*'], voidAsync: true});
			await rr(pattern, '_', {includeGlob: [async + '*'], voidAsync: false});

			const note = JSON.stringify({pattern, texts});
			expect(result(sync), note).toEqual(expected);
			expect(result(async), note).toEqual(expected);
			expect(fs.readdirSync(async), note).toHaveLength(names.length);
		}
	});
});
