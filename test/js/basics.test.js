// What rexreplace does when no flags are given
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

describe('pattern', () => {
	test('is a regular expression', () => {
		expect(rr('o+b', 'x', {pipedData: 'foobar'}).out).toBe('fxar');
	});

	test('ignores case by default', () => {
		expect(rr('FOO', 'x', {pipedData: 'foobar Foobar'}).out).toBe('xbar xbar');
	});

	test('is global by default', () => {
		expect(rr('o', 'x', {pipedData: 'foo foo'}).out).toBe('fxx fxx');
	});

	test('is multiline by default', () => {
		expect(rr('^.', 'x', {pipedData: 'foobar\nfoobar'}).out).toBe('xoobar\nxoobar');
		expect(rr('.$', 'x', {pipedData: 'foobar\nfoobar'}).out).toBe('foobax\nfoobax');
	});

	test('does not let . match a newline by default', () => {
		expect(rr('r.f', 'x', {pipedData: 'foobar\nfoobar'}).out).toBe('foobar\nfoobar');
	});

	test('supports lookahead and lookbehind', () => {
		expect(rr('o(?=b)', 'x', {pipedData: 'foobar'}).out).toBe('foxbar');
		expect(rr('o(?!b)', 'x', {pipedData: 'foobar'}).out).toBe('fxobar');
		expect(rr('(?<=o)b', 'x', {pipedData: 'foobar'}).out).toBe('fooxar');
	});

	test('supports backreferences inside the pattern', () => {
		expect(rr('(o)\\1', 'x', {pipedData: 'foobar bob'}).out).toBe('fxbar bob');
	});

	test('can be empty and will then match between every char', () => {
		expect(rr('', 'x', {pipedData: 'ab'}).out).toBe('xaxbx');
	});

	test('stops with an error and leaves the files alone if it is not a valid regex', () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = rr('(', 'x', {includeGlob: ['my.file']});
		expect(result.exit).toBe(1);
		expect(result.err).toContain('Invalid regular expression');
		expect(result.out).toBe('');
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
	});
});

describe('replacement', () => {
	test('can refer to matching groups', () => {
		expect(rr('(f?(o))o(.*)', '$3$1$2', {pipedData: 'foobar'}).out).toBe('barfoo');
	});

	test('can refer to named groups', () => {
		expect(rr('(?<first>f)(?<rest>.*)', '$<rest>$<first>', {pipedData: 'foobar'}).out).toBe(
			'oobarf'
		);
	});

	test('can refer to the full match and what is around it', () => {
		expect(rr('b', "[$&][$`][$'][$$]", {pipedData: 'foobar'}).out).toBe('foo[b][foo][ar][$]ar');
	});

	test('gets an empty string for a group that did not take part in the match', () => {
		expect(rr('(o)(b)?', '[$1|$2]', {pipedData: 'foobar'}).out).toBe('f[o|][o|b]ar');
	});

	test('can be empty to remove what is matched', () => {
		expect(rr('o', '', {pipedData: 'foobar'}).out).toBe('fbar');
	});

	test('can contain newlines, quotes and backslashes', () => {
		expect(rr('o', '\n', {pipedData: 'fob'}).out).toBe('f\nb');
		expect(rr('o', `'"\``, {pipedData: 'fob'}).out).toBe(`f'"\`b`);
		expect(rr('o', '\\', {pipedData: 'fob'}).out).toBe('f\\b');
	});
});

describe('files', () => {
	test('are changed in place and named on stderr', () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = rr('o', 'x', {includeGlob: ['my.file']});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
		expect(result).toEqual({out: '', err: 'my.file \n', exit: null});
		expect(fs.readdirSync('.')).toEqual(['my.file']);
	});

	test('are not written again if nothing was replaced', () => {
		fs.writeFileSync('my.file', 'foobar');
		const longAgo = new Date('2001-02-03T04:05:06Z');
		fs.utimesSync('my.file', longAgo, longAgo);
		const result = rr('nope', 'x', {includeGlob: ['my.file']});
		expect(result).toEqual({out: '', err: '', exit: null});
		expect(fs.statSync('my.file').mtime).toEqual(longAgo);
	});

	test('keep line endings, missing final newline and unicode as they were', () => {
		fs.writeFileSync('my.file', 'foo\r\nbår\r\n🦖 foo');
		rr('foo', 'x', {includeGlob: ['my.file']});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('x\r\nbår\r\n🦖 x');
	});

	test('can be empty', () => {
		fs.writeFileSync('my.file', '');
		rr('^', 'x', {includeGlob: ['my.file']});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('x');
	});

	test('can be several files and globs', () => {
		fs.writeFileSync('my.file', 'foobar');
		fs.writeFileSync('your.file', 'foobar');
		fs.writeFileSync('our.txt', 'foobar');
		fs.writeFileSync('their.txt', 'foobar');
		rr('o', 'x', {includeGlob: ['*.file', 'our.txt']});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
		expect(fs.readFileSync('your.file', 'utf8')).toBe('fxxbar');
		expect(fs.readFileSync('our.txt', 'utf8')).toBe('fxxbar');
		expect(fs.readFileSync('their.txt', 'utf8')).toBe('foobar');
	});

	test('are only handled once even if several globs match them', () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = rr('o', 'oo', {includeGlob: ['my.file', '*.file', './my.file', 'my.*']});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foooobar');
		expect(result.err).toBe('my.file \n');
	});

	test('are handled in alphabetical order', () => {
		['c', 'a', 'b'].forEach((name) => fs.writeFileSync(name + '.file', name));
		expect(rr('$', '!', {includeGlob: ['c.file', '*.file'], output: true}).out).toBe('a!b!c!');
	});

	test('are found in sub directories with ** but not with *', () => {
		fs.mkdirSync('sub/deep', {recursive: true});
		fs.writeFileSync('top.file', 'foobar');
		fs.writeFileSync('sub/mid.file', 'foobar');
		fs.writeFileSync('sub/deep/low.file', 'foobar');

		rr('foo', '1', {includeGlob: ['*']});
		expect(fs.readFileSync('top.file', 'utf8')).toBe('1bar');
		expect(fs.readFileSync('sub/mid.file', 'utf8')).toBe('foobar');

		rr('bar', '2', {includeGlob: ['**/*.file']});
		expect(fs.readFileSync('top.file', 'utf8')).toBe('12');
		expect(fs.readFileSync('sub/mid.file', 'utf8')).toBe('foo2');
		expect(fs.readFileSync('sub/deep/low.file', 'utf8')).toBe('foo2');
	});

	test('can be pinpointed with braces and negation', () => {
		['a', 'b', 'c'].forEach((name) => fs.writeFileSync(name + '.file', 'foobar'));
		rr('foo', '1', {includeGlob: ['{a,b}.file']});
		rr('bar', '2', {includeGlob: ['*.file', '!b.file']});
		expect(fs.readFileSync('a.file', 'utf8')).toBe('12');
		expect(fs.readFileSync('b.file', 'utf8')).toBe('1bar');
		expect(fs.readFileSync('c.file', 'utf8')).toBe('foo2');
	});

	test('can have spaces and unicode in the name', () => {
		fs.writeFileSync('my file.txt', 'foobar');
		fs.writeFileSync('blåbær 🦖.txt', 'foobar');
		rr('o', 'x', {includeGlob: ['my file.txt', 'blåbær 🦖.txt']});
		expect(fs.readFileSync('my file.txt', 'utf8')).toBe('fxxbar');
		expect(fs.readFileSync('blåbær 🦖.txt', 'utf8')).toBe('fxxbar');
	});

	test('do not include hidden files or directories from a wildcard', () => {
		fs.mkdirSync('dir.file');
		fs.writeFileSync('.hidden.file', 'foobar');
		const result = rr('o', 'x', {includeGlob: ['*']});
		expect(result.err).toBe('0 files found \n');
		expect(fs.readFileSync('.hidden.file', 'utf8')).toBe('foobar');
	});

	test('are reported if none are found', () => {
		const result = rr('o', 'x', {includeGlob: ['nope.file']});
		expect(result.err).toBe('0 files found \n');
		expect(result.out).toBe('');
	});
});

describe('piped data', () => {
	test('is sent to stdout when no files are given', () => {
		expect(rr('o', 'x', {pipedData: 'foobar\n'})).toEqual({
			out: 'fxxbar\n',
			err: '',
			exit: null,
		});
	});

	test('is sent to stdout even if nothing was replaced', () => {
		expect(rr('nope', 'x', {pipedData: 'foobar'}).out).toBe('foobar');
	});

	test('can be an empty string', () => {
		expect(rr('^', 'x', {pipedData: ''})).toEqual({out: 'x', err: '', exit: null});
	});

	test('is ignored if files are given', () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = rr('o', 'x', {pipedData: 'boo', includeGlob: ['my.file']});
		expect(result.out).toBe('');
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
	});

	test('can be large', () => {
		const data = 'foobar\n'.repeat(500000);
		expect(rr('o', '', {pipedData: data}).out).toBe('fbar\n'.repeat(500000));
	});

	test('leaves nothing to do if neither data nor files are given', () => {
		expect(rr('o', 'x')).toEqual({out: '', err: '0 files found \n', exit: null});
	});
});
