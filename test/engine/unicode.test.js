import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('--unicode', () => {
	test('lets . match a full emoji', async () => {
		expect((await rr('^.$', 'x', {pipedData: '🦖', unicode: true})).out).toBe('x');
	});

	test('is not the default', async () => {
		expect((await rr('^.$', 'x', {pipedData: '🦖'})).out).toBe('🦖');
	});

	test('understands code point escapes', async () => {
		expect((await rr('\\u{1F996}', 'x', {pipedData: 'a🦖b', unicode: true})).out).toBe('axb');
		expect((await rr('\\u{1F996}', 'x', {pipedData: 'a🦖b'})).out).toBe('a🦖b');
	});

	test('understands unicode property escapes', async () => {
		expect(
			(await rr('\\p{Lu}', '_', {pipedData: 'aÆbÅc', unicode: true, voidIgnoreCase: true})).out
		).toBe('a_b_c');
		expect((await rr('\\p{Script=Greek}+', '_', {pipedData: 'abc αβγ', unicode: true})).out).toBe(
			'abc _'
		);
	});

	test('counts an emoji as one char in quantifiers and classes', async () => {
		expect((await rr('^.{2}$', 'x', {pipedData: '🦖🦖', unicode: true})).out).toBe('x');
		expect((await rr('[🦖🦕]', 'x', {pipedData: 'a🦖b🦕c', unicode: true})).out).toBe('axbxc');
	});

	test('never splits an emoji in two', async () => {
		const out = (await rr('.', '$&-', {pipedData: '🦖🦕', unicode: true})).out;
		expect(out).toBe('🦖-🦕-');
	});

	test('is strict about escapes that have no meaning', async () => {
		expect((await rr('\\-', 'x', {pipedData: 'a-b'})).out).toBe('axb');
		const result = await rr('\\-', 'x', {pipedData: 'a-b', unicode: true});
		expect(result.exit).toBe(3);
		expect(result.err).toContain('Invalid regular expression');
		expect(result.out).toBe('');
	});

	describe('combined', () => {
		test('with files', async () => {
			fs.writeFileSync('my.file', 'a🦖b');
			await rr('a.b', 'x', {includeGlob: ['my.file'], unicode: true});
			expect(fs.readFileSync('my.file', 'utf8')).toBe('x');
		});

		test('with --void-ignore-case', async () => {
			const config = {pipedData: 'Æ🦖 æ🦖', unicode: true, voidIgnoreCase: true};
			expect((await rr('æ.', 'x', config)).out).toBe('Æ🦖 x');
		});

		test('with --dot-all and --void-multiline', async () => {
			const config = {pipedData: '🦖\n🦕', unicode: true, dotAll: true, voidMultiline: true};
			expect((await rr('^...$', 'x', config)).out).toBe('x');
		});

		test('with --output-match', async () => {
			const config = {pipedData: 'a🦖 b🦕', unicode: true, outputMatch: true};
			expect((await rr('\\w(.)', '_', config)).out).toBe('🦖\n🦕\n');
		});

		test('with --js', async () => {
			const config = {pipedData: 'a🦖b', unicode: true, replacementJs: true};
			expect((await rr('a(.)b', '$1.codePointAt(0).toString(16)', config)).out).toBe('1f996');
		});

		test('with --literal', async () => {
			const config = {pipedData: 'a.b a🦖b', unicode: true, literal: true};
			expect((await rr('a.b', 'x', config)).out).toBe('x a🦖b');
			expect((await rr('🦖', 'x', config)).out).toBe('a.b axb');
		});
	});
});
