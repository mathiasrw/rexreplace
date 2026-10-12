import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

describe('--void-euro', () => {
	test('per default € is an alias for $ in the pattern', () => {
		expect(rr('.€', 'x', {pipedData: 'foobar'}).out).toBe('foobax');
	});

	test('per default € is an alias for $ in the replacement', () => {
		expect(rr('(f?(o))o(.*)', '€3€1€2', {pipedData: 'foobar'}).out).toBe('barfoo');
		expect(rr('r', '€', {pipedData: 'foobar'}).out).toBe('fooba$');
		expect(rr('b', '[€&]', {pipedData: 'foobar'}).out).toBe('foo[b]ar');
	});

	test('makes € a plain char in the pattern', () => {
		expect(rr('.€', 'x', {pipedData: 'foobar', voidEuro: true}).out).toBe('foobar');
		expect(rr('.€', 'x', {pipedData: 'price: 5€', voidEuro: true}).out).toBe('price: x');
	});

	test('makes € a plain char in the replacement', () => {
		expect(rr('(o)', '€1', {pipedData: 'fo', voidEuro: true}).out).toBe('f€1');
		expect(rr('USD', '€', {pipedData: '5 USD', voidEuro: true}).out).toBe('5 €');
	});

	test('leaves $ working as usual', () => {
		expect(rr('(.)$', '$1!', {pipedData: 'foobar', voidEuro: true}).out).toBe('foobar!');
	});

	test('never touches a € in the content', () => {
		expect(rr('o', 'x', {pipedData: 'foo 5€'}).out).toBe('fxx 5€');
		expect(rr('o', 'x', {pipedData: 'foo 5€', voidEuro: true}).out).toBe('fxx 5€');
	});

	test('is needed to find a € in the content', () => {
		expect(rr('€', 'EUR', {pipedData: '5€'}).out).toBe('5€EUR');
		expect(rr('€', 'EUR', {pipedData: '5€', voidEuro: true}).out).toBe('5EUR');
	});

	describe('combined', () => {
		test('with --void-section', () => {
			const config = {pipedData: '5€ §1', voidEuro: true, voidSection: true};
			expect(rr('€ §', '§€', config).out).toBe('5§€1');
		});

		test('with --literal', () => {
			expect(rr('5€', 'x', {pipedData: '5€ 5$', literal: true}).out).toBe('5€ x');
			expect(rr('5€', 'x', {pipedData: '5€ 5$', literal: true, voidEuro: true}).out).toBe(
				'x 5$'
			);
		});

		test('with --replacement-js the € is how to get to the groups', () => {
			expect(rr('(o)', '€1.toUpperCase()', {pipedData: 'fo', replacementJs: true}).out).toBe(
				'fO'
			);
			expect(() =>
				rr('(o)', '€1.toUpperCase()', {
					pipedData: 'fo',
					replacementJs: true,
					voidEuro: true,
				})
			).toThrow(SyntaxError);
		});

		test('with --replacement-pipe the piped replacement is never converted', () => {
			fs.writeFileSync('my.file', 'foo');
			const config = {includeGlob: ['my.file'], output: true, replacementPipe: true};
			expect(rr('(o)', '_', {...config, pipedData: '€1'}).out).toBe('f€1€1');
			expect(rr('(o)', '_', {...config, pipedData: '€1', voidEuro: true}).out).toBe('f€1€1');
		});

		test('with --exclude-re', () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('a.files', 'foo');
			rr('o', 'x', {includeGlob: ['a.*'], excludeRe: ['file€']});
			expect(fs.readFileSync('a.file', 'utf8')).toBe('foo');
			expect(fs.readFileSync('a.files', 'utf8')).toBe('fxx');
		});
	});
});
