import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {rr, rrStatus} from '../helper.js';

const files = () => fs.readdirSync('.', {recursive: true}).sort();

// On a file system that is case-sensitive (like on Linux), `a.md` and `A.md` can be two files
const caseSensitive = (() => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rexreplace-case-'));
	fs.writeFileSync(path.join(dir, 'a'), '');
	const result = !fs.existsSync(path.join(dir, 'A'));
	fs.rmSync(dir, {recursive: true});
	return result;
})();

describe('--rename', () => {
	test('renames each file to the result of the search and replace on its name', async () => {
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

	test('leaves the folder as it is', async () => {
		fs.mkdirSync('docs');
		fs.writeFileSync('docs/docs.md', 'foo');
		expect((await rr('^docs', 'notes', {includeGlob: ['docs/*'], rename: true})).out).toBe(
			'docs/notes.md\n'
		);
		expect(files()).toEqual(['docs', 'docs/notes.md']);
	});

	test('a / in the new name stops the run, as that is --rename-path', async () => {
		fs.writeFileSync('a.md', 'foo');
		expect(await rr('^', 'sub/', {includeGlob: ['a.md'], rename: true})).toEqual({
			out: '',
			err:
				' ❌ Renames with a / in the new name are not allowed. Use --rename-path to move files.\n    From: a.md\n    To:   sub/a.md\n\n' +
				' ❌ Planned renames clash, so no change is applied to any file\n    No further processing.\n\n',
			exit: 3,
		});
		expect(files()).toEqual(['a.md']);
	});

	test('runs the code of --replacement-js with the name as the text', async () => {
		fs.mkdirSync('docs');
		fs.writeFileSync('docs/Intro.md', 'foo');
		const config = {includeGlob: ['docs/*'], rename: true, replacementJs: true};
		expect((await rr('^.*$', 'text.toLowerCase()', config)).out).toBe('docs/intro.md\n');
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

	test('tells in the status report only the renames that were done', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.mkdirSync('locked');
		fs.writeFileSync('locked/b.md', 'foo');
		fs.chmodSync('locked', 0o555);
		try {
			const status = await rrStatus('md', 'txt', {
				includeGlob: ['a.md', 'locked/b.md'],
				rename: true,
			});
			expect(status.renames).toEqual([{old: 'a.md', new: 'a.txt'}]);
			expect(status.errors[0]).toContain('EACCES');
		} finally {
			fs.chmodSync('locked', 0o755);
		}
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

	test('with --output-match the matches go to stdout and the names to stderr, and nothing would be renamed', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('b.md', 'foo');
		// The replacement is not used, so `_` gives no clash
		const config = {includeGlob: ['*.md'], rename: true, outputMatch: true};
		expect(await rr('^[ab]', '_', config)).toEqual({
			out: 'a\nb\n',
			err: 'a.md\nb.md\n',
			exit: null,
		});
		expect((await rrStatus('^[ab]', '_', config)).renames).toEqual([]);
		expect(files()).toEqual(['a.md', 'b.md']);
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

	test.if(caseSensitive)(
		'when the new path is another file in the run that differs only in case',
		async () => {
			fs.writeFileSync('a.md', 'foo');
			fs.writeFileSync('A.md', 'bar');
			const config = {includeGlob: ['a.md', 'A.md'], rename: true, voidIgnoreCase: true};
			expect((await rr('^a', 'A', config)).err).toBe(
				' ❌ Renames clashing with other files in this run are not allowed.\n    From: a.md\n    To:   A.md\n\n' +
					stopped
			);
			expect(fs.readFileSync('A.md', 'utf8')).toBe('bar');
		}
	);

	test.if(caseSensitive)(
		'when the new path is a file outside the run that differs only in case',
		async () => {
			fs.writeFileSync('a.md', 'foo');
			fs.writeFileSync('A.md', 'bar');
			const config = {includeGlob: ['a.md'], rename: true, voidIgnoreCase: true};
			expect((await rr('^a', 'A', config)).err).toBe(
				' ❌ Renames clashing with files that are there already are not allowed without --rename-force.\n    From: a.md\n    To:   A.md\n\n' +
					stopped
			);
			expect(fs.readFileSync('A.md', 'utf8')).toBe('bar');
		}
	);

	test('with --simulate too', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('a.txt', 'bar');
		expect(
			(await rr('md', 'txt', {includeGlob: ['a.md'], rename: true, simulate: true})).exit
		).toBe(3);
	});
});

describe('--rename can not be used', () => {
	test('with --rename-path', async () => {
		fs.writeFileSync('a.md', 'foo');
		expect(
			(await rr('md', 'txt', {includeGlob: ['a.md'], rename: true, renamePath: true})).exit
		).toBe(3);
		expect(files()).toEqual(['a.md']);
	});

	test('with piped data, as it has no name', async () => {
		const result = await rr('o', 'x', {pipedData: 'foo', rename: true});
		expect(result.err).toStartWith(' ❌ --rename and --rename-path need files');
		expect(result.exit).toBe(3);
	});
});
