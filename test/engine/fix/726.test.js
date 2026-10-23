// https://github.com/mathiasrw/rexreplace/issues/726
// The working directory was put in front of the path of the file, also when the path was absolute, so the file could not be renamed to its backup and was not changed.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import path from 'path';
import {rr} from '../../helper.js';

// Note that rr() from the helper sets voidAsync per default, so the async flow is `voidAsync: false`
const flows = [
	['the async flow', {voidAsync: false}],
	['--void-async', {voidAsync: true}],
];

// Make `name` with the content `foobar` in a directory that is not the working directory and give the absolute path of it
function outside(name) {
	fs.mkdirSync('work');
	fs.mkdirSync('other');
	const file = path.resolve('other', name);
	fs.writeFileSync(file, 'foobar');
	process.chdir('work');
	return file;
}

describe('#726 a file given with an absolute path is changed', () => {
	test.each(flows)('as a path with %s', async (name, flags) => {
		const file = outside('my.file');
		const result = await rr('o', 'x', {includeGlob: [file], ...flags});
		expect(result).toEqual({out: file + '\n', err: '', exit: null});
		expect(fs.readFileSync(file, 'utf8')).toBe('fxxbar');
		expect(fs.readdirSync(path.dirname(file))).toEqual(['my.file']);
	});

	test.each(flows)('as a glob with %s', async (name, flags) => {
		const file = outside('my.file');
		const glob = path.join(path.dirname(file), '*.file');
		const result = await rr('o', 'x', {includeGlob: [glob], ...flags});
		expect(result).toEqual({out: file + '\n', err: '', exit: null});
		expect(fs.readFileSync(file, 'utf8')).toBe('fxxbar');
		expect(fs.readdirSync(path.dirname(file))).toEqual(['my.file']);
	});

	test('in the working directory', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const file = path.resolve('my.file');
		const result = await rr('o', 'x', {includeGlob: [file]});
		expect(result).toEqual({out: file + '\n', err: '', exit: null});
		expect(fs.readFileSync(file, 'utf8')).toBe('fxxbar');
		expect(fs.readdirSync('.')).toEqual(['my.file']);
	});

	test.each(flows)(
		'--keep-backup puts the backup next to the file with %s',
		async (name, flags) => {
			const file = outside('my.file');
			await rr('o', 'x', {includeGlob: [file], keepBackup: true, ...flags});
			const [backup, ...rest] = fs
				.readdirSync(path.dirname(file))
				.filter(name => name !== 'my.file');
			expect(rest).toEqual([]);
			expect(backup).toMatch(/^my\.file\..+\.backup$/);
			expect(fs.readFileSync(path.join(path.dirname(file), backup), 'utf8')).toBe('foobar');
			expect(fs.readFileSync(file, 'utf8')).toBe('fxxbar');
			expect(fs.readdirSync('.')).toEqual([]);
		}
	);

	test('--replacement-js gets the path of the file as it is', async () => {
		const file = outside('my.file');
		const result = await rr(
			'foobar',
			'[file, dirpath, file_rel, dirpath_rel, typeof mtime].join("|")',
			{
				includeGlob: [file],
				replacementJs: true,
				output: true,
			}
		);
		expect(result.out).toBe(
			[
				file,
				path.dirname(file),
				path.join('..', 'other', 'my.file'),
				path.join('..', 'other'),
				'string',
			].join('|') + '\n'
		);
	});

	test('a relative path still works from the working directory', async () => {
		fs.mkdirSync('sub');
		fs.mkdirSync('sub', {recursive: true});
		fs.writeFileSync('sub/my.file', 'foobar');
		const result = await rr('o', 'x', {
			includeGlob: ['./sub/../sub/my.file'],
			keepBackup: true,
		});
		expect(result.exit).toBe(null);
		expect(fs.readFileSync('sub/my.file', 'utf8')).toBe('fxxbar');
		expect(fs.readdirSync('sub')).toHaveLength(2);
	});
});
