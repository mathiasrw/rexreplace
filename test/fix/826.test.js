// https://github.com/mathiasrw/rexreplace/issues/826
// https://github.com/mathiasrw/rexreplace/issues/848
// https://github.com/mathiasrw/rexreplace/issues/843
// --rename could make a name with a line break, like from the end of a replacement file. A path with a char below space
// is now a clash, and so is a new name of only dots and spaces, or one that ends with a space or a dot.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

const controls = ' ❌ Names can not have characters below space, like a line break or a tab.';
const dots =
	' ❌ A name must have more than dots and spaces, and can not end with a space or a dot.';

describe('#826 a new name with a char below space', () => {
	test('is a clash, also from the line break at the end of a replacement file', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('name.txt', 'b\n');
		const result = await rr('^a', 'name.txt', {
			includeGlob: ['a.md'],
			rename: true,
			replacementFile: true,
		});
		expect(result.err).toStartWith(
			controls + ' Use --trim-file for the line break at the end of a file.'
		);
		expect(result.exit).toBe(3);
		expect(fs.readdirSync('.').sort()).toEqual(['a.md', 'name.txt']);
	});

	test('is fine with --trim-file', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('name.txt', 'b\n');
		const config = {includeGlob: ['a.md'], rename: true, replacementFile: true, trimFile: true};
		expect((await rr('^a', 'name.txt', config)).out).toBe('b.md\n');
	});

	test('is a clash with --rename-path and --js too, and nothing is renamed', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('b.md', 'foo');
		const config = {includeGlob: ['*.md'], renamePath: true, replacementJs: true};
		expect((await rr('^a', '"x\\t"', config)).err).toStartWith(controls);
		expect(fs.readdirSync('.').sort()).toEqual(['a.md', 'b.md']);
	});
});

describe('#848 a path with a char below space in the run', () => {
	test('is a clash, also when the pattern would not change it', async () => {
		fs.writeFileSync('a\tb.md', 'foo');
		fs.writeFileSync('c.md', 'foo');
		const result = await rr('zzz', 'yyy', {includeGlob: ['*.md'], rename: true});
		expect(result.err).toStartWith(controls + '\n    From: a\tb.md\n');
		expect(result.exit).toBe(3);
		expect(fs.readdirSync('.').sort()).toEqual(['a\tb.md', 'c.md']);
	});
});

describe('#843 a new name of only dots and spaces, or with a space or a dot at the end', () => {
	test.each([
		['empty, in a folder', '^x\\.md$', ''],
		['a dot', '^x\\.md$', '.'],
		['two dots', '^x\\.md$', '..'],
		['spaces', '^x\\.md$', '  '],
		['ending with a space', '^x\\.md$', 'x '],
		['ending with a dot', '^x\\.md$', 'x.'],
	])('is a clash when it is %s', async (name, pattern, replacement) => {
		fs.mkdirSync('d');
		fs.writeFileSync('d/x.md', 'foo');
		const result = await rr(pattern, replacement, {includeGlob: ['d/x.md'], rename: true});
		expect(result.err).toStartWith(dots);
		expect(result.err.match(/❌/g)).toHaveLength(2);
		expect(result.exit).toBe(3);
		expect(fs.readdirSync('d')).toEqual(['x.md']);
	});

	test('is fine when it starts with a dot, like .env', async () => {
		fs.writeFileSync('x.md', 'foo');
		expect((await rr('^x\\.md$', '.env', {includeGlob: ['x.md'], rename: true})).out).toBe(
			'.env\n'
		);
	});
});
