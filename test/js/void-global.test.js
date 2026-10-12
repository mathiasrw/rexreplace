import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

describe('--void-global', () => {
	test('stops after the first match', () => {
		expect(rr('o', 'x', {pipedData: 'foobar foobar', voidGlobal: true}).out).toBe(
			'fxobar foobar'
		);
	});

	test('is not the default', () => {
		expect(rr('o', 'x', {pipedData: 'foobar foobar'}).out).toBe('fxxbar fxxbar');
	});

	test('changes nothing if there is no match', () => {
		expect(rr('z', 'x', {pipedData: 'foobar', voidGlobal: true}).out).toBe('foobar');
	});

	test('takes the first match in each file', () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'boo');
		rr('o', 'x', {includeGlob: ['*.file'], voidGlobal: true});
		expect(fs.readFileSync('a.file', 'utf8')).toBe('fxo');
		expect(fs.readFileSync('b.file', 'utf8')).toBe('bxo');
	});

	describe('combined', () => {
		test('with --output-match only the first match is printed', () => {
			const config = {pipedData: 'foobar', outputMatch: true, voidGlobal: true};
			expect(rr('[fb].', '_', config).out).toBe('fo\n');
		});

		test('with the default multiline only the first line is touched', () => {
			expect(rr('^', '> ', {pipedData: 'a\nb\nc', voidGlobal: true}).out).toBe('> a\nb\nc');
			expect(rr('$', '!', {pipedData: 'a\nb\nc', voidGlobal: true}).out).toBe('a!\nb\nc');
		});

		test('with --void-multiline $ is the end of the content', () => {
			const config = {pipedData: 'a\nb\nc', voidGlobal: true, voidMultiline: true};
			expect(rr('$', '!', config).out).toBe('a\nb\nc!');
		});

		test('with --literal and --void-ignore-case', () => {
			const config = {
				pipedData: 'A+ a+ a+',
				voidGlobal: true,
				literal: true,
				voidIgnoreCase: true,
			};
			expect(rr('a+', 'x', config).out).toBe('A+ x a+');
		});

		test('with --replacement-js the code only runs for the first match', () => {
			const config = {pipedData: 'a a a', voidGlobal: true, replacementJs: true};
			expect(rr('a', '$0.toUpperCase()', config).out).toBe('A a a');
		});
	});
});
