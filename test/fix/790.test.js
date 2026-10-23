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
});
