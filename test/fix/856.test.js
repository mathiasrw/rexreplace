// https://github.com/mathiasrw/rexreplace/issues/856
// --js code gets an rr object behind the short names, the values of RexReplace with long names in rr._,
// rr.stdin, rr.print() and rr.printErr(), pad(), and file_path with file_path_rel
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import path from 'path';
import {rr} from '../helper.js';

const js = (code, config = {}) =>
	rr('(?<y>\\d)(\\d)', code, {pipedData: '12', replacementJs: true, ...config});

describe('#856 the rr object', () => {
	test.each([
		['rr.y for $y', 'rr.y + $y', '11'],
		['rr[1] for $1, and rr[0] for $0', 'rr[1] + rr[2] + rr[0]', '1212'],
		['rr.y_ for $y_', 'rr.y_ + "|"', '1 |'],
		['rr.n and its cousins for $n', 'rr.n + rr.n00 + rr.n_', '10011 '],
		['rr.m and rr.M for $m and $M', 'rr.m + "/" + rr.M', '1/1'],
	])('has %s', async (name, code, out) => {
		expect((await js(code)).out).toBe(out);
	});

	test('has the groups as text and the numbers as numbers', async () => {
		expect((await js('typeof rr.y + typeof rr.n')).out).toBe('stringnumber');
	});

	test('makes the code run once per match', async () => {
		const config = {pipedData: 'a1b2', replacementJs: true};
		expect((await rr('\\d', 'rr.m', config)).out).toBe('a1b2');
	});

	test('is not found inside another name, like brr.n', async () => {
		const config = {pipedData: 'a1b2', replacementJs: true};
		expect((await rr('\\d', 'const brr = {n: 7}; brr.n', config)).out).toBe('a7b7');
	});

	test('is overwritten by a named group of the same name, also _', async () => {
		const config = {pipedData: 'ab', replacementJs: true};
		expect((await rr('(?<n>a)', 'rr.n + $n', config)).out).toBe('aab');
		expect((await rr('(?<_>a)', 'rr._', config)).out).toBe('ab');
	});
});

describe('#856 rr._', () => {
	test('has the values of the file with long names', async () => {
		fs.writeFileSync('my.file.txt', 'foo');
		const code =
			'[rr._.fileInfo.fileName, rr._.fileInfo.name, rr._.fileInfo.ext, rr._.fileInfo.filePathRel, rr._.fileInfo.dirName].join("|")';
		await rr('foo', code, {includeGlob: ['my.file.txt'], replacementJs: true});
		const dir = path.basename(process.cwd());
		expect(fs.readFileSync('my.file.txt', 'utf8')).toBe(
			`my.file.txt|my.file|.txt|my.file.txt|${dir}`
		);
	});

	test('has the counts with long names', async () => {
		['a.txt', 'b.txt', 'c.txt'].forEach(name =>
			fs.writeFileSync(name, 'b.txt' === name ? 'x' : 'oo')
		);
		const code = 'Object.values(rr._.count).join("")';
		await rr('o', code, {includeGlob: ['*.txt'], replacementJs: true});
		// fileNumber, filesTotal, matchedFileNumber, changedFileNumber, matchThisFile, matchUntilNow
		expect(['a.txt', 'b.txt', 'c.txt'].map(name => fs.readFileSync(name, 'utf8'))).toEqual([
			'131111131122',
			'x',
			'332213332224',
		]);
	});

	test('has text, find and time', async () => {
		expect((await js('rr._.text + rr._.find + typeof rr._.time')).out).toBe(
			'12(?<y>\\d)(\\d)string'
		);
	});
});

describe('#856 printing from the code', () => {
	test('rr.print goes to stdout with a line break, also with --quiet-total', async () => {
		const result = await js('rr.print("hi"); "x"', {quietTotal: true, output: true});
		expect(result.out).toStartWith('hi\n');
	});

	test('rr.printErr goes to stderr', async () => {
		expect((await js('rr.printErr("oops"); "x"')).err).toBe('oops\n');
	});

	test('rr.stdin is the piped data', async () => {
		fs.writeFileSync('a.txt', 'o');
		const config = {includeGlob: ['a.txt'], replacementJs: true, pipe: true, pipedData: 'P'};
		await rr('o', 'rr.stdin', config);
		expect(fs.readFileSync('a.txt', 'utf8')).toBe('P');
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

describe('#856 code that runs once per file', () => {
	test('only runs for a file with a match', async () => {
		['a.txt', 'b.txt'].forEach(name => fs.writeFileSync(name, 'a.txt' === name ? 'foo' : 'bar'));
		const code = 'fs.appendFileSync("log", name); "x"';
		await rr('foo', code, {includeGlob: ['*.txt'], replacementJs: true});
		expect(fs.readFileSync('log', 'utf8')).toBe('a');
	});
});
