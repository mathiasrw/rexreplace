// https://github.com/mathiasrw/rexreplace/issues/705
// The engine used to return before the files were done, and there was no way to wait for it.
import {describe, test, expect, spyOn} from 'bun:test';
import fs from 'fs';
import {engine} from '../../../src/engine.ts';
import {rr} from '../helper.js';

const content = (names) => names.map((name) => fs.readFileSync(name, 'utf8'));

// The name of the backup is longer than a file system allows, so the file can not be renamed
const tooLong = 'b'.repeat(240) + '.file';

// Note that rr() from the helper sets voidAsync per default, so the async flow is `voidAsync: false`
const flows = [
	['the async flow', {voidAsync: false}],
	['--void-async', {voidAsync: true}],
];

describe('#705 the engine returns a promise that resolves when all files are done', () => {
	test.each([
		['the async flow', {voidAsync: false}, 1],
		['--void-async', {voidAsync: true}, 1],
		['--keep-backup in the async flow', {voidAsync: false, keepBackup: true}, 2],
		['--void-backup', {voidBackup: true}, 1],
	])('nothing is left to do with %s', async (name, flags, files) => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('o', 'x', {includeGlob: ['my.file'], ...flags});
		expect(result).toEqual({out: '', err: 'my.file \n', exit: null});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
		expect(fs.readdirSync('.')).toHaveLength(files);
	});

	test('waits for every file', async () => {
		const names = Array.from({length: 20}, (_, n) => `my${n}.file`);
		names.forEach((name) => fs.writeFileSync(name, 'foo'));

		const result = await rr('o', 'x', {includeGlob: ['*.file'], voidAsync: false});

		expect(content(names)).toEqual(names.map(() => 'fxx'));
		expect(result.err.trim().split(' \n').sort()).toEqual(names.sort());
		expect(fs.readdirSync('.')).toHaveLength(names.length);
	});

	test('is a promise no matter what there is to do', async () => {
		fs.writeFileSync('my.file', 'foo');
		const write = spyOn(process.stdout, 'write').mockImplementation(() => true);

		try {
			for (const flags of [
				{},
				{voidAsync: true},
				{output: true},
				{outputMatch: true},
				{includeGlob: [], pipedData: 'foo'},
				{includeGlob: ['nope.file'], quietTotal: true},
			]) {
				const done = engine({
					engine: 'default',
					encoding: 'utf8',
					pipedData: null,
					includeGlob: ['my.file'],
					excludeGlob: [],
					excludeRe: [],
					quiet: true,
					pattern: 'o',
					replacement: 'x',
					...flags,
				});
				expect(done).toBeInstanceOf(Promise);
				await done;
			}
		} finally {
			write.mockRestore();
		}
	});

	describe('a file with an error', () => {
		test.each(flows)('does not stop the other files with %s', async (name, flags) => {
			['a.file', tooLong, 'c.file'].forEach((name) => fs.writeFileSync(name, 'foo'));

			const result = await rr('o', 'x', {includeGlob: ['*.file'], ...flags});

			expect(result.err).toContain('ENAMETOOLONG');
			expect(result.exit).toBe(null);
			expect(content(['a.file', tooLong, 'c.file'])).toEqual(['fxx', 'foo', 'fxx']);
			expect(fs.readdirSync('.')).toHaveLength(3);
		});

		test.each(flows)('stops the process with --halt and %s', async (name, flags) => {
			fs.writeFileSync(tooLong, 'foo');
			const result = await rr('o', 'x', {includeGlob: ['*.file'], halt: true, ...flags});
			expect(result.err).toContain('ENAMETOOLONG');
			expect(result.exit).toBe(1);
		});
	});

	describe('the promise is rejected when the work can not be done', () => {
		test('like with an invalid pattern in debug mode', async () => {
			fs.writeFileSync('my.file', 'foo');
			const flags = {includeGlob: ['my.file'], debug: true};
			await expect(rr('(', 'x', flags)).rejects.toThrow('Invalid regular expression');
		});

		test.each(flows)('like with code that fails with %s', async (name, flags) => {
			fs.writeFileSync('my.file', 'foo');
			const config = {includeGlob: ['my.file'], replacementJs: true, ...flags};
			await expect(rr('o', 'nope.nope', config)).rejects.toThrow(ReferenceError);
			expect(fs.readdirSync('.')).toEqual(['my.file']);
		});
	});
});
