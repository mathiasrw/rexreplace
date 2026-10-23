import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('--exclude-re', () => {
	test('leaves out files with a path matching the regex', async () => {
		const config = {includeGlob: ['*.file'], excludeRe: ['^y']};
		fs.writeFileSync('my.file', 'foo');
		fs.writeFileSync('your.file', 'foo');
		expect((await rr('foo', 'x', config)).out).toBe('my.file\n');
	});

	test('matches anywhere in the path unless anchored', async () => {
		fs.writeFileSync('my.file', 'foo');
		fs.writeFileSync('your.file', 'foo');
		expect((await rr('foo', 'x', {includeGlob: ['*.file'], excludeRe: ['y']})).out).toBe('');
	});

	test('is a regex', async () => {
		fs.writeFileSync('a1.file', 'foo');
		fs.writeFileSync('a2.file', 'foo');
		fs.writeFileSync('ab.file', 'foo');
		expect((await rr('foo', 'x', {includeGlob: ['*.file'], excludeRe: ['a\\d\\.file$']})).out).toBe(
			'ab.file\n'
		);
	});

	test('can be given several times', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		fs.writeFileSync('c.file', 'foo');
		expect((await rr('foo', 'x', {includeGlob: ['*.file'], excludeRe: ['^a', '^b']})).out).toBe(
			'c.file\n'
		);
	});

	test('sees the path of files in sub directories', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.mkdirSync('sub', {recursive: true});
		fs.writeFileSync('sub/a.file', 'foo');
		fs.mkdirSync('sub/deep', {recursive: true});
		fs.writeFileSync('sub/deep/a.file', 'foo');
		expect(
			(await rr('foo', 'x', {includeGlob: ['**/*.file'], excludeRe: ['^sub/[^/]+$']})).out
		).toBe('a.file\nsub/deep/a.file\n');
	});

	test('reports when all files are left out', async () => {
		fs.writeFileSync('my.file', 'foo');
		const result = await rr('foo', 'x', {includeGlob: ['my.file'], excludeRe: ['.']});
		expect(result.err).toBe(' 🟡 0 files found\n\n');
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foo');
	});

	test('makes no difference if it matches nothing', async () => {
		fs.writeFileSync('my.file', 'foo');
		expect((await rr('foo', 'x', {includeGlob: ['*.file'], excludeRe: ['nope']})).out).toBe(
			'my.file\n'
		);
	});

	test('follows the regex flags of the main search', async () => {
		fs.writeFileSync('MY.file', 'foo');
		fs.writeFileSync('your.file', 'foo');
		expect((await rr('foo', 'x', {includeGlob: ['*.file'], excludeRe: ['^my']})).out).toBe(
			'your.file\n'
		);
	});

	describe('combined', () => {
		test('with --exclude-glob both are used', async () => {
			const config = {includeGlob: ['*.file'], excludeRe: ['^a'], excludeGlob: ['b.*']};
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'foo');
			fs.writeFileSync('c.file', 'foo');
			expect((await rr('foo', 'x', config)).out).toBe('c.file\n');
		});

		test('with a negated glob', async () => {
			const config = {includeGlob: ['*.file', '!b.file'], excludeRe: ['^a']};
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'foo');
			fs.writeFileSync('c.file', 'foo');
			expect((await rr('foo', 'x', config)).out).toBe('c.file\n');
		});

		test('with --literal the exclusion is plain text', async () => {
			const config = {includeGlob: ['a*'], excludeRe: ['a.file'], literal: true};
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('axfile', 'foo');
			expect((await rr('foo', 'x', config)).out).toBe('axfile\n');
		});

		test('with € and § as aliases unless voided', async () => {
			fs.writeFileSync('a1.file', 'foo');
			fs.writeFileSync('ab.files', 'foo');
			expect((await rr('foo', 'x', {includeGlob: ['a*'], excludeRe: ['§d.file€']})).out).toBe(
				'ab.files\n'
			);
			const voided = {
				includeGlob: ['a*'],
				excludeRe: ['§d.file€'],
				voidEuro: true,
				voidSection: true,
			};
			fs.writeFileSync('a1.file', 'foo');
			fs.writeFileSync('ab.files', 'foo');
			expect((await rr('foo', 'x', voided)).out).toBe('a1.file\nab.files\n');
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
