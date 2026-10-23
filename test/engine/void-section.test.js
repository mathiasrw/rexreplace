import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('--void-section', () => {
	test('per default § is an alias for \\ in the pattern', async () => {
		expect((await rr('§[', '.0.[', {pipedData: 'foo[bar]'})).out).toBe('foo.0.[bar]');
		expect((await rr('§d+', '#', {pipedData: 'a1b22'})).out).toBe('a#b#');
		expect((await rr('[§]]', '[', {pipedData: 'foo[bar]'})).out).toBe('foo[bar[');
	});

	test('per default §§ finds a backslash', async () => {
		expect((await rr('§§', '/', {pipedData: 'a\\b'})).out).toBe('a/b');
	});

	test('per default § is an alias for \\ in the replacement', async () => {
		expect((await rr('/', '§', {pipedData: 'a/b'})).out).toBe('a\\b');
	});

	test('makes § a plain char in the pattern', async () => {
		expect((await rr('§d', '#', {pipedData: 'a1 §d', voidSection: true})).out).toBe('a1 #');
		expect((await rr('[§]]', '[', {pipedData: 'foo[bar]', voidSection: true})).out).toBe(
			'foo[bar]'
		);
	});

	test('makes § a plain char in the replacement', async () => {
		expect((await rr('/', '§', {pipedData: 'a/b', voidSection: true})).out).toBe('a§b');
	});

	test('leaves \\ working as usual', async () => {
		expect((await rr('\\d', '#', {pipedData: 'a1', voidSection: true})).out).toBe('a#');
	});

	test('never touches a § in the content', async () => {
		expect((await rr('o', 'x', {pipedData: 'foo §1'})).out).toBe('fxx §1');
		expect((await rr('o', 'x', {pipedData: 'foo §1', voidSection: true})).out).toBe('fxx §1');
	});

	test('is needed to find a § in the content', async () => {
		expect((await rr('§.', 'x', {pipedData: 'a§.b'})).out).toBe('a§xb');
		expect((await rr('§.', 'x', {pipedData: 'a§.b', voidSection: true})).out).toBe('axb');
	});

	test('a lone § at the end of the pattern is an unfinished escape', async () => {
		const result = await rr('a§', 'x', {pipedData: 'a§'});
		expect(result.exit).toBe(1);
		expect(result.err).toContain('Invalid regular expression');
		expect((await rr('a§', 'x', {pipedData: 'a§', voidSection: true})).out).toBe('x');
	});

	describe('combined', () => {
		test('with --void-euro', async () => {
			expect((await rr('§€', 'x', {pipedData: '5$ §€'})).out).toBe('5x §€');
			expect(
				(await rr('§€', 'x', {pipedData: '5$ §€', voidSection: true, voidEuro: true})).out
			).toBe('5$ x');
		});

		test('with --literal', async () => {
			expect((await rr('a§b', 'x', {pipedData: 'a§b a\\b', literal: true})).out).toBe('a§b x');
			expect(
				(await rr('a§b', 'x', {pipedData: 'a§b a\\b', literal: true, voidSection: true})).out
			).toBe('x a\\b');
		});

		test('with --replacement-js', async () => {
			const config = {pipedData: 'a1', replacementJs: true};
			expect((await rr('§d', '"§n".length', config)).out).toBe('a1');
			expect((await rr('§d', '"§n".length', {...config, voidSection: true})).out).toBe('a1');
			expect((await rr('\\d', '"§n".length', {...config, voidSection: true})).out).toBe('a2');
		});

		test('with --exclude-re', async () => {
			fs.writeFileSync('a1.file', 'foo');
			fs.writeFileSync('ab.file', 'foo');
			await rr('o', 'x', {includeGlob: ['*.file'], excludeRe: ['a§d']});
			expect(fs.readFileSync('a1.file', 'utf8')).toBe('foo');
			expect(fs.readFileSync('ab.file', 'utf8')).toBe('fxx');
		});
	});
});
