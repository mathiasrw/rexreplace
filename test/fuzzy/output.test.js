import {describe, test, expect} from 'bun:test';
import {rr, random, ended} from '../js/helper.js';

const read = (names) => Promise.all(names.map((name) => Bun.file(name).text()));

describe('--output', () => {
	test('sends exactly what would have been written to the files with the content delimiter after each', async () => {
		const rnd = random(1);
		for (let i = 0; i < 100; i++) {
			const names = ['a', 'b', 'c', 'd', 'e', 'f']
				.slice(0, 1 + rnd.int(5))
				.map((name) => name + '.file');
			const texts = names.map(() => rnd.text('abAB01 \t\r\n\0\\\'"`$€§æ中🦖', 0, 200));
			const pattern = rnd.pick(['a', 'b+', '^.', '\\s', 'ab', '$', '\\r?\\n']);
			// null is the default: a line break, unless the content already ends with one
			const contentDelimiter = rnd.pick([null, '', '\n', '\0', ', ']);
			for (const [n, name] of names.entries()) {
				await Bun.write(name, texts[n]);
			}

			const config = {includeGlob: names, output: true, contentDelimiter};
			// As UTF-8 like stdout and the files, so half an emoji (from `.` without --unicode) becomes `�` in both
			const out = Buffer.from((await rr(pattern, '_', config)).out).toString();
			expect(await read(names)).toEqual(texts);

			await rr(pattern, '_', {includeGlob: names});
			expect(out, JSON.stringify({pattern, contentDelimiter, texts})).toBe(
				null === contentDelimiter
					? ended(...(await read(names)))
					: (await read(names)).map((text) => text + contentDelimiter).join('')
			);
		}
	});
});
