// https://github.com/mathiasrw/rexreplace/issues/856
// --js code gets an rr object with the values under long names and the groups, print() and printErr(), pad(),
// and file_path with file_path_rel
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import path from 'path';
import {rr} from '../helper.js';

const js = (code, config = {}) =>
	rr('(?<y>\\d)(\\d)', code, {pipedData: '12', replacementJs: true, ...config});

describe('#856 the rr object', () => {
	test('has the groups by number and by name', async () => {
		expect((await js('rr[0] + rr[1] + rr[2] + rr.y')).out).toBe('12121');
	});

	test('has the values of the file with long names', async () => {
		fs.writeFileSync('my.file.txt', 'foo');
		const code =
			'[rr.fileName, rr.name, rr.ext, rr.filePathRel, rr.dirName, rr.filePath === file].join("|")';
		await rr('foo', code, {includeGlob: ['my.file.txt'], replacementJs: true});
		const dir = path.basename(process.cwd());
		expect(fs.readFileSync('my.file.txt', 'utf8')).toBe(
			`my.file.txt|my.file|.txt|my.file.txt|${dir}|true`
		);
	});

	test('has the numbers with long names', async () => {
		['a.txt', 'b.txt', 'c.txt'].forEach(name =>
			fs.writeFileSync(name, 'b.txt' === name ? 'x' : 'oo')
		);
		const code =
			'[rr.fileNumber, rr.filesTotal, rr.matchedFileNumber, rr.changedFileNumber, rr.matchThisFile, rr.matchUntilNow].join("")';
		await rr('o', code, {includeGlob: ['*.txt'], replacementJs: true});
		expect(['a.txt', 'b.txt', 'c.txt'].map(name => fs.readFileSync(name, 'utf8'))).toEqual([
			'131111131122',
			'x',
			'332213332224',
		]);
	});

	test('has text, find, cwd and time', async () => {
		expect((await js('rr.text + rr.find + (rr.cwd === cwd) + (rr.time === time)')).out).toBe(
			'12(?<y>\\d)(\\d)truetrue'
		);
	});

	test('has stdin, the piped data', async () => {
		fs.writeFileSync('a.txt', 'o');
		await rr('o', 'rr.stdin', {
			includeGlob: ['a.txt'],
			replacementJs: true,
			pipe: true,
			pipedData: 'P',
		});
		expect(fs.readFileSync('a.txt', 'utf8')).toBe('P');
	});

	test('is overwritten by a named group of the same name', async () => {
		fs.writeFileSync('a.txt', 'abc');
		await rr('(?<name>b)', 'rr.name', {includeGlob: ['a.txt'], replacementJs: true});
		expect(fs.readFileSync('a.txt', 'utf8')).toBe('abc');
	});

	test('can be spread, as every value is its own', async () => {
		expect((await js('const o = {...rr}; o.y + o.fileNumber')).out).toBe('11');
	});

	test('makes the code run once per match', async () => {
		expect(
			(await rr('\\d', 'rr.matchThisFile', {pipedData: 'a1b2', replacementJs: true})).out
		).toBe('a1b2');
	});

	test('is not found inside another name, like brr.n', async () => {
		const code = 'const brr = {n: 7}; brr.n';
		expect((await rr('\\d', code, {pipedData: 'a1b2', replacementJs: true})).out).toBe('a7b7');
	});
});

describe('#856 printing from the code', () => {
	test.each([['print'], ['rr.print']])(
		'%s goes to stdout with a line break, also with --quiet-total',
		async name => {
			const result = await js(name + '("hi"); "x"', {quietTotal: true, output: true});
			expect(result.out).toStartWith('hi\n');
		}
	);

	test.each([['printErr'], ['rr.printErr']])('%s goes to stderr', async name => {
		expect((await js(name + '("oops"); "x"')).err).toBe('oops\n');
	});
});

describe('#856 pad()', () => {
	test.each([
		['pad($1)', '001'],
		['pad($2, 5)', '00002'],
		['pad($y, 2, " ")', ' 1'],
	])('%s', async (code, out) => {
		expect((await js(code)).out).toBe(out);
	});
});

describe('#856 file_path and file_path_rel', () => {
	test('are the same as file and file_rel', async () => {
		fs.writeFileSync('a.txt', 'o');
		await rr('o', '[file_path === file, file_path_rel, file_path_rel_].join("|")', {
			includeGlob: ['a.txt'],
			replacementJs: true,
		});
		expect(fs.readFileSync('a.txt', 'utf8')).toBe('true|a.txt|a.txt ');
	});
});
