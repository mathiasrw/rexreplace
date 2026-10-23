import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import path from 'path';
import {rr} from '../helper.js';

const files = () => fs.readdirSync('.', {recursive: true}).sort();

describe('--rename-path', () => {
	test('moves a file with a / in the replacement, and makes the folders', async () => {
		fs.writeFileSync('a.md', 'foo');
		const result = await rr('^', 'docs/old/', {
			includeGlob: ['a.md'],
			renamePath: true,
			verbose: true,
		});
		expect(result.out).toBe('docs/old/a.md\n');
		expect(result.err).toContain('Make folder: docs/old\nRename: a.md to docs/old/a.md\n');
		expect(fs.readFileSync('docs/old/a.md', 'utf8')).toBe('foo');
	});

	test('works on the full path with --full-path', async () => {
		fs.writeFileSync('a.md', 'foo');
		const config = {includeGlob: ['a.md'], renamePath: true, fullPath: true};
		expect((await rr('^.*/a\\.md$', path.resolve('b.md'), config)).out).toBe(
			path.resolve('b.md') + '\n'
		);
		expect(files()).toEqual(['b.md']);
	});
});

describe('--rename-path stops the run before any file is renamed, when planned renames clash', () => {
	const stopped =
		' ❌ Planned renames clash, so no change is applied to any file\n    No further processing.\n\n';

	test('when the same new path is written in two ways', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('b.md', 'foo');
		const config = {includeGlob: ['a.md', './b.md'], renamePath: true};
		expect((await rr('[ab]\\.md$', 'c.md', config)).err).toBe(
			' ❌ Renames to the same path are not allowed.\n    From: ./b.md\n    From: a.md\n    To:   ./c.md\n\n' +
				stopped
		);
		expect(files()).toEqual(['a.md', 'b.md']);
	});
});
