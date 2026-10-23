// https://github.com/mathiasrw/rexreplace/issues/718
// Every path was treated as a glob, so a file with glob characters in its name was not found, or other files were changed with it.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import path from 'path';
import {rr} from '../helper.js';

const content = name => fs.readFileSync(name, 'utf8');

// Make each file with the content `foo`
function makeFiles(...names) {
	names.forEach(name => {
		fs.mkdirSync(path.dirname(name), {recursive: true});
		fs.writeFileSync(name, 'foo');
	});
}

describe('#718 a path that is a file is used as it is', () => {
	test.each(['my (1).file', '(draft).file', '{a,b}.file', '!important.file', 'a+(b).file'])(
		'%s is found',
		async name => {
			makeFiles(name);
			expect(await rr('o', 'x', {includeGlob: [name]})).toEqual({
				out: name + '\n',
				err: '',
				exit: null,
			});
			expect(content(name)).toBe('fxx');
		}
	);

	test.each([
		['a[1].file', 'a1.file'],
		['[id].file', 'i.file'],
		['what?.file', 'whatX.file'],
		['star*.file', 'star123.file'],
	])('%s does not also change %s', async (name, other) => {
		makeFiles(name, other);
		expect(await rr('o', 'x', {includeGlob: [name]})).toEqual({
			out: name + '\n',
			err: '',
			exit: null,
		});
		expect(content(name)).toBe('fxx');
		expect(content(other)).toBe('foo');
	});

	test('in a folder', async () => {
		makeFiles('pages/[id].file', 'pages/i.file');
		expect((await rr('o', 'x', {includeGlob: ['pages/[id].file']})).out).toBe('pages/[id].file\n');
		expect(content('pages/i.file')).toBe('foo');
	});
});

describe('#718 together with globs', () => {
	test('a path that is not a file is still a glob', async () => {
		makeFiles('a[1].file', 'a1.file');
		expect((await rr('o', 'x', {includeGlob: ['*.file']})).out).toBe('a1.file\na[1].file\n');
	});

	test('a path to a folder is not a file, so it is still a glob', async () => {
		makeFiles('docs/a.file');
		expect((await rr('o', 'x', {includeGlob: ['docs']})).exit).toBe(1);
		expect((await rr('o', 'x', {includeGlob: ['docs/*.file']})).out).toBe('docs/a.file\n');
	});

	test('the files are sorted, both those given by their name and those found by a glob', async () => {
		makeFiles('a.file', 'b[1].file', 'c.file');
		const result = await rr('o', 'x', {includeGlob: ['b[1].file', 'c.file', 'a*.file']});
		expect(result.out).toBe('a.file\nb[1].file\nc.file\n');
	});

	test('a file given by its name and also found by a glob is only handled once', async () => {
		makeFiles('a.file', 'b.file');
		const result = await rr('o', 'x', {includeGlob: ['./a.file', '*.file']});
		expect(result).toEqual({out: './a.file\nb.file\n', err: '', exit: null});
		expect(fs.readdirSync('.').sort()).toEqual(['a.file', 'b.file']);
	});

	test('a file given with a relative and an absolute path is only handled once', async () => {
		makeFiles('a.file');
		const result = await rr('o', 'x', {includeGlob: ['a.file', path.resolve('a.file')]});
		expect(result.out).toBe('a.file\n');
		expect(content('a.file')).toBe('fxx');
	});

	test('a glob that starts with ! takes files away from the other globs', async () => {
		makeFiles('a1.file', 'a2.file');
		expect((await rr('o', 'x', {includeGlob: ['*.file', '!a1.file']})).out).toBe('a2.file\n');
		expect(content('a1.file')).toBe('foo');
	});

	test('a glob that starts with ! does not take away a file given by its name', async () => {
		makeFiles('a1.file', 'a2.file');
		const config = {includeGlob: ['a1.file', '*.file', '!a1.file']};
		expect((await rr('o', 'x', config)).out).toBe('a1.file\na2.file\n');
		expect(content('a1.file')).toBe('fxx');
	});
});

describe('#718 with --exclude-glob', () => {
	test('it is always a glob, also when it is the name of a file', async () => {
		// As a glob, `a[1].file` finds both `a[1].file` and `a1.file`
		makeFiles('a[1].file', 'a1.file', 'b.file');
		const config = {
			includeGlob: ['a[1].file', 'a1.file', 'b.file'],
			excludeGlob: ['a[1].file'],
		};
		expect((await rr('o', 'x', config)).out).toBe('b.file\n');
		expect(content('a[1].file')).toBe('foo');
		expect(content('a1.file')).toBe('foo');
	});

	test('a name with glob characters is left out when they are escaped', async () => {
		makeFiles('a[1].file', 'a1.file');
		const config = {includeGlob: ['*.file'], excludeGlob: ['a\\[1\\].file']};
		expect((await rr('o', 'x', config)).out).toBe('a1.file\n');
		expect(content('a[1].file')).toBe('foo');
	});

	test('all of them are globbed together, so a glob that starts with ! keeps a file', async () => {
		makeFiles('a.file', 'b.file');
		const config = {includeGlob: ['*.file'], excludeGlob: ['*.file', '!a.file']};
		expect((await rr('o', 'x', config)).out).toBe('a.file\n');
		expect(content('b.file')).toBe('foo');
	});

	test('a glob leaves out a file given by its name', async () => {
		makeFiles('a[1].file');
		const config = {includeGlob: ['a[1].file'], excludeGlob: ['*.file']};
		expect(await rr('o', 'x', config)).toEqual({out: '', err: '0 files found\n', exit: 1});
		expect(content('a[1].file')).toBe('foo');
	});

	test('a glob leaves out a file given with another path to it', async () => {
		makeFiles('docs/a.file', 'docs/b.file');
		const config = {includeGlob: ['./docs/a.file', 'docs/b.file'], excludeGlob: ['docs/a*']};
		expect((await rr('o', 'x', config)).out).toBe('docs/b.file\n');
		expect(content('docs/a.file')).toBe('foo');
	});
});

describe('#718 with --exclude-re', () => {
	test('it also leaves out a file given by its name', async () => {
		makeFiles('a[1].file', 'a1.file');
		const config = {includeGlob: ['a[1].file', 'a1.file'], excludeRe: ['\\[']};
		expect((await rr('o', 'x', config)).out).toBe('a1.file\n');
		expect(content('a[1].file')).toBe('foo');
	});

	test('it sees the full path with --full-path', async () => {
		makeFiles('a.file');
		expect((await rr('o', 'x', {includeGlob: ['a.file'], excludeRe: ['^/']})).out).toBe('a.file\n');
		fs.writeFileSync('a.file', 'foo');
		const config = {includeGlob: ['a.file'], excludeRe: ['^/'], fullPath: true};
		expect((await rr('o', 'x', config)).exit).toBe(1);
		expect(content('a.file')).toBe('foo');
	});
});
