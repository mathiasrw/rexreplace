// https://github.com/mathiasrw/rexreplace/issues/790
// With --glob-pipe the piped paths were decoded with --encoding, so with -e latin1 a name that is not ASCII found no file.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {$} from 'bun';
import {cli, sh} from '../helper.js';

describe('#790 the paths piped in with --glob-pipe', () => {
	test.each([
		['line breaks', 'æ.file\nb.file\n', ''],
		['null bytes', 'æ.file\0b.file\0', '--null-in'],
	])('are read as UTF-8 with -e latin1, split by %s', async (name, paths, flag) => {
		fs.writeFileSync('æ.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		const result = await sh(
			$`bun ${cli} foo bar -g -e latin1 -A ${flag || []} < ${new Response(paths)}`
		);
		expect(result).toEqual({out: 'æ.file\nb.file\n', err: '', exit: 0});
		expect(fs.readFileSync('æ.file', 'utf8')).toBe('bar');
	});

	test('are read as UTF-8 for names in other scripts and with emoji', async () => {
		const names = ['日本.file', '🦖.file', 'b.file'];
		names.forEach(name => fs.writeFileSync(name, 'foo'));
		const result = await sh(
			$`bun ${cli} foo bar -g -e latin1 -A < ${new Response(names.join('\n'))}`
		);
		expect(result.exit).toBe(0);
		names.forEach(name => expect(fs.readFileSync(name, 'utf8')).toBe('bar'));
	});

	test('are read as UTF-8 also when the files are UTF-16', async () => {
		fs.writeFileSync('æ.file', Buffer.from('foo', 'utf16le'));
		const result = await sh($`bun ${cli} foo bar -g -e utf16le < ${new Response('æ.file\n')}`);
		expect(result).toEqual({out: 'æ.file\n', err: '', exit: 0});
		expect(fs.readFileSync('æ.file', 'utf16le')).toBe('bar');
	});
});

describe('#790 piped content without --glob-pipe', () => {
	test('is still read with --encoding', async () => {
		// The byte 0xE6 is æ in latin1, and not valid UTF-8
		const latin1 = new Uint8Array([0x66, 0xe6, 0x6f]);
		const result = await sh($`bun ${cli} ${'æ'} x -e latin1 < ${new Response(latin1)}`);
		expect(result).toEqual({out: 'fxo', err: '', exit: 0});
	});
});
