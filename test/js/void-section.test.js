import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

describe('--void-section', () => {
	test('per default § is an alias for \\ in the pattern', () => {
		expect(rr('§[', '.0.[', {pipedData: 'foo[bar]'}).out).toBe('foo.0.[bar]');
		expect(rr('§d+', '#', {pipedData: 'a1b22'}).out).toBe('a#b#');
		expect(rr('[§]]', '[', {pipedData: 'foo[bar]'}).out).toBe('foo[bar[');
	});

	test('per default §§ finds a backslash', () => {
		expect(rr('§§', '/', {pipedData: 'a\\b'}).out).toBe('a/b');
	});

	test('per default § is an alias for \\ in the replacement', () => {
		expect(rr('/', '§', {pipedData: 'a/b'}).out).toBe('a\\b');
	});

	test('makes § a plain char in the pattern', () => {
		expect(rr('§d', '#', {pipedData: 'a1 §d', voidSection: true}).out).toBe('a1 #');
		expect(rr('[§]]', '[', {pipedData: 'foo[bar]', voidSection: true}).out).toBe('foo[bar]');
	});

	test('makes § a plain char in the replacement', () => {
		expect(rr('/', '§', {pipedData: 'a/b', voidSection: true}).out).toBe('a§b');
	});

	test('leaves \\ working as usual', () => {
		expect(rr('\\d', '#', {pipedData: 'a1', voidSection: true}).out).toBe('a#');
	});

	test('never touches a § in the content', () => {
		expect(rr('o', 'x', {pipedData: 'foo §1'}).out).toBe('fxx §1');
		expect(rr('o', 'x', {pipedData: 'foo §1', voidSection: true}).out).toBe('fxx §1');
	});

	test('is needed to find a § in the content', () => {
		expect(rr('§.', 'x', {pipedData: 'a§.b'}).out).toBe('a§xb');
		expect(rr('§.', 'x', {pipedData: 'a§.b', voidSection: true}).out).toBe('axb');
	});

	test('a lone § at the end of the pattern is an unfinished escape', () => {
		const result = rr('a§', 'x', {pipedData: 'a§'});
		expect(result.exit).toBe(1);
		expect(result.err).toContain('Invalid regular expression');
		expect(rr('a§', 'x', {pipedData: 'a§', voidSection: true}).out).toBe('x');
	});

	describe('combined', () => {
		test('with --void-euro', () => {
			expect(rr('§€', 'x', {pipedData: '5$ §€'}).out).toBe('5x §€');
			expect(rr('§€', 'x', {pipedData: '5$ §€', voidSection: true, voidEuro: true}).out).toBe(
				'5$ x'
			);
		});

		test('with --literal', () => {
			expect(rr('a§b', 'x', {pipedData: 'a§b a\\b', literal: true}).out).toBe('a§b x');
			expect(
				rr('a§b', 'x', {pipedData: 'a§b a\\b', literal: true, voidSection: true}).out
			).toBe('x a\\b');
		});

		test('with --replacement-js', () => {
			const config = {pipedData: 'a1', replacementJs: true};
			expect(rr('§d', '"§n".length', config).out).toBe('a1');
			expect(rr('§d', '"§n".length', {...config, voidSection: true}).out).toBe('a1');
			expect(rr('\\d', '"§n".length', {...config, voidSection: true}).out).toBe('a2');
		});

		test('with --exclude-re', () => {
			fs.writeFileSync('a1.file', 'foo');
			fs.writeFileSync('ab.file', 'foo');
			rr('o', 'x', {includeGlob: ['*.file'], excludeRe: ['a§d']});
			expect(fs.readFileSync('a1.file', 'utf8')).toBe('foo');
			expect(fs.readFileSync('ab.file', 'utf8')).toBe('fxx');
		});
	});
});
