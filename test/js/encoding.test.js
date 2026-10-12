import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr, until} from './helper.js';

// "fæo" as latin1 (not valid utf8)
const latin1 = () => Buffer.from([0x66, 0xe6, 0x6f]);

describe('--encoding', () => {
	test('is utf8 by default', () => {
		fs.writeFileSync('my.file', 'blåbær 🦖 中文');
		rr('å', 'aa', {includeGlob: ['my.file']});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('blaabær 🦖 中文');
	});

	test('reads and writes the file with the given encoding', () => {
		fs.writeFileSync('my.file', latin1());
		rr('æ', 'ø', {includeGlob: ['my.file'], encoding: 'latin1'});
		expect(fs.readFileSync('my.file')).toEqual(Buffer.from([0x66, 0xf8, 0x6f]));
	});

	test('is needed to find chars in a file that is not utf8', () => {
		fs.writeFileSync('my.file', latin1());
		expect(rr('æ', 'ø', {includeGlob: ['my.file']}).err).toBe('');
		expect(fs.readFileSync('my.file')).toEqual(latin1());
	});

	test('handles utf16le', () => {
		fs.writeFileSync('my.file', Buffer.from('blåbær 🦖', 'utf16le'));
		rr('å', 'aa', {includeGlob: ['my.file'], encoding: 'utf16le'});
		expect(fs.readFileSync('my.file', 'utf16le')).toBe('blaabær 🦖');
	});

	test('handles ascii', () => {
		fs.writeFileSync('my.file', 'foobar');
		rr('o', 'x', {includeGlob: ['my.file'], encoding: 'ascii'});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
	});

	test('keeps every possible byte intact with latin1', () => {
		const bytes = Buffer.from(Array.from({length: 256}, (_, i) => i));
		fs.writeFileSync('my.file', Buffer.concat([bytes, Buffer.from('foo'), bytes]));
		rr('foo', 'bar', {includeGlob: ['my.file'], encoding: 'latin1', voidIgnoreCase: true});
		expect(fs.readFileSync('my.file')).toEqual(
			Buffer.concat([bytes, Buffer.from('bar'), bytes])
		);
	});

	test.todo('BUG #690: an unknown encoding gives an error message instead of crashing', () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = rr('o', 'x', {includeGlob: ['my.file'], encoding: 'nope'});
		expect(result.exit).toBe(1);
		expect(result.err).toContain('nope');
	});

	describe('combined', () => {
		test.each([
			['the default async flow', {voidAsync: false}],
			['--void-async', {voidAsync: true}],
			['--void-backup', {voidBackup: true}],
			['--keep-backup', {keepBackup: true}],
		])('is used when writing with %s', async (name, config) => {
			fs.writeFileSync('my.file', latin1());
			rr('f', 'ø', {includeGlob: ['my.file'], encoding: 'latin1', quiet: true, ...config});
			await until(() => fs.readFileSync('my.file').equals(Buffer.from([0xf8, 0xe6, 0x6f])));
		});

		test('with --keep-backup the backup has the original bytes', () => {
			fs.writeFileSync('my.file', latin1());
			rr('æ', 'ø', {includeGlob: ['my.file'], encoding: 'latin1', keepBackup: true});
			const backup = fs.readdirSync('.').find((name) => name.endsWith('.backup'));
			expect(fs.readFileSync(backup)).toEqual(latin1());
		});

		test('with --output the result is sent as text', () => {
			fs.writeFileSync('my.file', latin1());
			const config = {includeGlob: ['my.file'], encoding: 'latin1', output: true};
			expect(rr('o', 'x', config).out).toBe('fæx');
			expect(fs.readFileSync('my.file')).toEqual(latin1());
		});

		test('with --output-match', () => {
			fs.writeFileSync('my.file', latin1());
			const config = {includeGlob: ['my.file'], encoding: 'latin1', outputMatch: true};
			expect(rr('æ.', '_', config).out).toBe('æo\n');
		});

		test('with --literal and --unicode', () => {
			fs.writeFileSync('my.file', Buffer.from('a.b 🦖', 'utf16le'));
			const config = {
				includeGlob: ['my.file'],
				encoding: 'utf16le',
				literal: true,
				unicode: true,
			};
			rr('a.b', '🦕', config);
			expect(fs.readFileSync('my.file', 'utf16le')).toBe('🦕 🦖');
		});

		test('with --replacement-js the text is decoded', () => {
			fs.writeFileSync('my.file', latin1());
			const config = {
				includeGlob: ['my.file'],
				encoding: 'latin1',
				replacementJs: true,
				output: true,
			};
			expect(rr('æ', 'text.length + text', config).out).toBe('f3fæoo');
		});

		test.todo(
			'BUG #688: with --replacement-js `bytes` is the size of the file in its encoding',
			() => {
				fs.writeFileSync('my.file', latin1());
				const config = {
					includeGlob: ['my.file'],
					encoding: 'latin1',
					replacementJs: true,
					output: true,
				};
				expect(rr('^', 'bytes + ":"', config).out).toBe('3:fæo');
			}
		);
	});
});
