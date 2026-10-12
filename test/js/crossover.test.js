// Flags combined with each other
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

describe('regex flags', () => {
	const flags = ['voidIgnoreCase', 'voidGlobal', 'voidMultiline', 'dotAll', 'unicode'];
	const text = 'Foo\nfoo 🦖\r\nFOO bar\n';
	const patterns = ['foo', '^.', '.$', 'o.f', '^f.*o$', '\\S+$', 'O\\s', '.'];

	// All 32 ways to combine the flags
	const combinations = Array.from({length: 2 ** flags.length}, (_, bits) =>
		flags.filter((flag, n) => bits & (1 << n))
	);

	test.each(combinations.map((on) => [on.join(' + ') || 'none', on]))(
		'%s gives the same as String.replace',
		async (name, on) => {
			const config = Object.fromEntries(on.map((flag) => [flag, true]));
			const jsFlags =
				(config.voidGlobal ? '' : 'g') +
				(config.voidIgnoreCase ? '' : 'i') +
				(config.voidMultiline ? '' : 'm') +
				(config.dotAll ? 's' : '') +
				(config.unicode ? 'u' : '');

			for (const pattern of patterns) {
				expect((await rr(pattern, '<$&>', {pipedData: text, ...config})).out, pattern).toBe(
					text.replace(new RegExp(pattern, jsFlags), '<$&>')
				);
			}
		}
	);
});

describe('every pair of flags', () => {
	const flags = [
		'verbose',
		'literal',
		'voidIgnoreCase',
		'voidGlobal',
		'dotAll',
		'voidMultiline',
		'unicode',
		'quiet',
		'quietTotal',
		'halt',
		'debug',
		'voidEuro',
		'voidSection',
		'output',
		'voidAsync',
		'voidBackup',
		'keepBackup',
		'outputMatch',
		'replacementPipe',
		'replacementJs',
	];

	const pairs = flags.flatMap((first, n) => flags.slice(n).map((second) => [first, second]));

	// Replace "o" with "1" in a file containing "foo". The 1 works as plain text, as javascript and when piped in.
	test.each(pairs)('%s + %s', async (first, second) => {
		const config = {[first]: true, [second]: true};

		fs.writeFileSync('my.file', 'foo');
		const result = await rr('o', '1', {includeGlob: ['my.file'], pipedData: '1', ...config});

		const replaced = config.voidGlobal ? 'f1o' : 'f11';
		const written = !config.output && !config.outputMatch;

		expect(result.exit).toBe(null);
		expect(result.out).toBe(
			config.outputMatch
				? config.voidGlobal
					? 'o\n'
					: 'o\no\n'
				: config.output
					? replaced
					: ''
		);

		expect(fs.readFileSync('my.file', 'utf8')).toBe(written ? replaced : 'foo');
		expect(fs.readdirSync('.')).toHaveLength(
			written && config.keepBackup && !config.voidBackup ? 2 : 1
		);
	});
});

describe('same result no matter how it is delivered', () => {
	const text = 'A.b a.b axb\n';
	const search = {literal: true, voidIgnoreCase: true, voidGlobal: true};
	const expected = 'A.b [a.b] axb\n';

	test('piped data', async () => {
		expect((await rr('a.b', '[$&]', {pipedData: text, ...search})).out).toBe(expected);
	});

	test('--output', async () => {
		fs.writeFileSync('my.file', text);
		expect(
			(await rr('a.b', '[$&]', {includeGlob: ['my.file'], output: true, ...search})).out
		).toBe(expected);
	});

	test.each([
		['the async flow', {voidAsync: false}, 1],
		['--void-async', {voidAsync: true}, 1],
		['--void-backup', {voidBackup: true}, 1],
		['--keep-backup', {keepBackup: true}, 2],
		['--keep-backup in the async flow', {keepBackup: true, voidAsync: false}, 2],
		['--void-async, --void-backup and --keep-backup', {voidBackup: true, keepBackup: true}, 1],
	])('a file written with %s', async (name, config, files) => {
		fs.writeFileSync('my.file', text);
		await rr('a.b', '[$&]', {includeGlob: ['my.file'], ...search, ...config});
		expect(fs.readFileSync('my.file', 'utf8')).toBe(expected);
		expect(fs.readdirSync('.')).toHaveLength(files);
	});

	test('--replacement-pipe and --replacement-js', async () => {
		fs.writeFileSync('my.file', text);
		const config = {includeGlob: ['my.file'], output: true, ...search};
		expect(
			(await rr('a.b', '_', {...config, replacementPipe: true, pipedData: '[$&]'})).out
		).toBe(expected);
		expect((await rr('a.b', '"[" + $0 + "]"', {...config, replacementJs: true})).out).toBe(
			expected
		);
		expect(
			(
				await rr('a.b', '_', {
					...config,
					replacementJs: true,
					replacementPipe: true,
					pipedData: '"[" + $0 + "]"',
				})
			).out
		).toBe(expected);
	});
});

describe('many flags at once', () => {
	test('pinpoint files, run javascript on each match and keep a backup', async () => {
		fs.mkdirSync('src/deep', {recursive: true});
		fs.mkdirSync('dist');
		fs.writeFileSync('src/a.js', 'VERSION version');
		fs.writeFileSync('src/a.test.js', 'VERSION');
		fs.writeFileSync('src/deep/b.js', 'VERSION');
		fs.writeFileSync('src/deep/c.md', 'VERSION');
		fs.writeFileSync('dist/a.js', 'VERSION');
		fs.writeFileSync('package.json', '{"version": "1.2.3"}');

		const result = await rr('(VERSION)', 'r("package.json").version + "@" + name', {
			includeGlob: ['**/*.js', '!dist/**'],
			excludeRe: ['§.test§.js€'],
			excludeGlob: ['**/*.md'],
			replacementJs: true,
			voidIgnoreCase: true,
			keepBackup: true,
			verbose: true,
		});

		expect(result.err).toContain('2 files found');
		expect(fs.readFileSync('src/a.js', 'utf8')).toBe('1.2.3@a version');
		expect(fs.readFileSync('src/deep/b.js', 'utf8')).toBe('1.2.3@b');
		expect(fs.readFileSync('src/a.test.js', 'utf8')).toBe('VERSION');
		expect(fs.readFileSync('src/deep/c.md', 'utf8')).toBe('VERSION');
		expect(fs.readFileSync('dist/a.js', 'utf8')).toBe('VERSION');
		expect(fs.readdirSync('src').filter((name) => name.endsWith('.backup'))).toHaveLength(1);
		expect(fs.readdirSync('src/deep').filter((name) => name.endsWith('.backup'))).toHaveLength(
			1
		);
	});

	test('list the first match of each line across files', async () => {
		fs.writeFileSync('a.log', 'ERROR: disk\nINFO: ok\nerror: lowercase\n');
		fs.writeFileSync('b.log', 'ERROR: net\n');
		fs.writeFileSync('c.txt', 'ERROR: not a log\n');

		const result = await rr('^ERROR: (.*)$', '_', {
			includeGlob: ['*'],
			excludeGlob: ['*.txt'],
			outputMatch: true,
			voidIgnoreCase: true,
			quiet: true,
		});

		expect(result).toEqual({out: 'disk\nnet\n', err: '', exit: null});
	});

	test('all the search flags on a latin1 file with the replacement piped in', async () => {
		fs.writeFileSync('my.file', Buffer.from('Æ.æ\næ.æ æ.æ', 'latin1'));

		await rr('æ.æ€', '_', {
			includeGlob: ['my.file'],
			encoding: 'latin1',
			replacementPipe: true,
			pipedData: '[$&]',
			literal: true,
			voidEuro: true,
			voidIgnoreCase: true,
			voidGlobal: true,
			voidMultiline: true,
			dotAll: true,
			unicode: true,
			voidSection: true,
			quietTotal: true,
			halt: true,
		});

		expect(fs.readFileSync('my.file', 'latin1')).toBe('Æ.æ\næ.æ æ.æ');

		await rr('æ.æ', '_', {
			includeGlob: ['my.file'],
			encoding: 'latin1',
			replacementPipe: true,
			pipedData: '[$&]',
			literal: true,
			voidIgnoreCase: true,
			voidGlobal: true,
		});

		expect(fs.readFileSync('my.file', 'latin1')).toBe('Æ.æ\n[æ.æ] æ.æ');
	});

	test('silence everything but the result', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('o', 'x', {
			includeGlob: ['my.file', 'nope.file'],
			output: true,
			quiet: true,
			quietTotal: true,
			verbose: true,
			halt: true,
		});
		expect(result).toEqual({out: 'fxxbar', err: '', exit: null});
	});
});
