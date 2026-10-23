import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('--output-match', () => {
	test('prints each match on its own line', async () => {
		expect((await rr('[fb].', '_', {pipedData: 'foobar', outputMatch: true})).out).toBe('fo\nba\n');
	});

	test('prints only the groups (with nothing in between) if the pattern has groups', async () => {
		expect((await rr('([fb](.))', '_', {pipedData: 'foobar', outputMatch: true})).out).toBe(
			'foo\nbaa\n'
		);
		expect((await rr('(f)o(o)', '_', {pipedData: 'foobar', outputMatch: true})).out).toBe('fo\n');
	});

	test('prints nothing if there is no match', async () => {
		expect(await rr('z', '_', {pipedData: 'foobar', outputMatch: true})).toEqual({
			out: '',
			err: '',
			exit: null,
		});
	});

	test('ignores the replacement', async () => {
		expect((await rr('o', 'anything $1 $&', {pipedData: 'foo', outputMatch: true})).out).toBe(
			'o\no\n'
		);
	});

	test('does not change the file', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('[fb].', '_', {includeGlob: ['my.file'], outputMatch: true});
		expect(result).toEqual({out: 'fo\nba\n', err: 'my.file\n', exit: null});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
		expect(fs.readdirSync('.')).toEqual(['my.file']);
	});

	test('prints matches from several files in alphabetical order', async () => {
		fs.writeFileSync('b.file', 'boo');
		fs.writeFileSync('a.file', 'foo');
		expect((await rr('.o', '_', {includeGlob: ['b.file', 'a.file'], outputMatch: true})).out).toBe(
			'fo\nbo\n'
		);
	});

	test('prints a match that spans lines as it is', async () => {
		expect((await rr('a\\nb', '_', {pipedData: 'a\nb', outputMatch: true})).out).toBe('a\nb\n');
	});

	test('prints an empty line for an empty match', async () => {
		expect((await rr('^', '_', {pipedData: 'a\nb', outputMatch: true})).out).toBe('\n\n');
	});

	test('prints nothing for a group that did not take part in the match (#684)', async () => {
		expect((await rr('(f)|(b)', '_', {pipedData: 'foobar', outputMatch: true})).out).toBe('f\nb\n');
	});

	test('prints named groups like any other group (#685)', async () => {
		expect(
			(await rr('(?<first>f)(?<second>o)', '_', {pipedData: 'foobar', outputMatch: true})).out
		).toBe('fo\n');
	});

	describe('combined', () => {
		test('with --void-global only the first match is printed', async () => {
			const config = {pipedData: 'foobar', outputMatch: true, voidGlobal: true};
			expect((await rr('[fb].', '_', config)).out).toBe('fo\n');
		});

		test('with --void-ignore-case', async () => {
			const config = {pipedData: 'Foo foo', outputMatch: true, voidIgnoreCase: true};
			expect((await rr('f.', '_', config)).out).toBe('fo\n');
		});

		test('with --dot-all and --void-multiline', async () => {
			const config = {
				pipedData: 'ab\ncd',
				outputMatch: true,
				dotAll: true,
				voidMultiline: true,
			};
			expect((await rr('^(.)(.*)(.)$', '_', config)).out).toBe('ab\ncd\n');
		});

		test('with --literal', async () => {
			expect(
				(await rr('a.', '_', {pipedData: 'ab a.', outputMatch: true, literal: true})).out
			).toBe('a.\n');
		});

		test('with --js the code is not run, and a warning tells so', async () => {
			const config = {pipedData: 'foobar', outputMatch: true, replacementJs: true};
			expect(await rr('[fb].', 'throw new Error("should not run")', config)).toEqual({
				out: 'fo\nba\n',
				err: ' 🟡 The code is not run with --output-match, as only the matches are printed.\n\n',
				exit: null,
			});
			expect((await rr('[fb].', '_', {...config, quiet: true})).err).toBe('');
		});

		test('with --replacement-pipe the piped replacement is not used', async () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {
				includeGlob: ['my.file'],
				outputMatch: true,
				replacementPipe: true,
				pipedData: 'x',
			};
			expect((await rr('[fb].', '_', config)).out).toBe('fo\nba\n');
			expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
		});

		test('with --quiet-total the matches are still printed', async () => {
			const config = {pipedData: 'foobar', outputMatch: true, quietTotal: true};
			expect((await rr('[fb].', '_', config)).out).toBe('fo\nba\n');
		});

		test('with --keep-backup there is nothing to back up', async () => {
			fs.writeFileSync('my.file', 'foobar');
			await rr('o', '_', {includeGlob: ['my.file'], outputMatch: true, keepBackup: true});
			expect(fs.readdirSync('.')).toEqual(['my.file']);
		});

		test('with --exclude-re', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'boo');
			const config = {includeGlob: ['*.file'], excludeRe: ['^a'], outputMatch: true};
			expect((await rr('.o', '_', config)).out).toBe('bo\n');
		});
	});
});
