// --glob-pipe (-g): each line of the piped data is a path or a glob of the files to work on (#711)
import {describe, test, expect} from 'bun:test';
import {$} from 'bun';
import {cli, sh} from '../helper.js';

async function makeFiles() {
	await Bun.write('my.file', 'foobar\n');
	await Bun.write('your.file', 'abc123\n');
}

describe('--glob-pipe', () => {
	test('a piped line can be a glob', async () => {
		await makeFiles();
		expect(await sh($`echo -n '*.file' | bun ${cli} b x -g -A`)).toEqual({
			out: 'my.file\nyour.file\n',
			err: '',
			exit: 0,
		});
	});

	test.each([['--replacement-pipe'], ['--pipe'], ['--js-pipe']])(
		'can not be used with %s, as the piped data can only be one thing',
		async flag => {
			await makeFiles();
			const result = await sh($`echo -n my.file | bun ${cli} b x --glob-pipe ${flag}`);
			expect(result.err).toContain('are mutually exclusive');
			expect(result.exit).toBe(1);
			expect(await Bun.file('my.file').text()).toBe('foobar\n');
		}
	);

	test('--null-in can only be used with --glob-pipe', async () => {
		await makeFiles();
		const result = await sh($`echo -n my.file | bun ${cli} b x --null-in`);
		expect(result.exit).toBe(1);
		expect(await Bun.file('my.file').text()).toBe('foobar\n');
	});
});
