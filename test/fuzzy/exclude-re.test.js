import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr, random} from '../js/helper.js';

// Make `names` as files containing "foo" and return the ones changed by replacing "foo"
const changed = async (names, config) => {
	names.forEach((name) => {
		fs.mkdirSync(name.replace(/[^/]*$/, '') || '.', {recursive: true});
		fs.writeFileSync(name, 'foo');
	});
	await rr('foo', 'x', config);
	return names.filter((name) => 'x' === fs.readFileSync(name, 'utf8'));
};

describe('--exclude-re', () => {
	test('leaves out exactly the files with a matching name', async () => {
		const rnd = random(1);
		for (let i = 0; i < 100; i++) {
			// One name per spelling, as some file systems ignore case
			const names = Array.from(
				new Map(
					Array.from({length: 1 + rnd.int(7)}, () => {
						const name = `run${i}/${rnd.text('abcAB', 1, 4)}.file`;
						return [name.toLowerCase(), name];
					})
				).values()
			);
			const exclude = rnd.pick(['a', 'b$', '/c', 'a.*b', '^run\\d+/a', 'bb|cc', '\\.file$']);
			const voidIgnoreCase = !rnd.int(1);
			const regex = new RegExp(exclude, voidIgnoreCase ? '' : 'i');
			const expected = names.filter((name) => !regex.test(name)).sort();
			const config = {
				includeGlob: [`run${i}/*`],
				excludeRe: [exclude],
				voidIgnoreCase,
				quiet: true,
			};
			expect(
				(await changed(names, config)).sort(),
				JSON.stringify({names, exclude, voidIgnoreCase})
			).toEqual(expected);
		}
	});
});
