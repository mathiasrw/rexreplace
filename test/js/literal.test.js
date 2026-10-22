import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

describe('--literal', () => {
	test('searches for the pattern as plain text', async () => {
		expect((await rr('.', 'x', {pipedData: 'a.b', literal: true})).out).toBe('axb');
		expect((await rr('*+*', 'b', {pipedData: 'foo*+*ar', literal: true})).out).toBe('foobar');
	});

	test('is not the default', async () => {
		expect((await rr('.', 'x', {pipedData: 'a.b'})).out).toBe('xxx');
	});

	test.each(Array.from('-[]{}()*+?.,/\\^$|#'))('takes %s literally', async (char) => {
		const text = `a${char}b${char}${char}c`;
		expect((await rr(char, '_', {pipedData: text, literal: true})).out).toBe('a_b__c');
	});

	test('takes whitespace literally', async () => {
		expect((await rr(' ', '_', {pipedData: 'a b\tc\nd', literal: true})).out).toBe('a_b\tc\nd');
		expect((await rr('\t', '_', {pipedData: 'a b\tc\nd', literal: true})).out).toBe('a b_c\nd');
		expect((await rr('\n', '_', {pipedData: 'a b\tc\nd', literal: true})).out).toBe('a b\tc_d');
	});

	test('takes what looks like a regex literally', async () => {
		expect((await rr('(a|b)+', 'x', {pipedData: 'ab (a|b)+ ab', literal: true})).out).toBe(
			'ab x ab'
		);
		expect((await rr('[a-z]', 'x', {pipedData: 'ab [a-z]', literal: true})).out).toBe('ab x');
		expect((await rr('\\d', 'x', {pipedData: '1 \\d', literal: true})).out).toBe('1 x');
		expect((await rr('^a$', 'x', {pipedData: 'a\n^a$', literal: true})).out).toBe('a\nx');
	});

	test('still lets the replacement refer to the match', async () => {
		expect((await rr('.', '[$&]', {pipedData: 'a.b', literal: true})).out).toBe('a[.]b');
	});

	describe('combined', () => {
		test('is still case insensitive and global', async () => {
			expect((await rr('a.', 'x', {pipedData: 'a. A. ab', literal: true})).out).toBe(
				'x x ab'
			);
		});

		test('with --void-ignore-case and --void-global', async () => {
			const config = {
				pipedData: 'A. a. a.',
				literal: true,
				voidIgnoreCase: true,
				voidGlobal: true,
			};
			expect((await rr('a.', 'x', config)).out).toBe('A. x a.');
		});

		test('€ and § are still aliases for $ and \\ unless voided', async () => {
			expect((await rr('€', 'x', {pipedData: '€ $', literal: true})).out).toBe('€ x');
			expect((await rr('§', 'x', {pipedData: '§ \\', literal: true})).out).toBe('§ x');
			expect(
				(await rr('€', 'x', {pipedData: '€ $', literal: true, voidEuro: true})).out
			).toBe('x $');
			expect(
				(await rr('§', 'x', {pipedData: '§ \\', literal: true, voidSection: true})).out
			).toBe('x \\');
		});

		test('with --output-match', async () => {
			expect(
				(await rr('o.', '_', {pipedData: 'foo. o.k', literal: true, outputMatch: true})).out
			).toBe('o.\no.\n');
		});

		test('with --replacement-js', async () => {
			const config = {pipedData: '1+1 = 2', literal: true, replacementJs: true};
			expect((await rr('1+1', '$0.length', config)).out).toBe('3 = 2');
		});

		test('with --exclude-re the exclusion is literal too', async () => {
			fs.writeFileSync('a.file', 'foobar');
			fs.writeFileSync('axfile', 'foobar');
			await rr('o', 'x', {includeGlob: ['a*file'], excludeRe: ['a.file'], literal: true});
			expect(fs.readFileSync('a.file', 'utf8')).toBe('foobar');
			expect(fs.readFileSync('axfile', 'utf8')).toBe('fxxbar');
		});

		test.each([...'-,# []{}()*+?./\\^$|'])(
			'with --unicode finds a pattern with %j in it (#686)',
			async (char) => {
				const pattern = `a${char}b`;
				const config = {pipedData: pattern, literal: true, unicode: true};
				expect(await rr(pattern, 'x', config)).toEqual({out: 'x', err: '', exit: null});
			}
		);
	});
});
