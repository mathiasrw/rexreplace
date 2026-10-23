// https://github.com/mathiasrw/rexreplace/issues/733
// yargs turned a file glob like `2024` into a number, and fast-glob only takes strings, so RexReplace crashed.
import {describe, test, expect} from 'bun:test';
import {$} from 'bun';
import {cli, sh} from '../../helper.js';

describe('#733 a file glob that reads as a number', () => {
	test.each(['2024', '1e3', '0x10'])('is kept as a string, like %s', async name => {
		await Bun.write(name, 'foobar');
		expect(await sh($`bun ${cli} o x ${name}`)).toEqual({out: name + '\n', err: '', exit: 0});
		expect(await Bun.file(name).text()).toBe('fxxbar');
	});
});
