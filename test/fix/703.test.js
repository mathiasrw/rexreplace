// https://github.com/mathiasrw/rexreplace/issues/703
// The names of the affected files were printed to stderr, so they could not be piped on their own.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import path from 'path';
import {rr} from '../helper.js';

// Note that rr() from the helper sets voidAsync per default, so the names come in the order of the file list

// Most tests replace in a.file, b.file and c.file, where b.file has nothing to replace
describe('#703 the names of affected files', () => {
	test('go to stdout with one name on each line', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'bar');
		fs.writeFileSync('c.file', 'foo');
		expect(await rr('o', 'x', {includeGlob: ['*.file']})).toEqual({
			out: 'a.file\nc.file\n',
			err: '',
			exit: null,
		});
		expect(fs.readFileSync('a.file', 'utf8')).toBe('fxx');
	});

	// A file is named when the result differs from the content, so `rexreplace o o` names nothing
	test.todo(
		'could be faster by tracking if there was a match instead of comparing the result with the content'
	);

	test('all come with the async flow', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'bar');
		fs.writeFileSync('c.file', 'foo');
		const result = await rr('o', 'x', {includeGlob: ['*.file'], voidAsync: false});
		expect(result.out.split('\n').sort()).toEqual(['', 'a.file', 'c.file']);
		expect(result.err).toBe('');
	});

	test('are alone on stdout with --verbose', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'bar');
		fs.writeFileSync('c.file', 'foo');
		const result = await rr('o', 'x', {includeGlob: ['*.file'], verbose: true});
		expect(result.out).toBe('a.file\nc.file\n');
		expect(result.err).toContain('Open sync: a.file');
		expect(result.err).toContain('Nothing changed in: b.file');
	});

	test.each(['quiet', 'quietTotal'])('are not printed with --%s', async flag => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'bar');
		fs.writeFileSync('c.file', 'foo');
		expect(await rr('o', 'x', {includeGlob: ['*.file'], [flag]: true})).toEqual({
			out: '',
			err: '',
			exit: null,
		});
		expect(fs.readFileSync('c.file', 'utf8')).toBe('fxx');
	});

	test('are not printed for piped data', async () => {
		expect(await rr('o', 'x', {pipedData: 'foo'})).toEqual({out: 'fxx', err: '', exit: null});
		expect(await rr('o', 'x', {pipedData: 'foo', outputMatch: true})).toEqual({
			out: 'o\no\n',
			err: '',
			exit: null,
		});
	});

	test('are printed the way the path was given', async () => {
		fs.mkdirSync('sub', {recursive: true});
		fs.writeFileSync('sub/my.file', 'foo');
		expect((await rr('o', 'x', {includeGlob: ['sub/*.file']})).out).toBe('sub/my.file\n');

		const file = path.resolve('sub/my.file');
		expect((await rr('x', 'o', {includeGlob: [file]})).out).toBe(file + '\n');
	});

	describe('--null-out', () => {
		test('ends each name with a null byte', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect(await rr('o', 'x', {includeGlob: ['*.file'], nullOut: true})).toEqual({
				out: 'a.file\0c.file\0',
				err: '',
				exit: null,
			});
		});

		test('keeps a name with a line break in one piece', async () => {
			fs.writeFileSync('my\n.file', 'foo');
			expect((await rr('o', 'x', {includeGlob: ['*.file'], nullOut: true})).out).toBe(
				'my\n.file\0'
			);
		});
	});

	describe('--name-delimiter', () => {
		test('is put after each name', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect(await rr('o', 'x', {includeGlob: ['*.file'], nameDelimiter: ', '})).toEqual({
				out: 'a.file, c.file, ',
				err: '',
				exit: null,
			});
		});

		test('can be an empty string', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect((await rr('o', 'x', {includeGlob: ['*.file'], nameDelimiter: ''})).out).toBe(
				'a.filec.file'
			);
		});

		test('has the € and § aliases like the replacement', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect((await rr('o', 'x', {includeGlob: ['*.file'], nameDelimiter: '€§'})).out).toBe(
				'a.file$\\c.file$\\'
			);
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect(
				(await rr('o', 'x', {includeGlob: ['*.file'], nameDelimiter: '€§', voidEuro: true})).out
			).toBe('a.file€\\c.file€\\');
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect(
				(await rr('o', 'x', {includeGlob: ['*.file'], nameDelimiter: '€§', voidSection: true})).out
			).toBe('a.file$§c.file$§');
		});
	});

	describe('--no-name-delimiter-tail', () => {
		test('puts the delimiter only between the names', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect(
				(
					await rr('o', 'x', {
						includeGlob: ['*.file'],
						nameDelimiter: ', ',
						nameDelimiterTail: false,
					})
				).out
			).toBe('a.file, c.file');
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect((await rr('o', 'x', {includeGlob: ['*.file'], nameDelimiterTail: false})).out).toBe(
				'a.file\nc.file'
			);
		});

		test('prints no delimiter when only one file is changed', async () => {
			fs.writeFileSync('my.file', 'foo');
			const config = {
				includeGlob: ['my.file'],
				nameDelimiter: ', ',
				nameDelimiterTail: false,
			};
			expect((await rr('o', 'x', config)).out).toBe('my.file');
		});

		test('does not start the next run with a delimiter', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			await rr('o', 'x', {includeGlob: ['*.file'], nameDelimiter: ', ', nameDelimiterTail: false});
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect(
				(
					await rr('o', 'x', {
						includeGlob: ['*.file'],
						nameDelimiter: ', ',
						nameDelimiterTail: false,
					})
				).out
			).toBe('a.file, c.file');
		});

		// The names must not be held back until all files are done
		test('prints the files changed before the run is stopped by --halt', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.mkdirSync('locked', {recursive: true});
			fs.writeFileSync('locked/b.file', 'foo');
			fs.chmodSync('locked', 0o555);
			try {
				const result = await rr('o', 'x', {
					includeGlob: ['**/*.file'],
					nameDelimiter: ', ',
					nameDelimiterTail: false,
					halt: true,
				});
				expect(result.out).toBe('a.file');
				expect(result.err).toContain('EACCES');
				expect(result.exit).toBe(1);
			} finally {
				fs.chmodSync('locked', 0o755);
			}
		});

		test('with --nl still ends with a line break when the run is stopped by --halt', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.mkdirSync('locked', {recursive: true});
			fs.writeFileSync('locked/b.file', 'foo');
			fs.chmodSync('locked', 0o555);
			try {
				const result = await rr('o', 'x', {
					includeGlob: ['**/*.file'],
					nameDelimiterTail: false,
					halt: true,
					nl: true,
				});
				expect(result.out).toBe('a.file\n');
				expect(result.exit).toBe(1);
			} finally {
				fs.chmodSync('locked', 0o755);
			}
		});
	});

	describe('--name-all', () => {
		test('also names the files where nothing is changed', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect(await rr('o', 'x', {includeGlob: ['*.file'], nameAll: true})).toEqual({
				out: 'a.file\nb.file\nc.file\n',
				err: '',
				exit: null,
			});
			expect(fs.readFileSync('b.file', 'utf8')).toBe('bar');
		});

		test('names every file printed with --output', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect(await rr('o', 'x', {includeGlob: ['*.file'], nameAll: true, output: true})).toEqual({
				out: 'fxx\nbar\nfxx\n',
				err: 'a.file\nb.file\nc.file\n',
				exit: null,
			});
		});

		test('does not name piped data', async () => {
			expect(await rr('o', 'x', {pipedData: 'foo', nameAll: true})).toEqual({
				out: 'fxx',
				err: '',
				exit: null,
			});
		});
	});

	describe('--content-delimiter', () => {
		test('is a line break after each file and each match by default', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect((await rr('o', 'x', {includeGlob: ['*.file'], output: true})).out).toBe(
				'fxx\nbar\nfxx\n'
			);
			expect((await rr('o', 'x', {includeGlob: ['*.file'], outputMatch: true})).out).toBe(
				'o\no\no\no\n'
			);
		});

		test('adds no line break by default to content that already ends with one', async () => {
			fs.writeFileSync('a.file', 'foo\n');
			fs.writeFileSync('b.file', '');
			fs.writeFileSync('c.file', 'bar');
			const config = {includeGlob: ['*.file'], output: true};
			expect((await rr('o', 'x', config)).out).toBe('fxx\n\nbar\n');
		});

		test('is put after the content of each file', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect(
				(await rr('o', 'x', {includeGlob: ['*.file'], output: true, contentDelimiter: '\t'})).out
			).toBe('fxx\tbar\tfxx\t');
		});

		test('is put after each match with --output-match, and not after the names', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			const result = await rr('o', 'x', {
				includeGlob: ['*.file'],
				outputMatch: true,
				contentDelimiter: ', ',
			});
			expect(result).toEqual({out: 'o, o, o, o, ', err: 'a.file\nc.file\n', exit: null});
		});

		test('is only put between the content with --no-content-delimiter-tail', async () => {
			const config = {output: true, contentDelimiter: ', ', contentDelimiterTail: false};
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect((await rr('o', 'x', {includeGlob: ['*.file'], ...config})).out).toBe('fxx, bar, fxx');
		});

		test('leaves piped data as it is by default', async () => {
			expect((await rr('o', 'x', {pipedData: 'foo'})).out).toBe('fxx');
			expect((await rr('o', 'x', {pipedData: 'foo', contentDelimiter: ', '})).out).toBe('fxx');
		});

		test('is put after the last match, from a file or a pipe', async () => {
			fs.writeFileSync('a.file', 'foo');
			const fromFile = await rr('o', '_', {includeGlob: ['a.file'], outputMatch: true});
			const fromPipe = await rr('o', '_', {pipedData: 'foo', outputMatch: true});
			expect(fromFile.out).toBe('o\no\n');
			expect(fromPipe.out).toBe('o\no\n');
		});

		test('is put after piped data with --content-delimiter-tail', async () => {
			const tail = {pipedData: 'foo', contentDelimiterTail: true};
			expect((await rr('o', 'x', {...tail, contentDelimiter: ', '})).out).toBe('fxx, ');
			expect((await rr('o', 'x', tail)).out).toBe('fxx\n');
		});
	});

	describe('--tail', () => {
		test('puts the delimiter after the last name and the last content', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect(
				await rr('o', 'x', {includeGlob: ['*.file'], output: true, delimiter: ', ', tail: true})
			).toEqual({
				out: 'fxx, bar, fxx, ',
				err: 'a.file, c.file, ',
				exit: null,
			});
			expect(
				(await rr('o', 'x', {includeGlob: ['*.file'], outputMatch: true, tail: true})).out
			).toBe('o\no\no\no\n');
		});

		test('--no-tail puts the delimiter only between the names and the content', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect(
				await rr('o', 'x', {includeGlob: ['*.file'], output: true, delimiter: ', ', tail: false})
			).toEqual({
				out: 'fxx, bar, fxx',
				err: 'a.file, c.file',
				exit: null,
			});
		});

		test('the specific tail flags win', async () => {
			const config = {output: true, delimiter: ', ', tail: false, nameDelimiterTail: true};
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect(await rr('o', 'x', {includeGlob: ['*.file'], ...config})).toEqual({
				out: 'fxx, bar, fxx',
				err: 'a.file, c.file, ',
				exit: null,
			});
		});
	});

	describe('--nl', () => {
		test('ends the names with a line break', async () => {
			const config = {nameDelimiter: ', ', nameDelimiterTail: false, nl: true};
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect((await rr('o', 'x', {includeGlob: ['*.file'], ...config})).out).toBe(
				'a.file, c.file\n'
			);
		});

		test('ends the content and the names on stderr with a line break', async () => {
			const config = {outputMatch: true, delimiter: ', ', tail: false, nl: true};
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect(await rr('o', 'x', {includeGlob: ['*.file'], ...config})).toEqual({
				out: 'o, o, o, o\n',
				err: 'a.file, c.file\n',
				exit: null,
			});
			expect((await rr('o', 'x', {pipedData: 'foo', nl: true})).out).toBe('fxx\n');
		});

		test('adds nothing when the output already ends with a line break', async () => {
			expect((await rr('o', 'x', {pipedData: 'foo\n\n', nl: true})).out).toBe('fxx\n\n');
			fs.writeFileSync('a.file', 'foo\n');
			fs.writeFileSync('b.file', '');
			const config = {includeGlob: ['*.file'], output: true, nl: true};
			expect((await rr('o', 'x', config)).out).toBe('fxx\n\n');
		});

		test('adds nothing when nothing is printed', async () => {
			expect((await rr('nope', 'x', {pipedData: 'foo', outputMatch: true, nl: true})).out).toBe('');
			fs.writeFileSync('a.file', 'foo');
			expect((await rr('nope', 'x', {includeGlob: ['a.file'], nl: true})).out).toBe('');
		});

		test('comes after the tail', async () => {
			const config = {
				outputMatch: true,
				contentDelimiter: ', ',
				contentDelimiterTail: true,
				nl: true,
			};
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect((await rr('o', 'x', {includeGlob: ['*.file'], ...config})).out).toBe('o, o, o, o, \n');
			expect(
				(await rr('o', 'x', {includeGlob: ['*.file'], outputMatch: true, tail: true, nl: true})).out
			).toBe('o\no\no\no\n');
		});
	});

	describe('--delimiter and --null-out', () => {
		test('--delimiter sets both delimiters', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect(await rr('o', 'x', {includeGlob: ['*.file'], output: true, delimiter: ', '})).toEqual({
				out: 'fxx, bar, fxx, ',
				err: 'a.file, c.file, ',
				exit: null,
			});
		});

		test('--null-out is the same as --delimiter with a null byte', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect(await rr('o', 'x', {includeGlob: ['*.file'], output: true, nullOut: true})).toEqual({
				out: 'fxx\0bar\0fxx\0',
				err: 'a.file\0c.file\0',
				exit: null,
			});
		});

		test('the most specific delimiter wins', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect(
				(
					await rr('o', 'x', {
						includeGlob: ['*.file'],
						output: true,
						delimiter: ', ',
						nullOut: true,
					})
				).out
			).toBe('fxx, bar, fxx, ');
			expect(
				await rr('o', 'x', {
					includeGlob: ['*.file'],
					output: true,
					delimiter: ', ',
					contentDelimiter: '|',
					nameDelimiter: ';',
				})
			).toEqual({out: 'fxx|bar|fxx|', err: 'a.file;c.file;', exit: null});
			expect(
				await rr('o', 'x', {
					includeGlob: ['*.file'],
					output: true,
					nullOut: true,
					nameDelimiter: ', ',
				})
			).toEqual({
				out: 'fxx\0bar\0fxx\0',
				err: 'a.file, c.file, ',
				exit: null,
			});
		});
	});

	// stdout has the result, and no file is changed. b.file has nothing to replace, so it is not named.
	describe.each([
		['output', 'fxx\nbar\nfxx\n'],
		['outputMatch', 'o\no\no\no\n'],
	])('with --%s', (flag, out) => {
		test('go to stderr', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect(await rr('o', 'x', {includeGlob: ['*.file'], [flag]: true})).toEqual({
				out,
				err: 'a.file\nc.file\n',
				exit: null,
			});
			expect(fs.readFileSync('a.file', 'utf8')).toBe('foo');
		});

		test('are the same names as without the flag', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect((await rr('o', 'x', {includeGlob: ['*.file'], [flag]: true})).err).toBe(
				(await rr('o', 'x', {includeGlob: ['*.file']})).out
			);
		});

		test.each(['quiet', 'quietTotal'])('are not printed with --%s', async quiet => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect(await rr('o', 'x', {includeGlob: ['*.file'], [flag]: true, [quiet]: true})).toEqual({
				out,
				err: '',
				exit: null,
			});
		});

		test('follow --null-out, --name-delimiter and --full-path', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect((await rr('o', 'x', {includeGlob: ['*.file'], [flag]: true, nullOut: true})).err).toBe(
				'a.file\0c.file\0'
			);
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect(
				(await rr('o', 'x', {includeGlob: ['*.file'], [flag]: true, nameDelimiter: ', '})).err
			).toBe('a.file, c.file, ');
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect(
				(await rr('o', 'x', {includeGlob: ['*.file'], [flag]: true, fullPath: true})).err
			).toBe(path.resolve('a.file') + '\n' + path.resolve('c.file') + '\n');
		});
	});

	describe('--full-path', () => {
		test('prints the full path of each name', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect(await rr('o', 'x', {includeGlob: ['*.file'], fullPath: true})).toEqual({
				out: path.resolve('a.file') + '\n' + path.resolve('c.file') + '\n',
				err: '',
				exit: null,
			});
		});

		test('leaves a path that is already full as it is', async () => {
			fs.mkdirSync('work');
			fs.mkdirSync('other');
			const file = path.resolve('other', 'my.file');
			fs.writeFileSync(file, 'foo');
			process.chdir('work');
			expect((await rr('o', 'x', {includeGlob: [file], fullPath: true})).out).toBe(file + '\n');
			expect(fs.readFileSync(file, 'utf8')).toBe('fxx');
		});

		test.each([
			['null', {nullOut: true}, '\0', '\0'],
			['name-delimiter', {nameDelimiter: ', ', nameDelimiterTail: false}, ', ', ''],
		])('works with --%s', async (name, flags, between, last) => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			expect((await rr('o', 'x', {includeGlob: ['*.file'], fullPath: true, ...flags})).out).toBe(
				path.resolve('a.file') + between + path.resolve('c.file') + last
			);
		});
	});
});
