// --rename (-r) does the search and replace on the path of each file, and renames the file to the result
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {$} from 'bun';
import {cli, sh} from '../helper.js';

describe('--rename', () => {
	test('gives the new names to stdout, so they can be piped on', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('b.md', 'foo');
		const result = await sh(
			$`bun ${cli} md txt '*.md' -r --null-out | bun ${cli} f x --glob-pipe --null-in -A`
		);
		expect(result).toEqual({out: 'a.txt\nb.txt\n', err: '', exit: 0});
		expect(fs.readFileSync('a.txt', 'utf8')).toBe('xoo');
	});

	test('--rename-force needs --rename', async () => {
		fs.writeFileSync('a.md', 'foo');
		const result = await sh($`bun ${cli} md txt a.md --rename-force`);
		expect(result.exit).toBe(3);
		expect(fs.readdirSync('.')).toEqual(['a.md']);
	});
});
