// The CLI checks the encoding before stdin or any file is read (#690)
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {$} from 'bun';
import {cli, sh} from '../helper.js';

const lastLine = text => text.trim().split('\n').at(-1);

describe('--encoding', () => {
	test('an unknown encoding stops the run with an error, and the file is not changed', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await sh($`bun ${cli} o x my.file --encoding nope`);
		expect(result.exit).toBe(3);
		expect(lastLine(result.err)).toBe('Unknown encoding: nope');
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
	});

	test('an unknown encoding also stops the run for piped data', async () => {
		const result = await sh($`echo -n foo | bun ${cli} o x --encoding nope`);
		expect(result.exit).toBe(3);
		expect(lastLine(result.err)).toBe('Unknown encoding: nope');
	});

	test('the name of an encoding is known in any case', async () => {
		expect(await sh($`echo -n foo | bun ${cli} o x --encoding LATIN1`)).toEqual({
			out: 'fxx',
			err: '',
			exit: 0,
		});
	});
});
