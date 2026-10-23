// The names of the changed files are the result on stdout. With --output and --output-match stdout has the content, so the names go to stderr.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {$} from 'bun';
import {cli, sh} from '../helper.js';

describe('the names of the changed files', () => {
	test('go to stdout, and nothing goes to stderr', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		fs.writeFileSync('your.file', 'abc123\n');
		expect(await sh($`bun ${cli} b x my.file your.file -A`)).toEqual({
			out: 'my.file\nyour.file\n',
			err: '',
			exit: 0,
		});
	});

	test('stay alone on stdout with --verbose', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		const result = await sh($`bun ${cli} b x my.file --verbose`);
		expect(result.out).toBe('my.file\n');
		expect(result.err.split('\n')).not.toContain('my.file');
	});

	test('are not printed with --quiet, but the file is changed', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		expect(await sh($`bun ${cli} b x my.file -q`)).toEqual({out: '', err: '', exit: 0});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fooxar\n');
	});

	describe('go to stderr when stdout has the content', () => {
		test('with --output', async () => {
			fs.writeFileSync('my.file', 'foobar\n');
			expect(await sh($`bun ${cli} b x my.file -o`)).toEqual({
				out: 'fooxar\n',
				err: 'my.file\n',
				exit: 0,
			});
			expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar\n');
		});

		test('with --output-match', async () => {
			fs.writeFileSync('my.file', 'foobar\n');
			expect(await sh($`bun ${cli} b _ my.file -m`)).toEqual({
				out: 'b\n',
				err: 'my.file\n',
				exit: 0,
			});
		});

		test('and are not printed with --quiet', async () => {
			fs.writeFileSync('my.file', 'foobar\n');
			expect((await sh($`bun ${cli} b x my.file -o -q`)).err).toBe('');
			expect((await sh($`bun ${cli} b _ my.file -m -q`)).err).toBe('');
		});

		test('only for a file where something would change', async () => {
			fs.writeFileSync('my.file', 'foobar\n');
			expect((await sh($`bun ${cli} z x my.file -o`)).err).toBe('');
		});

		test('with --name-delimiter', async () => {
			fs.writeFileSync('my.file', 'foobar\n');
			fs.writeFileSync('your.file', 'abc123\n');
			const result = await sh($`bun ${cli} b x my.file your.file -o --name-delimiter ', '`);
			expect(result.err).toBe('my.file, your.file, ');
		});

		test('with --name-all also for the files where nothing would change', async () => {
			fs.writeFileSync('my.file', 'foobar\n');
			fs.writeFileSync('your.file', 'abc123\n');
			expect((await sh($`bun ${cli} b x my.file your.file -o --name-all`)).err).toBe(
				'my.file\nyour.file\n'
			);
		});
	});
});
