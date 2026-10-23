import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {$} from 'bun';
import {cli, sh} from '../helper.js';

const warning = ' 🟡 Data is piped in, but no flag tells what to do with it. It is not used.\n\n';

describe('--pipe and --js-pipe', () => {
	test('without --pipe the code does not get the piped data', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		expect(await sh($`echo -n x | bun ${cli} foo pipe my.file -o --js`)).toEqual({
			out: 'nullbar\n',
			err: 'my.file\n',
			exit: 0,
		});
	});

	test('the code gets the piped data with --js --pipe', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		expect((await sh($`echo -n x | bun ${cli} foo pipe my.file -o --js --pipe`)).out).toBe(
			'xbar\n'
		);
	});

	test('the code gets the piped data with -jp and --js-pipe', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		expect((await sh($`echo -n x | bun ${cli} foo pipe my.file -o -jp`)).out).toBe('xbar\n');
		expect((await sh($`echo -n x | bun ${cli} foo pipe my.file -o --js-pipe`)).out).toBe('xbar\n');
	});

	test('--trim-pipe trims the piped data first', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		expect((await sh($`echo -n ' x ' | bun ${cli} foo pipe my.file -o --js-pipe -T`)).out).toBe(
			'xbar\n'
		);
	});
});

describe('the warning that piped data is not used', () => {
	test('is given when data is read with --pipe, but not used', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		expect(await sh($`echo -n x | bun ${cli} o x my.file --pipe`)).toEqual({
			out: 'my.file\n',
			err: warning,
			exit: 0,
		});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar\n');
	});

	test('is not given without --pipe, as the data is not read', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		expect((await sh($`echo -n x | bun ${cli} o x my.file`)).err).toBe('');
	});

	test('is not given with --quiet', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		expect((await sh($`echo -n x | bun ${cli} o x my.file --pipe -q`)).err).toBe('');
	});

	test('is not given when the data is used', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		expect((await sh($`echo -n x | bun ${cli} b _ my.file -R`)).err).toBe('');
		expect((await sh($`echo -n x | bun ${cli} b pipe my.file --js-pipe`)).err).toBe('');
	});

	test('is not given when nothing, or only a line break, is piped in', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		expect((await sh($`echo -n '' | bun ${cli} o x my.file --pipe`)).err).toBe('');
		expect((await sh($`echo '' | bun ${cli} o x my.file --pipe`)).err).toBe('');
		expect((await sh($`bun ${cli} o x my.file --pipe < ${new Response('\r\n')}`)).err).toBe('');
	});
});
