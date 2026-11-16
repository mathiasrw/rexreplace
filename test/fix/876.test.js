// https://github.com/mathiasrw/rexreplace/issues/876
// fast-glob is replaced by tinyglobby, which gives every file in a folder for the name of the folder, unless told not to.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('#876 globs with tinyglobby', () => {
	test('a folder name finds no files, so the files in the folder are not changed', async () => {
		fs.mkdirSync('sub');
		fs.writeFileSync('sub/a.md', 'foo');
		const result = await rr('foo', 'bar', {includeGlob: ['sub']});
		expect(result.out).toBe('');
		expect(fs.readFileSync('sub/a.md', 'utf8')).toBe('foo');
	});

	test('--js code has globs.globSync and globs.sync', async () => {
		fs.writeFileSync('my.file', 'foo');
		const code = 'globs.globSync("*.file").join() + globs.sync("*.file").join()';
		expect(
			(await rr('^[^]*$', code, {includeGlob: ['my.file'], replacementJs: true, output: true})).out
		).toBe('my.filemy.file\n');
	});
});
