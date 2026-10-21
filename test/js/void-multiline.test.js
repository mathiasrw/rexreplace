import {describe, test, expect} from 'bun:test';
import {rr} from './helper.js';

describe('--void-multiline', () => {
	test('makes ^ match the start of the content only', async () => {
		const config = {pipedData: 'foobar\nfoobar', voidMultiline: true};
		expect((await rr('^.', 'x', config)).out).toBe('xoobar\nfoobar');
	});

	test('makes $ match the end of the content only', async () => {
		const config = {pipedData: 'foobar\nfoobar', voidMultiline: true};
		expect((await rr('.$', 'x', config)).out).toBe('foobar\nfoobax');
	});

	test('is not the default', async () => {
		expect((await rr('^.', 'x', {pipedData: 'foobar\nfoobar'})).out).toBe('xoobar\nxoobar');
		expect((await rr('.$', 'x', {pipedData: 'foobar\nfoobar'})).out).toBe('foobax\nfoobax');
	});

	test('makes no difference for a single line', async () => {
		expect((await rr('^f|r$', 'x', {pipedData: 'foobar', voidMultiline: true})).out).toBe(
			'xoobax'
		);
	});

	test('does not see a final newline as the end of the content', async () => {
		expect((await rr('r$', 'x', {pipedData: 'foobar\n'})).out).toBe('foobax\n');
		expect((await rr('r$', 'x', {pipedData: 'foobar\n', voidMultiline: true})).out).toBe(
			'foobar\n'
		);
	});

	test('makes it easy to add a first and a last line', async () => {
		const config = {pipedData: 'a\nb', voidMultiline: true};
		expect((await rr('^', 'first\n', config)).out).toBe('first\na\nb');
		expect((await rr('$', '\nlast', config)).out).toBe('a\nb\nlast');
	});

	describe('combined', () => {
		test('with --dot-all', async () => {
			const config = {pipedData: 'a\nb\nc', voidMultiline: true, dotAll: true};
			expect((await rr('^a.*c$', '_', config)).out).toBe('_');
			expect((await rr('^a.*c$', '_', {pipedData: 'a\nb\nc', voidMultiline: true})).out).toBe(
				'a\nb\nc'
			);
		});

		test('with --void-global', async () => {
			const config = {pipedData: 'a\na', voidMultiline: true, voidGlobal: true};
			expect((await rr('^a|a$', '_', config)).out).toBe('_\na');
		});

		test('with --output-match', async () => {
			const config = {pipedData: 'ab\ncd\nef', voidMultiline: true, outputMatch: true};
			expect((await rr('^.|.$', '_', config)).out).toBe('a\nf\n');
		});

		test('with --replacement-js', async () => {
			const config = {pipedData: 'ab\ncd', voidMultiline: true, replacementJs: true};
			expect((await rr('^(.)', '$1.toUpperCase()', config)).out).toBe('Ab\ncd');
		});

		test('with --literal the anchors are plain chars anyway', async () => {
			const config = {pipedData: '^a\n^a', voidMultiline: true, literal: true};
			expect((await rr('^a', '_', config)).out).toBe('_\n_');
		});
	});
});
