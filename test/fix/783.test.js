// https://github.com/mathiasrw/rexreplace/issues/783
// The exit code was 1 for an error in a file, for a run that stopped and for wrong flags, so a script could not tell them apart.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {$} from 'bun';
import {cli, sh} from '../helper.js';

describe('#783 the exit code tells what happened', () => {
	test('0 when it is done, also with a warning', async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect((await sh($`bun ${cli} o x my.file`)).exit).toBe(0);
		expect((await sh($`bun ${cli} o x nope.file`)).exit).toBe(0);
	});

	test('0 for the help that was asked for', async () => {
		expect((await sh($`bun ${cli} -h`)).exit).toBe(0);
	});

	test('2 when a file gives an error and the run goes on', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		fs.chmodSync('a.file', 0);
		expect((await sh($`bun ${cli} o x a.file b.file`)).exit).toBe(2);
		expect(fs.readFileSync('b.file', 'utf8')).toBe('fxx');
	});

	test('3 when the run stops', async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect((await sh($`bun ${cli} '(' x my.file`)).exit).toBe(3);
		expect((await sh($`bun ${cli} o x my.file --encoding nope`)).exit).toBe(3);
	});

	test('3 for wrong flags and too few arguments, with no stray line on stdout', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await sh($`bun ${cli} o x my.file --nope`);
		expect(result.exit).toBe(3);
		expect(result.out).toBe('');
		expect(result.err).toEndWith('Unknown argument: nope\n');
		expect((await sh($`bun ${cli} o`)).exit).toBe(3);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
	});
});
