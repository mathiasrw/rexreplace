import {describe, test, expect} from 'bun:test';
import {rr} from './helper.js';

describe('--dot-all', () => {
	test('lets . match a newline', () => {
		expect(rr('ar.foo', '_', {pipedData: 'foobar\nfoobar', dotAll: true}).out).toBe('foob_bar');
	});

	test('is not the default', () => {
		expect(rr('ar.foo', '_', {pipedData: 'foobar\nfoobar'}).out).toBe('foobar\nfoobar');
	});

	test('lets . match every kind of line break', () => {
		['\n', '\r', ' ', ' '].forEach((lineBreak) => {
			const text = 'a' + lineBreak + 'b';
			expect(rr('a.b', '_', {pipedData: text}).out).toBe(text);
			expect(rr('a.b', '_', {pipedData: text, dotAll: true}).out).toBe('_');
		});
	});

	test('lets .* run across all lines', () => {
		expect(rr('b.*c', '_', {pipedData: 'ab\n\n\ncd', dotAll: true}).out).toBe('a_d');
	});

	test('does not change char classes', () => {
		expect(rr('[^x]', '_', {pipedData: 'a\nb'}).out).toBe('___');
		expect(rr('[^x]', '_', {pipedData: 'a\nb', dotAll: true}).out).toBe('___');
	});

	describe('combined', () => {
		test('with the default multiline ^ and $ still work on each line', () => {
			expect(rr('^.', '_', {pipedData: 'ab\ncd', dotAll: true}).out).toBe('_b\n_d');
		});

		test('with --void-multiline ^.*$ is the whole content', () => {
			const config = {pipedData: 'ab\ncd', dotAll: true, voidMultiline: true};
			expect(rr('^.*$', '_', config).out).toBe('_');
		});

		test('with --void-global', () => {
			const config = {pipedData: 'a\na\na', dotAll: true, voidGlobal: true};
			expect(rr('a.', '_', config).out).toBe('_a\na');
		});

		test('with --output-match a match can span lines', () => {
			const config = {pipedData: 'a\nb a\nc', dotAll: true, outputMatch: true};
			expect(rr('a.b', '_', config).out).toBe('a\nb\n');
		});

		test('with --literal the dot is just a dot', () => {
			const config = {pipedData: 'a\nb a.b', dotAll: true, literal: true};
			expect(rr('a.b', '_', config).out).toBe('a\nb _');
		});

		test('with --unicode . takes a full emoji or a newline', () => {
			const config = {pipedData: 'a🦖b\na\nb', dotAll: true, unicode: true};
			expect(rr('a.b', '_', config).out).toBe('_\n_');
		});
	});
});
