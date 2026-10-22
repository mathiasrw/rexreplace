import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

// "fæo" as latin1 (not valid utf8)
const latin1 = () => Buffer.from([0x66, 0xe6, 0x6f]);

describe('--encoding', () => {
	test('is utf8 by default', async () => {
		fs.writeFileSync('my.file', 'blåbær 🦖 中文');
		await rr('å', 'aa', {includeGlob: ['my.file']});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('blaabær 🦖 中文');
	});

	test('reads and writes the file with the given encoding', async () => {
		fs.writeFileSync('my.file', latin1());
		await rr('æ', 'ø', {includeGlob: ['my.file'], encoding: 'latin1'});
		expect(fs.readFileSync('my.file')).toEqual(Buffer.from([0x66, 0xf8, 0x6f]));
	});

	test('is needed to find chars in a file that is not utf8', async () => {
		fs.writeFileSync('my.file', latin1());
		expect((await rr('æ', 'ø', {includeGlob: ['my.file']})).err).toBe('');
		expect(fs.readFileSync('my.file')).toEqual(latin1());
	});

	test('handles utf16le', async () => {
		fs.writeFileSync('my.file', Buffer.from('blåbær 🦖', 'utf16le'));
		await rr('å', 'aa', {includeGlob: ['my.file'], encoding: 'utf16le'});
		expect(fs.readFileSync('my.file', 'utf16le')).toBe('blaabær 🦖');
	});

	test('handles ascii', async () => {
		fs.writeFileSync('my.file', 'foobar');
		await rr('o', 'x', {includeGlob: ['my.file'], encoding: 'ascii'});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
	});

	test('keeps every possible byte intact with latin1', async () => {
		const bytes = Buffer.from(Array.from({length: 256}, (_, i) => i));
		fs.writeFileSync('my.file', Buffer.concat([bytes, Buffer.from('foo'), bytes]));
		await rr('foo', 'bar', {
			includeGlob: ['my.file'],
			encoding: 'latin1',
			voidIgnoreCase: true,
		});
		expect(fs.readFileSync('my.file')).toEqual(Buffer.concat([bytes, Buffer.from('bar'), bytes]));
	});

	// The error message, and not the stack trace from deep inside node, when an encoding is unknown (#690)
	const unknownEncoding = {out: '', err: ' ❌ Unknown encoding: nope\n\n', exit: 1};

	test('stops the run with an error if it is unknown (#690)', async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect(await rr('o', 'x', {includeGlob: ['my.file'], encoding: 'nope'})).toEqual(
			unknownEncoding
		);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
	});

	test('stops the run with an error if it is unknown, also for piped data (#690)', async () => {
		expect(await rr('o', 'x', {pipedData: 'foo', encoding: 'nope'})).toEqual(unknownEncoding);
	});

	test('is known in any case', async () => {
		fs.writeFileSync('my.file', latin1());
		await rr('æ', 'ø', {includeGlob: ['my.file'], encoding: 'LATIN1'});
		expect(fs.readFileSync('my.file')).toEqual(Buffer.from([0x66, 0xf8, 0x6f]));
	});

	describe('combined', () => {
		test.each([
			['the default async flow', {voidAsync: false}],
			['--void-async', {voidAsync: true}],
			['--void-backup', {voidBackup: true}],
			['--keep-backup', {keepBackup: true}],
		])('is used when writing with %s', async (name, config) => {
			fs.writeFileSync('my.file', latin1());
			await rr('f', 'ø', {includeGlob: ['my.file'], encoding: 'latin1', ...config});
			expect(fs.readFileSync('my.file')).toEqual(Buffer.from([0xf8, 0xe6, 0x6f]));
		});

		test('with --keep-backup the backup has the original bytes', async () => {
			fs.writeFileSync('my.file', latin1());
			await rr('æ', 'ø', {includeGlob: ['my.file'], encoding: 'latin1', keepBackup: true});
			const backup = fs.readdirSync('.').find(name => name.endsWith('.backup'));
			expect(fs.readFileSync(backup)).toEqual(latin1());
		});

		test('with --output the result is sent as text', async () => {
			fs.writeFileSync('my.file', latin1());
			const config = {includeGlob: ['my.file'], encoding: 'latin1', output: true};
			expect((await rr('o', 'x', config)).out).toBe('fæx\n');
			expect(fs.readFileSync('my.file')).toEqual(latin1());
		});

		test('with --output-match', async () => {
			fs.writeFileSync('my.file', latin1());
			const config = {includeGlob: ['my.file'], encoding: 'latin1', outputMatch: true};
			expect((await rr('æ.', '_', config)).out).toBe('æo\n');
		});

		test('with --literal and --unicode', async () => {
			fs.writeFileSync('my.file', Buffer.from('a.b 🦖', 'utf16le'));
			const config = {
				includeGlob: ['my.file'],
				encoding: 'utf16le',
				literal: true,
				unicode: true,
			};
			await rr('a.b', '🦕', config);
			expect(fs.readFileSync('my.file', 'utf16le')).toBe('🦕 🦖');
		});

		test('with --replacement-js the text is decoded', async () => {
			fs.writeFileSync('my.file', latin1());
			const config = {
				includeGlob: ['my.file'],
				encoding: 'latin1',
				replacementJs: true,
				output: true,
			};
			expect((await rr('æ', 'text.length + text', config)).out).toBe('f3fæoo\n');
		});

		test('with --replacement-js `bytes` and `size` are the size of the file in its encoding (#688)', async () => {
			fs.writeFileSync('my.file', latin1());
			const config = {
				includeGlob: ['my.file'],
				encoding: 'latin1',
				replacementJs: true,
				output: true,
			};
			expect((await rr('^', 'bytes + ":" + size + ":"', config)).out).toBe('3:3 Bytes:fæo\n');
		});
	});
});
