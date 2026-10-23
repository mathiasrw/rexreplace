import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import path from 'path';
import {rr, rrStatus} from '../helper.js';

const files = () => fs.readdirSync('.', {recursive: true}).sort();

describe('--rename', () => {
	test('renames each file to the result of the search and replace on its path', async () => {
		fs.writeFileSync('a.markdown', 'foo');
		fs.writeFileSync('b.markdown', 'bar');
		const config = {includeGlob: ['*.markdown'], rename: true};
		expect(await rr('\\.markdown$', '.md', config)).toEqual({
			out: 'a.md\nb.md\n',
			err: '',
			exit: null,
		});
		expect(files()).toEqual(['a.md', 'b.md']);
		expect(fs.readFileSync('a.md', 'utf8')).toBe('foo');
	});

	test('leaves a file where the pattern changes nothing, and names it with --name-all', async () => {
		fs.writeFileSync('a.txt', 'foo');
		fs.writeFileSync('b.md', 'foo');
		const config = {includeGlob: ['*.*'], rename: true};
		expect((await rr('txt', 'text', config)).out).toBe('a.text\n');
		fs.renameSync('a.text', 'a.txt');
		expect((await rr('txt', 'text', {...config, nameAll: true})).out).toBe('a.text\nb.md\n');
		expect(files()).toEqual(['a.text', 'b.md']);
	});

	test('moves a file with a / in the replacement, and makes the folders', async () => {
		fs.writeFileSync('a.md', 'foo');
		const result = await rr('^', 'docs/old/', {includeGlob: ['a.md'], rename: true, verbose: true});
		expect(result.out).toBe('docs/old/a.md\n');
		expect(result.err).toContain('Make folder: docs/old\nRename: a.md to docs/old/a.md\n');
		expect(fs.readFileSync('docs/old/a.md', 'utf8')).toBe('foo');
	});

	test('works on the full path with --full-path', async () => {
		fs.writeFileSync('a.md', 'foo');
		const config = {includeGlob: ['a.md'], rename: true, fullPath: true};
		expect((await rr('a\\.md$', 'b.md', config)).out).toBe(path.resolve('b.md') + '\n');
		expect(files()).toEqual(['b.md']);
	});

	test('runs the code of --replacement-js with the variables of the file', async () => {
		fs.writeFileSync('a.md', 'foo');
		const config = {includeGlob: ['a.md'], rename: true, replacementJs: true};
		expect((await rr('^.*$', 'name.toUpperCase() + ext', config)).out).toBe('A.md\n');
	});

	test('renames only the case of a name', async () => {
		fs.writeFileSync('a.md', 'foo');
		const config = {includeGlob: ['a.md'], rename: true, voidIgnoreCase: true};
		expect(await rr('a', 'A', config)).toEqual({out: 'A.md\n', err: '', exit: null});
		expect(files()).toEqual(['A.md']);
	});

	test('tells the old and the new paths in the status report', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('b.txt', 'foo');
		const status = await rrStatus('md', 'txt', {includeGlob: ['a.md', 'b.txt'], rename: true});
		expect(status.renames).toEqual([{old: 'a.md', new: 'a.txt'}]);
		expect(status.files).toEqual({searched: ['a.md', 'b.txt'], updated: ['a.md']});
	});

	describe.each([['simulate'], ['output']])('with --%s', flag => {
		test('the old names go to stderr and the new ones to stdout, and nothing is renamed', async () => {
			fs.writeFileSync('a.md', 'foo');
			fs.writeFileSync('b.md', 'foo');
			const config = {includeGlob: ['*.md'], rename: true, [flag]: true};
			expect(await rr('md', 'txt', config)).toEqual({
				out: 'a.txt\nb.txt\n',
				err: 'a.md\nb.md\n',
				exit: null,
			});
			expect(files()).toEqual(['a.md', 'b.md']);
			expect((await rrStatus('md', 'txt', config)).renames).toEqual([
				{old: 'a.md', new: 'a.txt'},
				{old: 'b.md', new: 'b.txt'},
			]);
		});
	});

	test('with --output-match the matches go to stdout and the names to stderr', async () => {
		fs.writeFileSync('a.md', 'foo');
		const config = {includeGlob: ['a.md'], rename: true, outputMatch: true};
		expect(await rr('md', '_', config)).toEqual({out: 'md\n', err: 'a.md\n', exit: null});
		expect(files()).toEqual(['a.md']);
	});
});

describe('--rename with --keep-backup', () => {
	test('keeps the old file', async () => {
		fs.writeFileSync('a.md', 'foo');
		const config = {includeGlob: ['a.md'], rename: true, keepBackup: true, verbose: true};
		const result = await rr('md', 'txt', config);
		expect(result.out).toBe('a.txt\n');
		expect(result.err).toContain('Copy: a.md to a.txt\n');
		expect(files()).toEqual(['a.md', 'a.txt']);
		expect(fs.readFileSync('a.txt', 'utf8')).toBe('foo');
	});
});

describe('--rename stops the run before any file is renamed, when planned renames clash', () => {
	const stopped =
		' ❌ Planned renames clash, so no change is applied to any file\n    No further processing.\n\n';

	test('when two files would get the same new path', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('b.md', 'foo');
		expect(await rr('^[ab]', 'c', {includeGlob: ['*.md'], rename: true})).toEqual({
			out: '',
			err:
				' ❌ Renames to the same path are not allowed.\n    From: a.md\n    From: b.md\n    To:   c.md\n\n' +
				stopped,
			exit: 3,
		});
		expect(files()).toEqual(['a.md', 'b.md']);
	});

	test('when the same new path is written in two ways', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('b.md', 'foo');
		const config = {includeGlob: ['a.md', './b.md'], rename: true};
		expect((await rr('[ab]\\.md$', 'c.md', config)).err).toBe(
			' ❌ Renames to the same path are not allowed.\n    From: ./b.md\n    From: a.md\n    To:   ./c.md\n\n' +
				stopped
		);
		expect(files()).toEqual(['a.md', 'b.md']);
	});

	test('when two files would swap names', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('b.md', 'bar');
		const config = {includeGlob: ['*.md'], rename: true, replacementJs: true};
		expect(await rr('^[ab]', '$0 == "a" ? "b" : "a"', config)).toEqual({
			out: '',
			err:
				' ❌ Renames clashing with other files in this run are not allowed.\n    From: a.md\n    To:   b.md\n\n' +
				' ❌ Renames clashing with other files in this run are not allowed.\n    From: b.md\n    To:   a.md\n\n' +
				stopped,
			exit: 3,
		});
		expect(fs.readFileSync('a.md', 'utf8')).toBe('foo');
	});

	test('when the new path is a file in the run that keeps its name', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('b.txt', 'bar');
		expect(await rr('^a\\.md$', 'b.txt', {includeGlob: ['a.md', 'b.txt'], rename: true})).toEqual({
			out: '',
			err:
				' ❌ Renames clashing with other files in this run are not allowed.\n    From: a.md\n    To:   b.txt\n\n' +
				stopped,
			exit: 3,
		});
		expect(fs.readFileSync('b.txt', 'utf8')).toBe('bar');
	});

	test('when two new paths differ only in case, as they are the same file on some file systems', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('b.md', 'bar');
		const config = {includeGlob: ['*.md'], rename: true, replacementJs: true};
		expect(await rr('^[ab]', '$0 == "a" ? "X" : "x"', config)).toEqual({
			out: '',
			err:
				' ❌ Renames to the same path are not allowed.\n    From: a.md\n    From: b.md\n    To:   X.md\n\n' +
				stopped,
			exit: 3,
		});
		expect(files()).toEqual(['a.md', 'b.md']);
	});

	test('when the new path is a file already, and other files are fine', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('a.txt', 'bar');
		fs.writeFileSync('b.md', 'foo');
		expect(await rr('md', 'txt', {includeGlob: ['*.md'], rename: true})).toEqual({
			out: '',
			err:
				' ❌ Renames clashing with files that are there already are not allowed without --rename-force.\n    From: a.md\n    To:   a.txt\n\n' +
				stopped,
			exit: 3,
		});
		expect(files()).toEqual(['a.md', 'a.txt', 'b.md']);
	});

	test('with --simulate too', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('a.txt', 'bar');
		expect(
			(await rr('md', 'txt', {includeGlob: ['a.md'], rename: true, simulate: true})).exit
		).toBe(3);
	});
});

describe('--rename can not be used', () => {
	test('with piped data, as it has no name', async () => {
		const result = await rr('o', 'x', {pipedData: 'foo', rename: true});
		expect(result.err).toStartWith(' ❌ --rename needs files');
		expect(result.exit).toBe(3);
	});
});
