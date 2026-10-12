import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

describe('--unicode', () => {
	test('lets . match a full emoji', () => {
		expect(rr('^.$', 'x', {pipedData: '🦖', unicode: true}).out).toBe('x');
	});

	test('is not the default', () => {
		expect(rr('^.$', 'x', {pipedData: '🦖'}).out).toBe('🦖');
	});

	test('understands code point escapes', () => {
		expect(rr('\\u{1F996}', 'x', {pipedData: 'a🦖b', unicode: true}).out).toBe('axb');
		expect(rr('\\u{1F996}', 'x', {pipedData: 'a🦖b'}).out).toBe('a🦖b');
	});

	test('understands unicode property escapes', () => {
		expect(
			rr('\\p{Lu}', '_', {pipedData: 'aÆbÅc', unicode: true, voidIgnoreCase: true}).out
		).toBe('a_b_c');
		expect(rr('\\p{Script=Greek}+', '_', {pipedData: 'abc αβγ', unicode: true}).out).toBe(
			'abc _'
		);
	});

	test('counts an emoji as one char in quantifiers and classes', () => {
		expect(rr('^.{2}$', 'x', {pipedData: '🦖🦖', unicode: true}).out).toBe('x');
		expect(rr('[🦖🦕]', 'x', {pipedData: 'a🦖b🦕c', unicode: true}).out).toBe('axbxc');
	});

	test('never splits an emoji in two', () => {
		const out = rr('.', '$&-', {pipedData: '🦖🦕', unicode: true}).out;
		expect(out).toBe('🦖-🦕-');
	});

	test('is strict about escapes that have no meaning', () => {
		expect(rr('\\-', 'x', {pipedData: 'a-b'}).out).toBe('axb');
		const result = rr('\\-', 'x', {pipedData: 'a-b', unicode: true});
		expect(result.exit).toBe(1);
		expect(result.err).toContain('Invalid regular expression');
		expect(result.out).toBe('');
	});

	describe('combined', () => {
		test('with files', () => {
			fs.writeFileSync('my.file', 'a🦖b');
			rr('a.b', 'x', {includeGlob: ['my.file'], unicode: true});
			expect(fs.readFileSync('my.file', 'utf8')).toBe('x');
		});

		test('with --void-ignore-case', () => {
			const config = {pipedData: 'Æ🦖 æ🦖', unicode: true, voidIgnoreCase: true};
			expect(rr('æ.', 'x', config).out).toBe('Æ🦖 x');
		});

		test('with --dot-all and --void-multiline', () => {
			const config = {pipedData: '🦖\n🦕', unicode: true, dotAll: true, voidMultiline: true};
			expect(rr('^...$', 'x', config).out).toBe('x');
		});

		test('with --output-match', () => {
			const config = {pipedData: 'a🦖 b🦕', unicode: true, outputMatch: true};
			expect(rr('\\w(.)', '_', config).out).toBe('🦖\n🦕\n');
		});

		test('with --replacement-js', () => {
			const config = {pipedData: 'a🦖b', unicode: true, replacementJs: true};
			expect(rr('a(.)b', '$1.codePointAt(0).toString(16)', config).out).toBe('1f996');
		});

		test('with --literal', () => {
			const config = {pipedData: 'a.b a🦖b', unicode: true, literal: true};
			expect(rr('a.b', 'x', config).out).toBe('x a🦖b');
			expect(rr('🦖', 'x', config).out).toBe('a.b axb');
		});
	});
});
