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

describe('--exclude-re', () => {
	test('leaves out files with a path matching the regex', () => {
		const config = {includeGlob: ['*.file'], excludeRe: ['^y']};
		expect(changed(['my.file', 'your.file'], config)).toEqual(['my.file']);
	});

	test('matches anywhere in the path unless anchored', () => {
		const names = ['my.file', 'your.file'];
		expect(changed(names, {includeGlob: ['*.file'], excludeRe: ['y']})).toEqual([]);
	});

	test('is a regex', () => {
		const names = ['a1.file', 'a2.file', 'ab.file'];
		expect(changed(names, {includeGlob: ['*.file'], excludeRe: ['a\\d\\.file$']})).toEqual([
			'ab.file',
		]);
	});

	test('can be given several times', () => {
		const names = ['a.file', 'b.file', 'c.file'];
		expect(changed(names, {includeGlob: ['*.file'], excludeRe: ['^a', '^b']})).toEqual([
			'c.file',
		]);
	});

	test('sees the path of files in sub directories', () => {
		const names = ['a.file', 'sub/a.file', 'sub/deep/a.file'];
		expect(changed(names, {includeGlob: ['**/*.file'], excludeRe: ['^sub/[^/]+$']})).toEqual([
			'a.file',
			'sub/deep/a.file',
		]);
	});

	test('reports when all files are left out', () => {
		fs.writeFileSync('my.file', 'foo');
		const result = rr('foo', 'x', {includeGlob: ['my.file'], excludeRe: ['.']});
		expect(result.err).toBe('0 files found \n');
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foo');
	});

	test('makes no difference if it matches nothing', () => {
		expect(changed(['my.file'], {includeGlob: ['*.file'], excludeRe: ['nope']})).toEqual([
			'my.file',
		]);
	});

	test.todo(
		'BUG #683: follows the regex flags of the main search (as the help text promises)',
		() => {
			const names = ['MY.file', 'your.file'];
			expect(changed(names, {includeGlob: ['*.file'], excludeRe: ['^my']})).toEqual([
				'your.file',
			]);
		}
	);

	describe('combined', () => {
		test('with --exclude-glob both are used', () => {
			const names = ['a.file', 'b.file', 'c.file'];
			const config = {includeGlob: ['*.file'], excludeRe: ['^a'], excludeGlob: ['b.*']};
			expect(changed(names, config)).toEqual(['c.file']);
		});

		test('with a negated glob', () => {
			const names = ['a.file', 'b.file', 'c.file'];
			const config = {includeGlob: ['*.file', '!b.file'], excludeRe: ['^a']};
			expect(changed(names, config)).toEqual(['c.file']);
		});

		test('with --literal the exclusion is plain text', () => {
			const names = ['a.file', 'axfile'];
			const config = {includeGlob: ['a*'], excludeRe: ['a.file'], literal: true};
			expect(changed(names, config)).toEqual(['axfile']);
		});

		test('with € and § as aliases unless voided', () => {
			const names = ['a1.file', 'ab.files'];
			expect(changed(names, {includeGlob: ['a*'], excludeRe: ['§d.file€']})).toEqual([
				'ab.files',
			]);
			const voided = {
				includeGlob: ['a*'],
				excludeRe: ['§d.file€'],
				voidEuro: true,
				voidSection: true,
			};
			expect(changed(names, voided)).toEqual(names);
		});

		test('with --output only the files left are sent', () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'boo');
			const config = {includeGlob: ['*.file'], excludeRe: ['^a'], output: true};
			expect(rr('o', 'x', config).out).toBe('bxx');
		});

		test('with piped data it has nothing to do', () => {
			expect(rr('o', 'x', {pipedData: 'foo', excludeRe: ['.']}).out).toBe('fxx');
		});
	});
});
