import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

// Make `names` as files containing "foo" and return the ones changed by replacing "foo"
const changed = (names, config) => {
	names.forEach((name) => {
		fs.mkdirSync(name.replace(/[^/]*$/, '') || '.', {recursive: true});
		fs.writeFileSync(name, 'foo');
	});
	rr('foo', 'x', config);
	return names.filter((name) => 'x' === fs.readFileSync(name, 'utf8'));
};

describe('--exclude-glob', () => {
	test('leaves out the files found by the glob', () => {
		const config = {includeGlob: ['*.file'], excludeGlob: ['y*']};
		expect(changed(['my.file', 'your.file'], config)).toEqual(['my.file']);
	});

	test('can be the name of a file', () => {
		const config = {includeGlob: ['*.file'], excludeGlob: ['your.file']};
		expect(changed(['my.file', 'your.file'], config)).toEqual(['my.file']);
	});

	test('can be given several times', () => {
		const names = ['a.file', 'b.file', 'c.file'];
		expect(changed(names, {includeGlob: ['*.file'], excludeGlob: ['a.*', 'b.*']})).toEqual([
			'c.file',
		]);
	});

	test('understands braces and **', () => {
		const names = ['a.file', 'b.file', 'c.file', 'sub/a.file', 'sub/deep/d.file'];
		expect(changed(names, {includeGlob: ['**/*.file'], excludeGlob: ['{a,b}.file']})).toEqual([
			'c.file',
			'sub/a.file',
			'sub/deep/d.file',
		]);
		expect(changed(names, {includeGlob: ['**/*.file'], excludeGlob: ['sub/**']})).toEqual([
			'a.file',
			'b.file',
			'c.file',
		]);
		expect(changed(names, {includeGlob: ['**/*.file'], excludeGlob: ['**/a.file']})).toEqual([
			'b.file',
			'c.file',
			'sub/deep/d.file',
		]);
	});

	test('reports when all files are left out', () => {
		fs.writeFileSync('my.file', 'foo');
		const result = rr('foo', 'x', {includeGlob: ['*.file'], excludeGlob: ['*.file']});
		expect(result.err).toBe('0 files found \n');
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foo');
	});

	test('makes no difference if it finds nothing', () => {
		const config = {includeGlob: ['*.file'], excludeGlob: ['nope*', 'sub/**']};
		expect(changed(['my.file'], config)).toEqual(['my.file']);
	});

	describe('combined', () => {
		test('with --exclude-re both are used', () => {
			const names = ['a.file', 'b.file', 'c.file'];
			const config = {includeGlob: ['*.file'], excludeGlob: ['a.*'], excludeRe: ['^b']};
			expect(changed(names, config)).toEqual(['c.file']);
		});

		test('with a negated glob', () => {
			const names = ['a.file', 'b.file', 'c.file'];
			const config = {includeGlob: ['*.file', '!a.file'], excludeGlob: ['b.*']};
			expect(changed(names, config)).toEqual(['c.file']);
		});

		test.each(['output', 'outputMatch'])('with --%s only the files left are sent', (flag) => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'boo');
			const config = {includeGlob: ['*.file'], excludeGlob: ['a.*'], [flag]: true};
			expect(rr('.oo', '$&', config).out.trim()).toBe('boo');
		});

		test('with --verbose the count is the files left', () => {
			['a', 'b', 'c'].forEach((name) => fs.writeFileSync(name + '.file', 'foo'));
			const config = {includeGlob: ['*.file'], excludeGlob: ['a.*'], verbose: true};
			expect(rr('o', 'x', config).err).toContain('2 files found');
		});

		test('with --literal the glob is still a glob', () => {
			const names = ['a.file', 'b.file'];
			const config = {includeGlob: ['*.file'], excludeGlob: ['a.*'], literal: true};
			expect(changed(names, config)).toEqual(['b.file']);
		});

		test('with piped data it has nothing to do', () => {
			expect(rr('o', 'x', {pipedData: 'foo', excludeGlob: ['*']}).out).toBe('fxx');
		});
	});
});
