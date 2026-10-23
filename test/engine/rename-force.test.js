import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('--rename-force', () => {
	test('writes over a file that is there already', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('a.txt', 'bar');
		const config = {includeGlob: ['a.md'], rename: true, renameForce: true, verbose: true};
		const result = await rr('md', 'txt', config);
		expect(result.out).toBe('a.txt\n');
		expect(result.err).toContain('Write over: a.txt\nRename: a.md to a.txt\n');
		expect(fs.readdirSync('.')).toEqual(['a.txt']);
		expect(fs.readFileSync('a.txt', 'utf8')).toBe('foo');
	});

	test('does not write over a file that is renamed in the same run', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('b.md', 'bar');
		const config = {includeGlob: ['*.md'], rename: true, renameForce: true, replacementJs: true};
		expect((await rr('^[ab]', '$0 == "a" ? "b" : "a"', config)).exit).toBe(3);
		expect(fs.readFileSync('a.md', 'utf8')).toBe('foo');
	});

	test('does not write over a file in the run that keeps its name', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('b.txt', 'bar');
		const config = {includeGlob: ['a.md', 'b.txt'], rename: true, renameForce: true};
		expect((await rr('^a\\.md$', 'b.txt', config)).exit).toBe(3);
		expect(fs.readFileSync('b.txt', 'utf8')).toBe('bar');
	});

	test('does not let two new paths differ only in case', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('b.md', 'bar');
		const config = {includeGlob: ['*.md'], rename: true, renameForce: true, replacementJs: true};
		expect((await rr('^[ab]', '$0 == "a" ? "X" : "x"', config)).exit).toBe(3);
		expect(fs.readdirSync('.').sort()).toEqual(['a.md', 'b.md']);
	});

	test('does not let two files get the same new path', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('b.md', 'bar');
		const config = {includeGlob: ['*.md'], rename: true, renameForce: true};
		expect((await rr('^[ab]', 'c', config)).exit).toBe(3);
		expect(fs.readdirSync('.').sort()).toEqual(['a.md', 'b.md']);
	});
});
