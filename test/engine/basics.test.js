// What rexreplace does when no flags are given
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('pattern', () => {
	test('is a regular expression', async () => {
		expect((await rr('o+b', 'x', {pipedData: 'foobar'})).out).toBe('fxar');
	});

	test('ignores case by default', async () => {
		expect((await rr('FOO', 'x', {pipedData: 'foobar Foobar'})).out).toBe('xbar xbar');
	});

	test('is global by default', async () => {
		expect((await rr('o', 'x', {pipedData: 'foo foo'})).out).toBe('fxx fxx');
	});

	test('is multiline by default', async () => {
		expect((await rr('^.', 'x', {pipedData: 'foobar\nfoobar'})).out).toBe('xoobar\nxoobar');
		expect((await rr('.$', 'x', {pipedData: 'foobar\nfoobar'})).out).toBe('foobax\nfoobax');
	});

	test('does not let . match a newline by default', async () => {
		expect((await rr('r.f', 'x', {pipedData: 'foobar\nfoobar'})).out).toBe('foobar\nfoobar');
	});

	test('supports lookahead and lookbehind', async () => {
		expect((await rr('o(?=b)', 'x', {pipedData: 'foobar'})).out).toBe('foxbar');
		expect((await rr('o(?!b)', 'x', {pipedData: 'foobar'})).out).toBe('fxobar');
		expect((await rr('(?<=o)b', 'x', {pipedData: 'foobar'})).out).toBe('fooxar');
	});

	test('supports backreferences inside the pattern', async () => {
		expect((await rr('(o)\\1', 'x', {pipedData: 'foobar bob'})).out).toBe('fxbar bob');
	});

	test('can be empty and will then match between every char', async () => {
		expect((await rr('', 'x', {pipedData: 'ab'})).out).toBe('xaxbx');
	});

	test('stops with an error and leaves the files alone if it is not a valid regex', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('(', 'x', {includeGlob: ['my.file']});
		expect(result.exit).toBe(3);
		expect(result.err).toContain('Invalid regular expression');
		expect(result.out).toBe('');
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
	});
});

describe('replacement', () => {
	test('can refer to matching groups', async () => {
		expect((await rr('(f?(o))o(.*)', '$3$1$2', {pipedData: 'foobar'})).out).toBe('barfoo');
	});

	test('can refer to named groups', async () => {
		expect((await rr('(?<first>f)(?<rest>.*)', '$<rest>$<first>', {pipedData: 'foobar'})).out).toBe(
			'oobarf'
		);
	});

	test('can refer to the full match and what is around it', async () => {
		expect((await rr('b', "[$&][$`][$'][$$]", {pipedData: 'foobar'})).out).toBe(
			'foo[b][foo][ar][$]ar'
		);
	});

	test('gets an empty string for a group that did not take part in the match', async () => {
		expect((await rr('(o)(b)?', '[$1|$2]', {pipedData: 'foobar'})).out).toBe('f[o|][o|b]ar');
	});

	test('can be empty to remove what is matched', async () => {
		expect((await rr('o', '', {pipedData: 'foobar'})).out).toBe('fbar');
	});

	test('can contain newlines, quotes and backslashes', async () => {
		expect((await rr('o', '\n', {pipedData: 'fob'})).out).toBe('f\nb');
		expect((await rr('o', `'"\``, {pipedData: 'fob'})).out).toBe(`f'"\`b`);
		expect((await rr('o', '\\', {pipedData: 'fob'})).out).toBe('f\\b');
	});
});

describe('files', () => {
	test('are changed in place and named on stdout', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('o', 'x', {includeGlob: ['my.file']});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
		expect(result).toEqual({out: 'my.file\n', err: '', exit: null});
		expect(fs.readdirSync('.')).toEqual(['my.file']);
	});

	test('are not written again if nothing was replaced', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const longAgo = new Date('2001-02-03T04:05:06Z');
		fs.utimesSync('my.file', longAgo, longAgo);
		const result = await rr('nope', 'x', {includeGlob: ['my.file']});
		expect(result).toEqual({out: '', err: '', exit: null});
		expect(fs.statSync('my.file').mtime).toEqual(longAgo);
	});

	test('keep line endings, missing final newline and unicode as they were', async () => {
		fs.writeFileSync('my.file', 'foo\r\nbår\r\n🦖 foo');
		await rr('foo', 'x', {includeGlob: ['my.file']});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('x\r\nbår\r\n🦖 x');
	});

	test('can be empty', async () => {
		fs.writeFileSync('my.file', '');
		await rr('^', 'x', {includeGlob: ['my.file']});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('x');
	});

	test('can be several files and globs', async () => {
		fs.writeFileSync('my.file', 'foobar');
		fs.writeFileSync('your.file', 'foobar');
		fs.writeFileSync('our.txt', 'foobar');
		fs.writeFileSync('their.txt', 'foobar');
		await rr('o', 'x', {includeGlob: ['*.file', 'our.txt']});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
		expect(fs.readFileSync('your.file', 'utf8')).toBe('fxxbar');
		expect(fs.readFileSync('our.txt', 'utf8')).toBe('fxxbar');
		expect(fs.readFileSync('their.txt', 'utf8')).toBe('foobar');
	});

	test('are only handled once even if several globs match them', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('o', 'oo', {
			includeGlob: ['my.file', '*.file', './my.file', 'my.*'],
		});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foooobar');
		expect(result.out).toBe('my.file\n');
	});

	test('are handled in alphabetical order', async () => {
		['c', 'a', 'b'].forEach(name => fs.writeFileSync(name + '.file', name));
		expect((await rr('$', '!', {includeGlob: ['c.file', '*.file'], output: true})).out).toBe(
			'a!\nb!\nc!\n'
		);
	});

	test('are found in sub directories with ** but not with *', async () => {
		fs.mkdirSync('sub/deep', {recursive: true});
		fs.writeFileSync('top.file', 'foobar');
		fs.writeFileSync('sub/mid.file', 'foobar');
		fs.writeFileSync('sub/deep/low.file', 'foobar');

		await rr('foo', '1', {includeGlob: ['*']});
		expect(fs.readFileSync('top.file', 'utf8')).toBe('1bar');
		expect(fs.readFileSync('sub/mid.file', 'utf8')).toBe('foobar');

		await rr('bar', '2', {includeGlob: ['**/*.file']});
		expect(fs.readFileSync('top.file', 'utf8')).toBe('12');
		expect(fs.readFileSync('sub/mid.file', 'utf8')).toBe('foo2');
		expect(fs.readFileSync('sub/deep/low.file', 'utf8')).toBe('foo2');
	});

	test('can be pinpointed with braces and negation', async () => {
		['a', 'b', 'c'].forEach(name => fs.writeFileSync(name + '.file', 'foobar'));
		await rr('foo', '1', {includeGlob: ['{a,b}.file']});
		await rr('bar', '2', {includeGlob: ['*.file', '!b.file']});
		expect(fs.readFileSync('a.file', 'utf8')).toBe('12');
		expect(fs.readFileSync('b.file', 'utf8')).toBe('1bar');
		expect(fs.readFileSync('c.file', 'utf8')).toBe('foo2');
	});

	test('can have spaces and unicode in the name', async () => {
		fs.writeFileSync('my file.txt', 'foobar');
		fs.writeFileSync('blåbær 🦖.txt', 'foobar');
		await rr('o', 'x', {includeGlob: ['my file.txt', 'blåbær 🦖.txt']});
		expect(fs.readFileSync('my file.txt', 'utf8')).toBe('fxxbar');
		expect(fs.readFileSync('blåbær 🦖.txt', 'utf8')).toBe('fxxbar');
	});

	test('do not include hidden files or directories from a wildcard', async () => {
		fs.mkdirSync('dir.file');
		fs.writeFileSync('.hidden.file', 'foobar');
		const result = await rr('o', 'x', {includeGlob: ['*']});
		expect(result.err).toBe(' 🟡 0 files found\n\n');
		expect(fs.readFileSync('.hidden.file', 'utf8')).toBe('foobar');
	});

	test('are reported if none are found', async () => {
		const result = await rr('o', 'x', {includeGlob: ['nope.file']});
		expect(result.err).toBe(' 🟡 0 files found\n\n');
		expect(result.out).toBe('');
	});
});

describe('piped data', () => {
	test('is sent to stdout when no files are given', async () => {
		expect(await rr('o', 'x', {pipedData: 'foobar\n'})).toEqual({
			out: 'fxxbar\n',
			err: '',
			exit: null,
		});
	});

	test('is sent to stdout even if nothing was replaced', async () => {
		expect((await rr('nope', 'x', {pipedData: 'foobar'})).out).toBe('foobar');
	});

	test('can be an empty string', async () => {
		expect(await rr('^', 'x', {pipedData: ''})).toEqual({out: 'x', err: '', exit: null});
	});

	test('is ignored if files are given', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('o', 'x', {pipedData: 'boo', includeGlob: ['my.file']});
		expect(result.out).toBe('my.file\n');
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
	});

	test('can be large', async () => {
		const data = 'foobar\n'.repeat(500000);
		expect((await rr('o', '', {pipedData: data})).out).toBe('fbar\n'.repeat(500000));
	});

	test('leaves nothing to do if neither data nor files are given', async () => {
		expect(await rr('o', 'x')).toEqual({out: '', err: ' 🟡 0 files found\n\n', exit: null});
	});
});
