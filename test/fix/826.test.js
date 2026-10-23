// https://github.com/mathiasrw/rexreplace/issues/826
// --rename put control characters into the new name, like the line break at the end of a replacement file.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('#826 control characters in a new name', () => {
	test('are removed, like the line break at the end of a replacement file', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('name.txt', 'b\n');
		const config = {includeGlob: ['a.md'], rename: true, replacementFile: true, verbose: true};
		const result = await rr('^a', 'name.txt', config);
		expect(result.out).toBe('b.md\n');
		expect(result.err).toContain('Removed control characters from the new name of: a.md');
		expect(fs.readdirSync('.').sort()).toEqual(['b.md', 'name.txt']);
	});

	test('are removed with --rename-path too, also a tab, a null byte and DEL', async () => {
		fs.writeFileSync('a.md', 'foo');
		const config = {includeGlob: ['a.md'], renamePath: true};
		expect((await rr('^a', 'b\t\0\x7f\x01c', config)).out).toBe('bc.md\n');
		expect(fs.readdirSync('.')).toEqual(['bc.md']);
	});

	test('are only removed from what the replacement puts in', async () => {
		fs.writeFileSync('a\tb.md', 'foo');
		fs.writeFileSync('c.md', 'foo');
		expect((await rr('zzz', 'yyy', {includeGlob: ['*.md'], rename: true})).out).toBe('');
		expect(fs.readdirSync('.').sort()).toEqual(['a\tb.md', 'c.md']);
		fs.mkdirSync('d\t');
		fs.writeFileSync('d\t/a.md', 'foo');
		expect((await rr('a\\.md', 'b.md', {includeGlob: ['d\t/a.md'], renamePath: true})).out).toBe(
			'd\t/b.md\n'
		);
	});

	test('are removed in the C1 range and the line separators too', async () => {
		fs.writeFileSync('a.md', 'foo');
		expect((await rr('^a', 'b\x85\u2028c', {includeGlob: ['a.md'], rename: true})).out).toBe(
			'bc.md\n'
		);
	});

	test('can not leave an empty name', async () => {
		fs.writeFileSync('x.md', 'foo');
		const result = await rr('^x\\.md$', '\t', {includeGlob: ['x.md'], rename: true});
		expect(result.err).toStartWith(' ❌ A name can not be empty, "." or "..".');
		expect(result.exit).toBe(3);
		expect(fs.readdirSync('.')).toEqual(['x.md']);
	});
});
