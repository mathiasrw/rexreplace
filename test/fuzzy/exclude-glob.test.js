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

describe('--exclude-glob', () => {
	test('leaves out exactly the files the glob finds', async () => {
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
			const [glob, regex] = rnd.pick([
				['a*', /\/a[^/]*$/],
				['*b.file', /b\.file$/],
				['?', /\/.$/],
				['??.file', /\/..\.file$/],
				['[ab]*', /\/[ab][^/]*$/],
				['*c*', /\/[^/]*c[^/]*$/],
				['{a,bb}.file', /\/(a|bb)\.file$/],
			]);
			const expected = names.filter((name) => !regex.test(name)).sort();
			const config = {
				includeGlob: [`run${i}/*`],
				excludeGlob: [`run${i}/${glob}`],
				quiet: true,
			};
			expect((await changed(names, config)).sort(), JSON.stringify({names, glob})).toEqual(
				expected
			);
		}
	});
});
