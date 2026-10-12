import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr, random} from '../js/helper.js';

// Make `names` as files containing "foo" and return the ones changed by replacing "foo"
const changed = (names, config) => {
	names.forEach((name) => {
		fs.mkdirSync(name.replace(/[^/]*$/, '') || '.', {recursive: true});
		fs.writeFileSync(name, 'foo');
	});
	rr('foo', 'x', config);
	return names.filter((name) => 'x' === fs.readFileSync(name, 'utf8'));
};

describe('--exclude-re', () => {
	test('leaves out exactly the files with a matching name', () => {
		const rnd = random(1);
		for (let i = 0; i < 100; i++) {
			const names = Array.from(
				new Set(
					Array.from(
						{length: 1 + rnd.int(7)},
						() => `run${i}/${rnd.text('abc', 1, 4)}.file`
					)
				)
			);
			const exclude = rnd.pick(['a', 'b$', '/c', 'a.*b', '^run\\d+/a', 'bb|cc', '\\.file$']);
			const expected = names.filter((name) => !new RegExp(exclude).test(name)).sort();
			const config = {includeGlob: [`run${i}/*`], excludeRe: [exclude], quiet: true};
			expect(changed(names, config).sort(), JSON.stringify({names, exclude})).toEqual(
				expected
			);
		}
	});
});
