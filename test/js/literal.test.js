import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

describe('--literal', () => {
	test('searches for the pattern as plain text', () => {
		expect(rr('.', 'x', {pipedData: 'a.b', literal: true}).out).toBe('axb');
		expect(rr('*+*', 'b', {pipedData: 'foo*+*ar', literal: true}).out).toBe('foobar');
	});

	test('is not the default', () => {
		expect(rr('.', 'x', {pipedData: 'a.b'}).out).toBe('xxx');
	});

	test.each(Array.from('-[]{}()*+?.,/\\^$|#'))('takes %s literally', (char) => {
		const text = `a${char}b${char}${char}c`;
		expect(rr(char, '_', {pipedData: text, literal: true}).out).toBe('a_b__c');
	});

	test('takes whitespace literally', () => {
		expect(rr(' ', '_', {pipedData: 'a b\tc\nd', literal: true}).out).toBe('a_b\tc\nd');
		expect(rr('\t', '_', {pipedData: 'a b\tc\nd', literal: true}).out).toBe('a b_c\nd');
		expect(rr('\n', '_', {pipedData: 'a b\tc\nd', literal: true}).out).toBe('a b\tc_d');
	});

	test('takes what looks like a regex literally', () => {
		expect(rr('(a|b)+', 'x', {pipedData: 'ab (a|b)+ ab', literal: true}).out).toBe('ab x ab');
		expect(rr('[a-z]', 'x', {pipedData: 'ab [a-z]', literal: true}).out).toBe('ab x');
		expect(rr('\\d', 'x', {pipedData: '1 \\d', literal: true}).out).toBe('1 x');
		expect(rr('^a$', 'x', {pipedData: 'a\n^a$', literal: true}).out).toBe('a\nx');
	});

	test('still lets the replacement refer to the match', () => {
		expect(rr('.', '[$&]', {pipedData: 'a.b', literal: true}).out).toBe('a[.]b');
	});

	describe('combined', () => {
		test('is still case insensitive and global', () => {
			expect(rr('a.', 'x', {pipedData: 'a. A. ab', literal: true}).out).toBe('x x ab');
		});

		test('with --void-ignore-case and --void-global', () => {
			const config = {
				pipedData: 'A. a. a.',
				literal: true,
				voidIgnoreCase: true,
				voidGlobal: true,
			};
			expect(rr('a.', 'x', config).out).toBe('A. x a.');
		});

		test('€ and § are still aliases for $ and \\ unless voided', () => {
			expect(rr('€', 'x', {pipedData: '€ $', literal: true}).out).toBe('€ x');
			expect(rr('§', 'x', {pipedData: '§ \\', literal: true}).out).toBe('§ x');
			expect(rr('€', 'x', {pipedData: '€ $', literal: true, voidEuro: true}).out).toBe('x $');
			expect(rr('§', 'x', {pipedData: '§ \\', literal: true, voidSection: true}).out).toBe(
				'x \\'
			);
		});

		test('with --output-match', () => {
			expect(
				rr('o.', '_', {pipedData: 'foo. o.k', literal: true, outputMatch: true}).out
			).toBe('o.\no.\n');
		});

		test('with --replacement-js', () => {
			const config = {pipedData: '1+1 = 2', literal: true, replacementJs: true};
			expect(rr('1+1', '$0.length', config).out).toBe('3 = 2');
		});

		test('with --exclude-re the exclusion is literal too', () => {
			fs.writeFileSync('a.file', 'foobar');
			fs.writeFileSync('axfile', 'foobar');
			rr('o', 'x', {includeGlob: ['a*file'], excludeRe: ['a.file'], literal: true});
			expect(fs.readFileSync('a.file', 'utf8')).toBe('foobar');
			expect(fs.readFileSync('axfile', 'utf8')).toBe('fxxbar');
		});

		test.todo(
			'BUG #686: with --unicode a pattern containing - , # or whitespace is rejected as invalid',
			() => {
				Array.from('-,# ').forEach((char) => {
					const result = rr(`a${char}b`, 'x', {
						pipedData: `a${char}b`,
						literal: true,
						unicode: true,
					});
					expect(result.exit, char).toBe(null);
					expect(result.out, char).toBe('x');
				});
			}
		);
	});
});
