// --glob-pipe (-g): each line of the piped data is a path or a glob of the files to work on (#711)
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {$} from 'bun';
import {cli, sh} from '../helper.js';

describe('--glob-pipe', () => {
	test('a piped line can be a glob', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		fs.writeFileSync('your.file', 'abc123\n');
		expect(await sh($`echo -n '*.file' | bun ${cli} b x -g -A`)).toEqual({
			out: 'my.file\nyour.file\n',
			err: '',
			exit: 0,
		});
	});

	test.each([['--replacement-pipe'], ['--pipe'], ['--js-pipe']])(
		'can not be used with %s, as the piped data can only be one thing',
		async flag => {
			fs.writeFileSync('my.file', 'foobar\n');
			const result = await sh($`echo -n my.file | bun ${cli} b x --glob-pipe ${flag}`);
			expect(result.err).toContain('are mutually exclusive');
			expect(result.exit).toBe(1);
			expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar\n');
		}
	);

	test('--null-in can only be used with --glob-pipe', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		const result = await sh($`echo -n my.file | bun ${cli} b x --null-in`);
		expect(result.exit).toBe(1);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar\n');
	});
});
