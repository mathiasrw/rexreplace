import {describe, test, expect} from 'bun:test';
import {rr} from './helper.js';

describe('--dot-all', () => {
	test('lets . match a newline', async () => {
		expect((await rr('ar.foo', '_', {pipedData: 'foobar\nfoobar', dotAll: true})).out).toBe(
			'foob_bar'
		);
	});

	test('is not the default', async () => {
		expect((await rr('ar.foo', '_', {pipedData: 'foobar\nfoobar'})).out).toBe('foobar\nfoobar');
	});

	test('lets . match every kind of line break', async () => {
		for (const lineBreak of ['\n', '\r', ' ', ' ']) {
			const text = 'a' + lineBreak + 'b';
			expect((await rr('a.b', '_', {pipedData: text})).out).toBe(text);
			expect((await rr('a.b', '_', {pipedData: text, dotAll: true})).out).toBe('_');
		}
	});

	test('lets .* run across all lines', async () => {
		expect((await rr('b.*c', '_', {pipedData: 'ab\n\n\ncd', dotAll: true})).out).toBe('a_d');
	});

	test('does not change char classes', async () => {
		expect((await rr('[^x]', '_', {pipedData: 'a\nb'})).out).toBe('___');
		expect((await rr('[^x]', '_', {pipedData: 'a\nb', dotAll: true})).out).toBe('___');
	});

	describe('combined', () => {
		test('with the default multiline ^ and $ still work on each line', async () => {
			expect((await rr('^.', '_', {pipedData: 'ab\ncd', dotAll: true})).out).toBe('_b\n_d');
		});

		test('with --void-multiline ^.*$ is the whole content', async () => {
			const config = {pipedData: 'ab\ncd', dotAll: true, voidMultiline: true};
			expect((await rr('^.*$', '_', config)).out).toBe('_');
		});

		test('with --void-global', async () => {
			const config = {pipedData: 'a\na\na', dotAll: true, voidGlobal: true};
			expect((await rr('a.', '_', config)).out).toBe('_a\na');
		});

		test('with --output-match a match can span lines', async () => {
			const config = {pipedData: 'a\nb a\nc', dotAll: true, outputMatch: true};
			expect((await rr('a.b', '_', config)).out).toBe('a\nb\n');
		});

		test('with --literal the dot is just a dot', async () => {
			const config = {pipedData: 'a\nb a.b', dotAll: true, literal: true};
			expect((await rr('a.b', '_', config)).out).toBe('a\nb _');
		});

		test('with --unicode . takes a full emoji or a newline', async () => {
			const config = {pipedData: 'a🦖b\na\nb', dotAll: true, unicode: true};
			expect((await rr('a.b', '_', config)).out).toBe('_\n_');
		});
	});
});
