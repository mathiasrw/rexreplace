import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('--engine', () => {
	test('default is rr', async () => {
		expect((await rr('o', 'x', {pipedData: 'foobar', engine: 'default'})).out).toBe('fxxbar');
	});

	test('runtime is the native engine', async () => {
		expect((await rr('o', 'x', {pipedData: 'foobar', engine: 'runtime'})).out).toBe('fxxbar');
	});

	test('stops with an error if the engine is unknown', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('o', 'x', {includeGlob: ['my.file'], engine: 'nope'});
		expect(result.exit).toBe(3);
		expect(result.err).toContain('Engine nope not supported');
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
	});

	test('is case sensitive', async () => {
		expect((await rr('o', 'x', {pipedData: 'foobar', engine: 'Runtime'})).exit).toBe(3);
	});

	describe('combined', () => {
		test('runtime with all the regex flags', async () => {
			const config = {
				pipedData: 'Foo\nfoo 🦖',
				engine: 'runtime',
				voidIgnoreCase: true,
				voidGlobal: true,
				voidMultiline: true,
				dotAll: true,
				unicode: true,
			};
			expect((await rr('f.*.$', 'x', config)).out).toBe('Foo\nx');
		});

		test('an unknown engine with --quiet-total says nothing but still stops', async () => {
			const result = await rr('o', 'x', {
				pipedData: 'foobar',
				engine: 'nope',
				quietTotal: true,
			});
			expect(result).toEqual({out: '', err: '', exit: 3});
		});
	});
});
