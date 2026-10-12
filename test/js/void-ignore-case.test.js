import {describe, test, expect} from 'bun:test';
import {rr} from './helper.js';

describe('--void-ignore-case', () => {
	test('makes the search case sensitive', async () => {
		expect((await rr('Foo', 'x', {pipedData: 'foobar Foobar', voidIgnoreCase: true})).out).toBe(
			'foobar xbar'
		);
	});

	test('is not the default', async () => {
		expect((await rr('Foo', 'x', {pipedData: 'foobar Foobar'})).out).toBe('xbar xbar');
	});

	test('applies to char classes and ranges', async () => {
		expect((await rr('[a-c]', '_', {pipedData: 'abcABC'})).out).toBe('______');
		expect((await rr('[a-c]', '_', {pipedData: 'abcABC', voidIgnoreCase: true})).out).toBe(
			'___ABC'
		);
	});

	test('applies to letters outside ascii', async () => {
		expect((await rr('æ', '_', {pipedData: 'æÆ'})).out).toBe('__');
		expect((await rr('æ', '_', {pipedData: 'æÆ', voidIgnoreCase: true})).out).toBe('_Æ');
	});

	test('applies to backreferences inside the pattern', async () => {
		expect((await rr('(a)\\1', '_', {pipedData: 'aA aa'})).out).toBe('_ _');
		expect((await rr('(a)\\1', '_', {pipedData: 'aA aa', voidIgnoreCase: true})).out).toBe(
			'aA _'
		);
	});

	describe('combined', () => {
		test('with --literal', async () => {
			const config = {pipedData: 'a.b A.B', literal: true, voidIgnoreCase: true};
			expect((await rr('A.B', 'x', config)).out).toBe('a.b x');
		});

		test('with --output-match', async () => {
			const config = {pipedData: 'foo Foo FOO', outputMatch: true, voidIgnoreCase: true};
			expect((await rr('F.o', '_', config)).out).toBe('Foo\n');
		});

		test('with --replacement-js', async () => {
			const config = {pipedData: 'foo Foo', replacementJs: true, voidIgnoreCase: true};
			expect((await rr('F(oo)', '$1.toUpperCase()', config)).out).toBe('foo OO');
		});

		test('with --unicode', async () => {
			const config = {pipedData: 'ǆ ǅ Ǆ', unicode: true};
			expect((await rr('ǆ', '_', config)).out).toBe('_ _ _');
			expect((await rr('ǆ', '_', {...config, voidIgnoreCase: true})).out).toBe('_ ǅ Ǆ');
		});
	});
});
