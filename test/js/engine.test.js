import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

describe('--engine', () => {
	test('V8 does the job', () => {
		expect(rr('o', 'x', {pipedData: 'foobar', engine: 'V8'}).out).toBe('fxxbar');
	});

	test('stops with an error if the engine is unknown', () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = rr('o', 'x', {includeGlob: ['my.file'], engine: 'nope'});
		expect(result.exit).toBe(1);
		expect(result.err).toContain('Engine nope not supported');
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
	});

	test('is case sensitive', () => {
		expect(rr('o', 'x', {pipedData: 'foobar', engine: 'v8'}).exit).toBe(1);
	});

	describe('combined', () => {
		test('V8 with all the regex flags', () => {
			const config = {
				pipedData: 'Foo\nfoo 🦖',
				engine: 'V8',
				voidIgnoreCase: true,
				voidGlobal: true,
				voidMultiline: true,
				dotAll: true,
				unicode: true,
			};
			expect(rr('f.*.$', 'x', config).out).toBe('Foo\nx');
		});

		test('an unknown engine with --quiet-total says nothing but still stops', () => {
			const result = rr('o', 'x', {pipedData: 'foobar', engine: 'nope', quietTotal: true});
			expect(result).toEqual({out: '', err: '', exit: 1});
		});
	});
});
