import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

describe('--output-match', () => {
	test('prints each match on its own line', () => {
		expect(rr('[fb].', '_', {pipedData: 'foobar', outputMatch: true}).out).toBe('fo\nba\n');
	});

	test('prints only the groups (with nothing in between) if the pattern has groups', () => {
		expect(rr('([fb](.))', '_', {pipedData: 'foobar', outputMatch: true}).out).toBe(
			'foo\nbaa\n'
		);
		expect(rr('(f)o(o)', '_', {pipedData: 'foobar', outputMatch: true}).out).toBe('fo\n');
	});

	test('prints nothing if there is no match', () => {
		expect(rr('z', '_', {pipedData: 'foobar', outputMatch: true})).toEqual({
			out: '',
			err: '',
			exit: null,
		});
	});

	test('ignores the replacement', () => {
		expect(rr('o', 'anything $1 $&', {pipedData: 'foo', outputMatch: true}).out).toBe('o\no\n');
	});

	test('does not change the file', () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = rr('[fb].', '_', {includeGlob: ['my.file'], outputMatch: true});
		expect(result).toEqual({out: 'fo\nba\n', err: '', exit: null});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
		expect(fs.readdirSync('.')).toEqual(['my.file']);
	});

	test('prints matches from several files in alphabetical order', () => {
		fs.writeFileSync('b.file', 'boo');
		fs.writeFileSync('a.file', 'foo');
		expect(rr('.o', '_', {includeGlob: ['b.file', 'a.file'], outputMatch: true}).out).toBe(
			'fo\nbo\n'
		);
	});

	test('prints a match that spans lines as it is', () => {
		expect(rr('a\\nb', '_', {pipedData: 'a\nb', outputMatch: true}).out).toBe('a\nb\n');
	});

	test('prints an empty line for an empty match', () => {
		expect(rr('^', '_', {pipedData: 'a\nb', outputMatch: true}).out).toBe('\n\n');
	});

	test.todo('BUG #684: a group that did not take part in the match prints nothing', () => {
		expect(rr('(f)|(b)', '_', {pipedData: 'foobar', outputMatch: true}).out).toBe('f\nb\n');
	});

	test.todo('BUG #685: named groups are printed like any other group', () => {
		expect(
			rr('(?<first>f)(?<second>o)', '_', {pipedData: 'foobar', outputMatch: true}).out
		).toBe('fo\n');
	});

	describe('combined', () => {
		test('with --void-global only the first match is printed', () => {
			const config = {pipedData: 'foobar', outputMatch: true, voidGlobal: true};
			expect(rr('[fb].', '_', config).out).toBe('fo\n');
		});

		test('with --void-ignore-case', () => {
			const config = {pipedData: 'Foo foo', outputMatch: true, voidIgnoreCase: true};
			expect(rr('f.', '_', config).out).toBe('fo\n');
		});

		test('with --dot-all and --void-multiline', () => {
			const config = {
				pipedData: 'ab\ncd',
				outputMatch: true,
				dotAll: true,
				voidMultiline: true,
			};
			expect(rr('^(.)(.*)(.)$', '_', config).out).toBe('ab\ncd\n');
		});

		test('with --literal', () => {
			expect(rr('a.', '_', {pipedData: 'ab a.', outputMatch: true, literal: true}).out).toBe(
				'a.\n'
			);
		});

		test('with --replacement-js the code is not run', () => {
			const config = {pipedData: 'foobar', outputMatch: true, replacementJs: true};
			expect(rr('[fb].', 'throw new Error("should not run")', config).out).toBe('fo\nba\n');
		});

		test('with --replacement-pipe the piped replacement is not used', () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {
				includeGlob: ['my.file'],
				outputMatch: true,
				replacementPipe: true,
				pipedData: 'x',
			};
			expect(rr('[fb].', '_', config).out).toBe('fo\nba\n');
			expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
		});

		test('with --quiet-total the matches are still printed', () => {
			const config = {pipedData: 'foobar', outputMatch: true, quietTotal: true};
			expect(rr('[fb].', '_', config).out).toBe('fo\nba\n');
		});

		test('with --keep-backup there is nothing to back up', () => {
			fs.writeFileSync('my.file', 'foobar');
			rr('o', '_', {includeGlob: ['my.file'], outputMatch: true, keepBackup: true});
			expect(fs.readdirSync('.')).toEqual(['my.file']);
		});

		test('with --exclude-re', () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'boo');
			const config = {includeGlob: ['*.file'], excludeRe: ['^a'], outputMatch: true};
			expect(rr('.o', '_', config).out).toBe('bo\n');
		});
	});
});
