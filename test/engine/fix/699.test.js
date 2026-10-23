// https://github.com/mathiasrw/rexreplace/issues/699
// The documentation said that `€` and `§` are aliases "in the CLI input", but they are only aliases in the pattern, the replacement and `--exclude-re`.
// These tests pin that file globs, `--exclude-glob` and piped data are used exactly as they are.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../../helper.js';

const voided = {voidEuro: true, voidSection: true};

describe('#699 € and § are only aliases in the pattern, the replacement and --exclude-re', () => {
	describe('file globs', () => {
		test('€ is a plain char', async () => {
			fs.writeFileSync('cost€.file', 'foo');
			fs.writeFileSync('cost$.file', 'foo');
			expect((await rr('foo', 'x', {includeGlob: ['cost€.file']})).out).toBe('cost€.file\n');
			fs.writeFileSync('cost€.file', 'foo');
			fs.writeFileSync('cost$.file', 'foo');
			expect((await rr('foo', 'x', {includeGlob: ['cost$.file']})).out).toBe('cost$.file\n');
			fs.writeFileSync('cost€.file', 'foo');
			fs.writeFileSync('cost$.file', 'foo');
			expect((await rr('foo', 'x', {includeGlob: ['*€.file']})).out).toBe('cost€.file\n');
		});

		test('§ is a plain char', async () => {
			fs.writeFileSync('par§.file', 'foo');
			fs.writeFileSync('par.file', 'foo');
			expect((await rr('foo', 'x', {includeGlob: ['par§.file']})).out).toBe('par§.file\n');
			fs.writeFileSync('par§.file', 'foo');
			fs.writeFileSync('par.file', 'foo');
			expect((await rr('foo', 'x', {includeGlob: ['*§.file']})).out).toBe('par§.file\n');
		});

		test('§ does not escape like a backslash does', async () => {
			fs.writeFileSync('a[1].file', 'foo');
			fs.writeFileSync('a1.file', 'foo');
			expect((await rr('foo', 'x', {includeGlob: ['a\\[1\\].file']})).out).toBe('a[1].file\n');
			fs.writeFileSync('a[1].file', 'foo');
			fs.writeFileSync('a1.file', 'foo');
			expect((await rr('foo', 'x', {includeGlob: ['a§[1§].file']})).out).toBe('');
		});

		test('--void-euro and --void-section make no difference', async () => {
			fs.writeFileSync('cost€.file', 'foo');
			fs.writeFileSync('cost$.file', 'foo');
			fs.writeFileSync('par§.file', 'foo');
			expect(
				(await rr('foo', 'x', {includeGlob: ['cost€.file', 'par§.file'], ...voided})).out
			).toBe('cost€.file\npar§.file\n');
		});
	});

	describe('--exclude-glob', () => {
		test('€ and § are plain chars', async () => {
			fs.writeFileSync('a[1].file', 'foo');
			fs.writeFileSync('cost$.file', 'foo');
			fs.writeFileSync('cost€.file', 'foo');
			fs.writeFileSync('par§.file', 'foo');
			expect(
				(await rr('foo', 'x', {includeGlob: ['*.file'], excludeGlob: ['cost€.file']})).out
			).toBe('a[1].file\ncost$.file\npar§.file\n');
			fs.writeFileSync('a[1].file', 'foo');
			fs.writeFileSync('cost$.file', 'foo');
			fs.writeFileSync('cost€.file', 'foo');
			fs.writeFileSync('par§.file', 'foo');
			expect(
				(await rr('foo', 'x', {includeGlob: ['*.file'], excludeGlob: ['par§.file']})).out
			).toBe('a[1].file\ncost$.file\ncost€.file\n');
		});

		test('§ does not escape like a backslash does', async () => {
			fs.writeFileSync('a[1].file', 'foo');
			fs.writeFileSync('cost$.file', 'foo');
			fs.writeFileSync('cost€.file', 'foo');
			fs.writeFileSync('par§.file', 'foo');
			expect(
				(await rr('foo', 'x', {includeGlob: ['*.file'], excludeGlob: ['a\\[1\\].file']})).out
			).toBe('cost$.file\ncost€.file\npar§.file\n');
			fs.writeFileSync('a[1].file', 'foo');
			fs.writeFileSync('cost$.file', 'foo');
			fs.writeFileSync('cost€.file', 'foo');
			fs.writeFileSync('par§.file', 'foo');
			expect(
				(await rr('foo', 'x', {includeGlob: ['*.file'], excludeGlob: ['a§[1§].file']})).out
			).toBe('a[1].file\ncost$.file\ncost€.file\npar§.file\n');
		});

		test('--void-euro and --void-section make no difference', async () => {
			const config = {includeGlob: ['*.file'], excludeGlob: ['cost€.file', 'par§.file']};
			fs.writeFileSync('a[1].file', 'foo');
			fs.writeFileSync('cost$.file', 'foo');
			fs.writeFileSync('cost€.file', 'foo');
			fs.writeFileSync('par§.file', 'foo');
			expect((await rr('foo', 'x', config)).out).toBe('a[1].file\ncost$.file\n');
			fs.writeFileSync('a[1].file', 'foo');
			fs.writeFileSync('cost$.file', 'foo');
			fs.writeFileSync('cost€.file', 'foo');
			fs.writeFileSync('par§.file', 'foo');
			expect((await rr('foo', 'x', {...config, ...voided})).out).toBe('a[1].file\ncost$.file\n');
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
			fs.writeFileSync('a1.file', 'foo');
			fs.writeFileSync('ab.file', 'foo');
			fs.writeFileSync('ab.files', 'foo');
			expect((await rr('foo', 'x', {includeGlob: ['a*'], excludeRe: ['§d', 'file€']})).out).toBe(
				'ab.files\n'
			);
			fs.writeFileSync('a1.file', 'foo');
			fs.writeFileSync('ab.file', 'foo');
			fs.writeFileSync('ab.files', 'foo');
			expect(
				(await rr('foo', 'x', {includeGlob: ['a*'], excludeRe: ['§d', 'file€'], ...voided})).out
			).toBe('a1.file\nab.file\nab.files\n');
		});
	});
});
