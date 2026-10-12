import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

// Make `names` as files containing "foo" and return the ones changed by replacing "foo"
const changed = async (names, config) => {
	names.forEach((name) => {
		fs.mkdirSync(name.replace(/[^/]*$/, '') || '.', {recursive: true});
		fs.writeFileSync(name, 'foo');
	});
	await rr('foo', 'x', config);
	return names.filter((name) => 'x' === fs.readFileSync(name, 'utf8'));
};

describe('--exclude-glob', () => {
	test('leaves out the files found by the glob', async () => {
		const config = {includeGlob: ['*.file'], excludeGlob: ['y*']};
		expect(await changed(['my.file', 'your.file'], config)).toEqual(['my.file']);
	});

	test('can be the name of a file', async () => {
		const config = {includeGlob: ['*.file'], excludeGlob: ['your.file']};
		expect(await changed(['my.file', 'your.file'], config)).toEqual(['my.file']);
	});

	test('can be given several times', async () => {
		const names = ['a.file', 'b.file', 'c.file'];
		expect(
			await changed(names, {includeGlob: ['*.file'], excludeGlob: ['a.*', 'b.*']})
		).toEqual(['c.file']);
	});

	test('understands braces and **', async () => {
		const names = ['a.file', 'b.file', 'c.file', 'sub/a.file', 'sub/deep/d.file'];
		expect(
			await changed(names, {includeGlob: ['**/*.file'], excludeGlob: ['{a,b}.file']})
		).toEqual(['c.file', 'sub/a.file', 'sub/deep/d.file']);
		expect(await changed(names, {includeGlob: ['**/*.file'], excludeGlob: ['sub/**']})).toEqual(
			['a.file', 'b.file', 'c.file']
		);
		expect(
			await changed(names, {includeGlob: ['**/*.file'], excludeGlob: ['**/a.file']})
		).toEqual(['b.file', 'c.file', 'sub/deep/d.file']);
	});

	test('reports when all files are left out', async () => {
		fs.writeFileSync('my.file', 'foo');
		const result = await rr('foo', 'x', {includeGlob: ['*.file'], excludeGlob: ['*.file']});
		expect(result.err).toBe('0 files found \n');
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foo');
	});

	test('makes no difference if it finds nothing', async () => {
		const config = {includeGlob: ['*.file'], excludeGlob: ['nope*', 'sub/**']};
		expect(await changed(['my.file'], config)).toEqual(['my.file']);
	});

	describe('combined', () => {
		test('with --exclude-re both are used', async () => {
			const names = ['a.file', 'b.file', 'c.file'];
			const config = {includeGlob: ['*.file'], excludeGlob: ['a.*'], excludeRe: ['^b']};
			expect(await changed(names, config)).toEqual(['c.file']);
		});

		test('with a negated glob', async () => {
			const names = ['a.file', 'b.file', 'c.file'];
			const config = {includeGlob: ['*.file', '!a.file'], excludeGlob: ['b.*']};
			expect(await changed(names, config)).toEqual(['c.file']);
		});

		test.each(['output', 'outputMatch'])(
			'with --%s only the files left are sent',
			async (flag) => {
				fs.writeFileSync('a.file', 'foo');
				fs.writeFileSync('b.file', 'boo');
				const config = {includeGlob: ['*.file'], excludeGlob: ['a.*'], [flag]: true};
				expect((await rr('.oo', '$&', config)).out.trim()).toBe('boo');
			}
		);

		test('with --verbose the count is the files left', async () => {
			['a', 'b', 'c'].forEach((name) => fs.writeFileSync(name + '.file', 'foo'));
			const config = {includeGlob: ['*.file'], excludeGlob: ['a.*'], verbose: true};
			expect((await rr('o', 'x', config)).err).toContain('2 files found');
		});

		test('with --literal the glob is still a glob', async () => {
			const names = ['a.file', 'b.file'];
			const config = {includeGlob: ['*.file'], excludeGlob: ['a.*'], literal: true};
			expect(await changed(names, config)).toEqual(['b.file']);
		});

		test('with piped data it has nothing to do', async () => {
			expect((await rr('o', 'x', {pipedData: 'foo', excludeGlob: ['*']})).out).toBe('fxx');
		});
	});
});
