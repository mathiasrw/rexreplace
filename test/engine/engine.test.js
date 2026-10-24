import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('--engine', () => {
	test('default is rr', async () => {
		expect((await rr('o', 'x', {pipedData: 'foobar', engine: 'default'})).out).toBe('fxxbar');
	});

	// The tests are run by Bun, and Bun has JSC
	test('JSC does the job with Bun as the runtime', async () => {
		expect((await rr('o', 'x', {pipedData: 'foobar', engine: 'JSC'})).out).toBe('fxxbar');
	});

	test('stops with an error if the engine is the one of another runtime', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('o', 'x', {includeGlob: ['my.file'], engine: 'V8'});
		expect(result.exit).toBe(3);
		expect(result.err).toContain(
			'When running via the Bun runtime the native engine is JSC, not V8'
		);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
	});

	test('stops with an error if the engine is unknown', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('o', 'x', {includeGlob: ['my.file'], engine: 'nope'});
		expect(result.exit).toBe(3);
		expect(result.err).toContain('Engine nope not supported');
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
	});

	test('is case sensitive', async () => {
		expect((await rr('o', 'x', {pipedData: 'foobar', engine: 'jsc'})).exit).toBe(3);
	});

	describe('combined', () => {
		test('JSC with all the regex flags', async () => {
			const config = {
				pipedData: 'Foo\nfoo 🦖',
				engine: 'JSC',
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
