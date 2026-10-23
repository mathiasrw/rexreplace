// https://github.com/mathiasrw/rexreplace/issues/683
// `--exclude-re` promises to "follow same regex flags and setup as the main search" but was used as a regex with no flags (so it was always case sensitive).
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

// Make `names` as files containing "foo" and return the ones changed by replacing "foo"
const changed = async (names, config) => {
	names.forEach(name => fs.writeFileSync(name, 'foo'));
	await rr('foo', 'x', {includeGlob: ['*.file'], ...config});
	return names.filter(name => 'x' === fs.readFileSync(name, 'utf8'));
};

describe('#683 --exclude-re follows the regex flags of the main search', () => {
	test('the example from the issue', async () => {
		fs.writeFileSync('a.file', 'x\n');
		const config = {includeGlob: ['a.file'], excludeRe: ['A'], output: true};
		expect(await rr('x', 'y', config)).toEqual({out: '', err: '0 files found\n', exit: 1});
		expect((await rr('x', 'y', {...config, voidIgnoreCase: true})).out).toBe('y\n');
	});

	test('ignores case as default', async () => {
		expect(await changed(['MY.file', 'your.file'], {excludeRe: ['^my']})).toEqual(['your.file']);
		expect(await changed(['my.file', 'your.file'], {excludeRe: ['^MY']})).toEqual(['your.file']);
	});

	test('--void-ignore-case makes the case matter', async () => {
		const names = ['MY.file', 'your.file'];
		expect(await changed(names, {excludeRe: ['^my'], voidIgnoreCase: true})).toEqual(names);
		expect(await changed(names, {excludeRe: ['^MY'], voidIgnoreCase: true})).toEqual(['your.file']);
	});

	test('--dot-all lets a dot match a line break in the path', async () => {
		const names = ['a\nb.file', 'ab.file'];
		expect(await changed(names, {excludeRe: ['a.b']})).toEqual(names);
		expect(await changed(names, {excludeRe: ['a.b'], dotAll: true})).toEqual(['ab.file']);
	});

	test('--void-multiline makes ^ match only at the start of the path', async () => {
		const names = ['a\nb.file', 'c.file'];
		expect(await changed(names, {excludeRe: ['^b']})).toEqual(['c.file']);
		expect(await changed(names, {excludeRe: ['^b'], voidMultiline: true})).toEqual(names);
	});

	test('--unicode lets \\u{...} match in the path', async () => {
		const names = ['a.file', 'b.file'];
		expect(await changed(names, {excludeRe: ['\\u{61}']})).toEqual(names);
		expect(await changed(names, {excludeRe: ['\\u{61}'], unicode: true})).toEqual(['b.file']);
	});

	test('an invalid regex stops with an error (used to throw a SyntaxError)', async () => {
		fs.writeFileSync('my.file', 'foo');
		const result = await rr('foo', 'x', {includeGlob: ['my.file'], excludeRe: ['(']});
		expect(result.err).toContain('Invalid regular expression');
		expect(result.exit).toBe(1);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foo');
	});
});
