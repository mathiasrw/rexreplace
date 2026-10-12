import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

describe('--replacement-pipe', () => {
	test('uses the piped data as replacement', () => {
		fs.writeFileSync('my.file', 'foobar');
		rr('b', '_', {includeGlob: ['my.file'], replacementPipe: true, pipedData: 'x'});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fooxar');
	});

	test('ignores the replacement given as parameter', () => {
		fs.writeFileSync('my.file', 'foobar');
		const config = {
			includeGlob: ['my.file'],
			replacementPipe: true,
			pipedData: 'x',
			output: true,
		};
		expect(rr('b', 'ignored $& $1', config).out).toBe('fooxar');
	});

	test('is not the default', () => {
		fs.writeFileSync('my.file', 'foobar');
		const config = {includeGlob: ['my.file'], pipedData: 'x', output: true};
		expect(rr('b', '_', config).out).toBe('foo_ar');
	});

	test('uses the piped data exactly as it is', () => {
		fs.writeFileSync('my.file', 'foobar');
		const config = {includeGlob: ['my.file'], replacementPipe: true, output: true};
		expect(rr('b', '_', {...config, pipedData: ' x\n'}).out).toBe('foo x\nar');
		expect(rr('b', '_', {...config, pipedData: `'"\`\\n`}).out).toBe(`foo'"\`\\nar`);
		expect(rr('b', '_', {...config, pipedData: '€§'}).out).toBe('foo€§ar');
		expect(rr('b', '_', {...config, pipedData: 'line 1\nline 2\n'}).out).toBe(
			'fooline 1\nline 2\nar'
		);
	});

	test('lets the piped data refer to the match and its groups', () => {
		fs.writeFileSync('my.file', 'foobar');
		const config = {includeGlob: ['my.file'], replacementPipe: true, output: true};
		expect(rr('(o)(b)', '_', {...config, pipedData: '$2$1[$&]'}).out).toBe('fobo[ob]ar');
	});

	test('can be an empty string to remove what is matched', () => {
		fs.writeFileSync('my.file', 'foobar');
		const config = {
			includeGlob: ['my.file'],
			replacementPipe: true,
			pipedData: '',
			output: true,
		};
		expect(rr('o', '_', config).out).toBe('fbar');
	});

	test('stops with an error if nothing is piped in', () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = rr('o', '_', {includeGlob: ['my.file'], replacementPipe: true});
		expect(result.exit).toBe(1);
		expect(result.err).toContain('No data piped into replacement');
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
	});

	test('does not treat the piped data as content to search in', () => {
		const result = rr('o', '_', {replacementPipe: true, pipedData: 'foo'});
		expect(result).toEqual({out: '', err: '0 files found \n', exit: null});
	});

	describe('combined', () => {
		test('with --replacement-js the piped data is the code to run', () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {
				includeGlob: ['my.file'],
				replacementPipe: true,
				replacementJs: true,
				output: true,
			};
			expect(rr('(o+)', '_', {...config, pipedData: '$1.length + name'}).out).toBe('f2mybar');
		});

		test('with --literal', () => {
			fs.writeFileSync('my.file', 'a.b');
			const config = {
				includeGlob: ['my.file'],
				replacementPipe: true,
				pipedData: '[$&]',
				literal: true,
				output: true,
			};
			expect(rr('.', '_', config).out).toBe('a[.]b');
		});

		test('with --void-global and --void-ignore-case', () => {
			fs.writeFileSync('my.file', 'O o o');
			const config = {
				includeGlob: ['my.file'],
				replacementPipe: true,
				pipedData: 'x',
				voidGlobal: true,
				voidIgnoreCase: true,
			};
			rr('o', '_', config);
			expect(fs.readFileSync('my.file', 'utf8')).toBe('O x o');
		});

		test('with several files and --keep-backup', () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'boo');
			const config = {
				includeGlob: ['*.file'],
				replacementPipe: true,
				pipedData: '0',
				keepBackup: true,
			};
			rr('o', '_', config);
			expect(fs.readFileSync('a.file', 'utf8')).toBe('f00');
			expect(fs.readFileSync('b.file', 'utf8')).toBe('b00');
			expect(fs.readdirSync('.')).toHaveLength(4);
		});

		test('with --void-euro and --void-section there is no difference', () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {
				includeGlob: ['my.file'],
				replacementPipe: true,
				pipedData: '€1§n',
				output: true,
			};
			expect(rr('(b)', '_', config).out).toBe('foo€1§nar');
			expect(rr('(b)', '_', {...config, voidEuro: true, voidSection: true}).out).toBe(
				'foo€1§nar'
			);
		});
	});
});
