import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('--exclude-glob', () => {
	test('leaves out the files found by the glob', async () => {
		const config = {includeGlob: ['*.file'], excludeGlob: ['y*']};
		fs.writeFileSync('my.file', 'foo');
		fs.writeFileSync('your.file', 'foo');
		expect((await rr('foo', 'x', config)).out).toBe('my.file\n');
	});

	test('can be the name of a file', async () => {
		const config = {includeGlob: ['*.file'], excludeGlob: ['your.file']};
		fs.writeFileSync('my.file', 'foo');
		fs.writeFileSync('your.file', 'foo');
		expect((await rr('foo', 'x', config)).out).toBe('my.file\n');
	});

	test('can be given several times', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		fs.writeFileSync('c.file', 'foo');
		expect((await rr('foo', 'x', {includeGlob: ['*.file'], excludeGlob: ['a.*', 'b.*']})).out).toBe(
			'c.file\n'
		);
	});

	test('understands braces and **', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		fs.writeFileSync('c.file', 'foo');
		fs.mkdirSync('sub', {recursive: true});
		fs.writeFileSync('sub/a.file', 'foo');
		fs.mkdirSync('sub/deep', {recursive: true});
		fs.writeFileSync('sub/deep/d.file', 'foo');
		expect(
			(await rr('foo', 'x', {includeGlob: ['**/*.file'], excludeGlob: ['{a,b}.file']})).out
		).toBe('c.file\nsub/a.file\nsub/deep/d.file\n');
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		fs.writeFileSync('c.file', 'foo');
		fs.mkdirSync('sub', {recursive: true});
		fs.writeFileSync('sub/a.file', 'foo');
		fs.mkdirSync('sub/deep', {recursive: true});
		fs.writeFileSync('sub/deep/d.file', 'foo');
		expect((await rr('foo', 'x', {includeGlob: ['**/*.file'], excludeGlob: ['sub/**']})).out).toBe(
			'a.file\nb.file\nc.file\n'
		);
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		fs.writeFileSync('c.file', 'foo');
		fs.mkdirSync('sub', {recursive: true});
		fs.writeFileSync('sub/a.file', 'foo');
		fs.mkdirSync('sub/deep', {recursive: true});
		fs.writeFileSync('sub/deep/d.file', 'foo');
		expect(
			(await rr('foo', 'x', {includeGlob: ['**/*.file'], excludeGlob: ['**/a.file']})).out
		).toBe('b.file\nc.file\nsub/deep/d.file\n');
	});

	test('reports when all files are left out', async () => {
		fs.writeFileSync('my.file', 'foo');
		const result = await rr('foo', 'x', {includeGlob: ['*.file'], excludeGlob: ['*.file']});
		expect(result.err).toBe(' 🟡 0 files found\n\n');
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foo');
	});

	test('makes no difference if it finds nothing', async () => {
		const config = {includeGlob: ['*.file'], excludeGlob: ['nope*', 'sub/**']};
		fs.writeFileSync('my.file', 'foo');
		expect((await rr('foo', 'x', config)).out).toBe('my.file\n');
	});

	describe('combined', () => {
		test('with --exclude-re both are used', async () => {
			const config = {includeGlob: ['*.file'], excludeGlob: ['a.*'], excludeRe: ['^b']};
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'foo');
			fs.writeFileSync('c.file', 'foo');
			expect((await rr('foo', 'x', config)).out).toBe('c.file\n');
		});

		test('with a negated glob', async () => {
			const config = {includeGlob: ['*.file', '!a.file'], excludeGlob: ['b.*']};
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'foo');
			fs.writeFileSync('c.file', 'foo');
			expect((await rr('foo', 'x', config)).out).toBe('c.file\n');
		});

		test.each(['output', 'outputMatch'])('with --%s only the files left are sent', async flag => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'boo');
			const config = {includeGlob: ['*.file'], excludeGlob: ['a.*'], [flag]: true};
			expect((await rr('.oo', '$&', config)).out.trim()).toBe('boo');
		});

		test('with --verbose the count is the files left', async () => {
			['a', 'b', 'c'].forEach(name => fs.writeFileSync(name + '.file', 'foo'));
			const config = {includeGlob: ['*.file'], excludeGlob: ['a.*'], verbose: true};
			expect((await rr('o', 'x', config)).err).toContain('2 files found');
		});

		test('with --literal the glob is still a glob', async () => {
			const config = {includeGlob: ['*.file'], excludeGlob: ['a.*'], literal: true};
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'foo');
			expect((await rr('foo', 'x', config)).out).toBe('b.file\n');
		});

		test('with piped data it has nothing to do', async () => {
			expect((await rr('o', 'x', {pipedData: 'foo', excludeGlob: ['*']})).out).toBe('fxx');
		});
	});
});
