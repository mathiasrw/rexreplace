import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

// Make `names` as files containing "foo" and return the ones changed by replacing "foo"
const changed = async (names, config) => {
	names.forEach(name => {
		fs.mkdirSync(name.replace(/[^/]*$/, '') || '.', {recursive: true});
		fs.writeFileSync(name, 'foo');
	});
	await rr('foo', 'x', config);
	return names.filter(name => 'x' === fs.readFileSync(name, 'utf8'));
};

describe('--exclude-re', () => {
	test('leaves out files with a path matching the regex', async () => {
		const config = {includeGlob: ['*.file'], excludeRe: ['^y']};
		expect(await changed(['my.file', 'your.file'], config)).toEqual(['my.file']);
	});

	test('matches anywhere in the path unless anchored', async () => {
		const names = ['my.file', 'your.file'];
		expect(await changed(names, {includeGlob: ['*.file'], excludeRe: ['y']})).toEqual([]);
	});

	test('is a regex', async () => {
		const names = ['a1.file', 'a2.file', 'ab.file'];
		expect(await changed(names, {includeGlob: ['*.file'], excludeRe: ['a\\d\\.file$']})).toEqual([
			'ab.file',
		]);
	});

	test('can be given several times', async () => {
		const names = ['a.file', 'b.file', 'c.file'];
		expect(await changed(names, {includeGlob: ['*.file'], excludeRe: ['^a', '^b']})).toEqual([
			'c.file',
		]);
	});

	test('sees the path of files in sub directories', async () => {
		const names = ['a.file', 'sub/a.file', 'sub/deep/a.file'];
		expect(await changed(names, {includeGlob: ['**/*.file'], excludeRe: ['^sub/[^/]+$']})).toEqual([
			'a.file',
			'sub/deep/a.file',
		]);
	});

	test('reports when all files are left out', async () => {
		fs.writeFileSync('my.file', 'foo');
		const result = await rr('foo', 'x', {includeGlob: ['my.file'], excludeRe: ['.']});
		expect(result.err).toBe('0 files found\n');
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foo');
	});

	test('makes no difference if it matches nothing', async () => {
		expect(await changed(['my.file'], {includeGlob: ['*.file'], excludeRe: ['nope']})).toEqual([
			'my.file',
		]);
	});

	test('follows the regex flags of the main search', async () => {
		const names = ['MY.file', 'your.file'];
		expect(await changed(names, {includeGlob: ['*.file'], excludeRe: ['^my']})).toEqual([
			'your.file',
		]);
	});

	describe('combined', () => {
		test('with --exclude-glob both are used', async () => {
			const names = ['a.file', 'b.file', 'c.file'];
			const config = {includeGlob: ['*.file'], excludeRe: ['^a'], excludeGlob: ['b.*']};
			expect(await changed(names, config)).toEqual(['c.file']);
		});

		test('with a negated glob', async () => {
			const names = ['a.file', 'b.file', 'c.file'];
			const config = {includeGlob: ['*.file', '!b.file'], excludeRe: ['^a']};
			expect(await changed(names, config)).toEqual(['c.file']);
		});

		test('with --literal the exclusion is plain text', async () => {
			const names = ['a.file', 'axfile'];
			const config = {includeGlob: ['a*'], excludeRe: ['a.file'], literal: true};
			expect(await changed(names, config)).toEqual(['axfile']);
		});

		test('with € and § as aliases unless voided', async () => {
			const names = ['a1.file', 'ab.files'];
			expect(await changed(names, {includeGlob: ['a*'], excludeRe: ['§d.file€']})).toEqual([
				'ab.files',
			]);
			const voided = {
				includeGlob: ['a*'],
				excludeRe: ['§d.file€'],
				voidEuro: true,
				voidSection: true,
			};
			expect(await changed(names, voided)).toEqual(names);
		});

		test('with --output only the files left are sent', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'boo');
			const config = {includeGlob: ['*.file'], excludeRe: ['^a'], output: true};
			expect((await rr('o', 'x', config)).out).toBe('bxx\n');
		});

		test('with piped data it has nothing to do', async () => {
			expect((await rr('o', 'x', {pipedData: 'foo', excludeRe: ['.']})).out).toBe('fxx');
		});
	});
});
