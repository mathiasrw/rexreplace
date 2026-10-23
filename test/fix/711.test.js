// https://github.com/mathiasrw/rexreplace/issues/711
// A list of files from another command could only be used with `xargs` or `$(…)`.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr, rrStatus} from '../helper.js';

const content = name => fs.readFileSync(name, 'utf8');

describe('#711 --glob-pipe', () => {
	test('each line of the piped data is a file to work on', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		fs.writeFileSync('c.file', 'foo');
		const config = {pipedData: 'a.file\nb.file\n', globPipe: true};
		expect(await rr('o', 'x', config)).toEqual({out: 'a.file\nb.file\n', err: '', exit: null});
		expect(content('c.file')).toBe('foo');
	});

	test('a line can be a glob', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		fs.writeFileSync('c.txt', 'foo');
		const result = await rr('o', 'x', {pipedData: '*.file', globPipe: true});
		expect(result.out).toBe('a.file\nb.file\n');
	});

	test('a line is used together with the paths and globs given as arguments', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		fs.writeFileSync('c.txt', 'foo');
		const config = {pipedData: 'a.file\n', includeGlob: ['*.txt'], globPipe: true};
		expect((await rr('o', 'x', config)).out).toBe('a.file\nc.txt\n');
	});

	test('a line that is a file is used as it is, like an argument (#718)', async () => {
		fs.writeFileSync('a[1].file', 'foo');
		fs.writeFileSync('a1.file', 'foo');
		const result = await rr('o', 'x', {pipedData: 'a[1].file\n', globPipe: true});
		expect(result.out).toBe('a[1].file\n');
		expect(content('a1.file')).toBe('foo');
	});

	test('a line that starts with ! takes files away from the other globs', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		const result = await rr('o', 'x', {pipedData: '*.file\n!b.file\n', globPipe: true});
		expect(result.out).toBe('a.file\n');
	});

	test('takes Windows line breaks, leaves out empty lines and keeps spaces in names', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('my file.txt', 'foo');
		const config = {pipedData: '\r\na.file\r\n\r\nmy file.txt\r\n', globPipe: true};
		expect((await rr('o', 'x', config)).out).toBe('a.file\nmy file.txt\n');
	});

	test('with --null-in the lines are separated by null bytes', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('line\nbreak.file', 'foo');
		const config = {pipedData: 'a.file\0line\nbreak.file\0', globPipe: true, nullIn: true};
		expect((await rr('o', 'x', config)).out).toBe('a.file\nline\nbreak.file\n');
		expect(content('line\nbreak.file')).toBe('fxx');
	});

	test('with nothing piped in and no arguments there are no files', async () => {
		expect(await rr('o', 'x', {pipedData: '', globPipe: true})).toEqual({
			out: '',
			err: ' 🟡 0 files found\n\n',
			exit: null,
		});
	});

	test('is told about in the status report', async () => {
		fs.writeFileSync('a.file', 'foo');
		const status = await rrStatus('o', 'x', {pipedData: 'a.file\n', globPipe: true});
		expect(status.pipe).toEqual({bytes: 7, type: 'GLOBS', updated: false});
		expect(status.files).toEqual({searched: ['a.file'], updated: ['a.file']});
	});

	test.each([
		['--replacement-pipe', {replacementPipe: true}],
		['--pipe', {pipe: true}],
	])('can not be used with %s, as the piped data can only be one thing', async (name, flags) => {
		fs.writeFileSync('a.file', 'foo');
		const result = await rr('o', 'x', {pipedData: 'a.file', globPipe: true, ...flags});
		expect(result.exit).toBe(3);
		expect(result.err).toContain('--glob-pipe can not be used with');
		expect(content('a.file')).toBe('foo');
	});
});
