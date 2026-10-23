// https://github.com/mathiasrw/rexreplace/issues/699
// The documentation said that `€` and `§` are aliases "in the CLI input", but they are only aliases in the pattern, the replacement and `--exclude-re`.
// These tests pin that file globs, `--exclude-glob` and piped data are used exactly as they are.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../../helper.js';

// Make `names` as files containing "foo" and return the ones changed by replacing "foo"
const changed = async (names, config) => {
	names.forEach(name => fs.writeFileSync(name, 'foo'));
	await rr('foo', 'x', config);
	return names.filter(name => 'x' === fs.readFileSync(name, 'utf8'));
};

const voided = {voidEuro: true, voidSection: true};

describe('#699 € and § are only aliases in the pattern, the replacement and --exclude-re', () => {
	describe('file globs', () => {
		test('€ is a plain char', async () => {
			const names = ['cost€.file', 'cost$.file'];
			expect(await changed(names, {includeGlob: ['cost€.file']})).toEqual(['cost€.file']);
			expect(await changed(names, {includeGlob: ['cost$.file']})).toEqual(['cost$.file']);
			expect(await changed(names, {includeGlob: ['*€.file']})).toEqual(['cost€.file']);
		});

		test('§ is a plain char', async () => {
			const names = ['par§.file', 'par.file'];
			expect(await changed(names, {includeGlob: ['par§.file']})).toEqual(['par§.file']);
			expect(await changed(names, {includeGlob: ['*§.file']})).toEqual(['par§.file']);
		});

		test('§ does not escape like a backslash does', async () => {
			const names = ['a[1].file', 'a1.file'];
			expect(await changed(names, {includeGlob: ['a\\[1\\].file']})).toEqual(['a[1].file']);
			expect(await changed(names, {includeGlob: ['a§[1§].file']})).toEqual([]);
		});

		test('--void-euro and --void-section make no difference', async () => {
			const names = ['cost€.file', 'cost$.file', 'par§.file'];
			expect(await changed(names, {includeGlob: ['cost€.file', 'par§.file'], ...voided})).toEqual([
				'cost€.file',
				'par§.file',
			]);
		});
	});

	describe('--exclude-glob', () => {
		const names = ['a[1].file', 'cost$.file', 'cost€.file', 'par§.file'];

		test('€ and § are plain chars', async () => {
			expect(await changed(names, {includeGlob: ['*.file'], excludeGlob: ['cost€.file']})).toEqual([
				'a[1].file',
				'cost$.file',
				'par§.file',
			]);
			expect(await changed(names, {includeGlob: ['*.file'], excludeGlob: ['par§.file']})).toEqual([
				'a[1].file',
				'cost$.file',
				'cost€.file',
			]);
		});

		test('§ does not escape like a backslash does', async () => {
			expect(
				await changed(names, {includeGlob: ['*.file'], excludeGlob: ['a\\[1\\].file']})
			).toEqual(['cost$.file', 'cost€.file', 'par§.file']);
			expect(await changed(names, {includeGlob: ['*.file'], excludeGlob: ['a§[1§].file']})).toEqual(
				names
			);
		});

		test('--void-euro and --void-section make no difference', async () => {
			const config = {includeGlob: ['*.file'], excludeGlob: ['cost€.file', 'par§.file']};
			expect(await changed(names, {...config, ...voided})).toEqual(await changed(names, config));
		});
	});

	describe('piped data', () => {
		test('content to search is never changed', async () => {
			expect((await rr('o', 'x', {pipedData: 'foo 5€ §n'})).out).toBe('fxx 5€ §n');
			expect((await rr('o', 'x', {pipedData: 'foo 5€ §n', ...voided})).out).toBe('fxx 5€ §n');
		});

		test('a replacement from --replacement-pipe is used as it is', async () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {
				includeGlob: ['my.file'],
				replacementPipe: true,
				pipedData: '[€1§n]',
				output: true,
			};
			expect((await rr('(b)', '_', config)).out).toBe('foo[€1§n]ar\n');
			expect((await rr('(b)', '_', {...config, ...voided})).out).toBe('foo[€1§n]ar\n');
		});
	});

	describe('where the aliases are used', () => {
		test('the pattern', async () => {
			expect((await rr('§w€', 'x', {pipedData: 'foobar'})).out).toBe('foobax');
			expect((await rr('§w€', 'x', {pipedData: 'a §w€', ...voided})).out).toBe('a x');
		});

		test('the replacement', async () => {
			expect((await rr('(b)', '[€1§]', {pipedData: 'foobar'})).out).toBe('foo[b\\]ar');
			expect((await rr('(b)', '[€1§]', {pipedData: 'foobar', ...voided})).out).toBe('foo[€1§]ar');
		});

		test('the replacement with --replacement-js', async () => {
			const config = {pipedData: 'foobar', replacementJs: true};
			expect((await rr('(b)', '€1 + "§n"', config)).out).toBe('foob\nar');
		});

		test('--exclude-re', async () => {
			const names = ['a1.file', 'ab.file', 'ab.files'];
			expect(await changed(names, {includeGlob: ['a*'], excludeRe: ['§d', 'file€']})).toEqual([
				'ab.files',
			]);
			expect(
				await changed(names, {includeGlob: ['a*'], excludeRe: ['§d', 'file€'], ...voided})
			).toEqual(names);
		});
	});
});
