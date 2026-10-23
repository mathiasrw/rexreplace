// https://github.com/mathiasrw/rexreplace/issues/683
// `--exclude-re` promises to "follow same regex flags and setup as the main search" but was used as a regex with no flags (so it was always case sensitive).
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('#683 --exclude-re follows the regex flags of the main search', () => {
	test('the example from the issue', async () => {
		fs.writeFileSync('a.file', 'x\n');
		const config = {includeGlob: ['a.file'], excludeRe: ['A'], output: true};
		expect(await rr('x', 'y', config)).toEqual({out: '', err: ' 🟡 0 files found\n\n', exit: null});
		expect((await rr('x', 'y', {...config, voidIgnoreCase: true})).out).toBe('y\n');
	});

	test('ignores case as default', async () => {
		fs.writeFileSync('MY.file', 'foo');
		fs.writeFileSync('your.file', 'foo');
		expect((await rr('foo', 'x', {includeGlob: ['*.file'], excludeRe: ['^my']})).out).toBe(
			'your.file\n'
		);
		fs.writeFileSync('my.file', 'foo');
		fs.writeFileSync('your.file', 'foo');
		expect((await rr('foo', 'x', {includeGlob: ['*.file'], excludeRe: ['^MY']})).out).toBe(
			'your.file\n'
		);
	});

	test('--void-ignore-case makes the case matter', async () => {
		fs.writeFileSync('MY.file', 'foo');
		fs.writeFileSync('your.file', 'foo');
		expect(
			(await rr('foo', 'x', {includeGlob: ['*.file'], excludeRe: ['^my'], voidIgnoreCase: true}))
				.out
		).toBe('MY.file\nyour.file\n');
		fs.writeFileSync('MY.file', 'foo');
		fs.writeFileSync('your.file', 'foo');
		expect(
			(await rr('foo', 'x', {includeGlob: ['*.file'], excludeRe: ['^MY'], voidIgnoreCase: true}))
				.out
		).toBe('your.file\n');
	});

	test('--dot-all lets a dot match a line break in the path', async () => {
		fs.writeFileSync('a\nb.file', 'foo');
		fs.writeFileSync('ab.file', 'foo');
		expect((await rr('foo', 'x', {includeGlob: ['*.file'], excludeRe: ['a.b']})).out).toBe(
			'a\nb.file\nab.file\n'
		);
		fs.writeFileSync('a\nb.file', 'foo');
		fs.writeFileSync('ab.file', 'foo');
		expect(
			(await rr('foo', 'x', {includeGlob: ['*.file'], excludeRe: ['a.b'], dotAll: true})).out
		).toBe('ab.file\n');
	});

	test('--void-multiline makes ^ match only at the start of the path', async () => {
		fs.writeFileSync('a\nb.file', 'foo');
		fs.writeFileSync('c.file', 'foo');
		expect((await rr('foo', 'x', {includeGlob: ['*.file'], excludeRe: ['^b']})).out).toBe(
			'c.file\n'
		);
		fs.writeFileSync('a\nb.file', 'foo');
		fs.writeFileSync('c.file', 'foo');
		expect(
			(await rr('foo', 'x', {includeGlob: ['*.file'], excludeRe: ['^b'], voidMultiline: true})).out
		).toBe('a\nb.file\nc.file\n');
	});

	test('--unicode lets \\u{...} match in the path', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		expect((await rr('foo', 'x', {includeGlob: ['*.file'], excludeRe: ['\\u{61}']})).out).toBe(
			'a.file\nb.file\n'
		);
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		expect(
			(await rr('foo', 'x', {includeGlob: ['*.file'], excludeRe: ['\\u{61}'], unicode: true})).out
		).toBe('b.file\n');
	});

	test('an invalid regex stops with an error (used to throw a SyntaxError)', async () => {
		fs.writeFileSync('my.file', 'foo');
		const result = await rr('foo', 'x', {includeGlob: ['my.file'], excludeRe: ['(']});
		expect(result.err).toContain('Invalid regular expression');
		expect(result.exit).toBe(1);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foo');
	});
});
