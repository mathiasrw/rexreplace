// Null bytes come out where they went in, piped in and in a file
import {describe, test, expect} from 'bun:test';
import {$} from 'bun';
import {cli, sh} from '../helper.js';

const data = 'foo\0boo\0';

describe('null bytes are kept', () => {
	describe('in piped data', () => {
		test('when replacing, also with --output', async () => {
			expect((await sh($`bun ${cli} o x < ${new Response(data)}`)).out).toBe('fxx\0bxx\0');
			expect((await sh($`bun ${cli} o x --output < ${new Response(data)}`)).out).toBe('fxx\0bxx\0');
		});

		test('with --output-match and --null-out', async () => {
			expect(
				(await sh($`bun ${cli} o _ --output-match --null-out < ${new Response(data)}`)).out
			).toBe('o\0o\0o\0o\0');
		});
	});

	describe('in a file', () => {
		test('when it is changed in place', async () => {
			await Bun.write('null.file', data);
			expect(await sh($`bun ${cli} o x null.file`)).toEqual({out: 'null.file\n', err: '', exit: 0});
			expect(await Bun.file('null.file').text()).toBe('fxx\0bxx\0');
		});

		test('with --output, followed by the line break after the content', async () => {
			await Bun.write('null.file', data);
			expect((await sh($`bun ${cli} o x null.file --output`)).out).toBe('fxx\0bxx\0\n');
		});

		test('with --output-match and --null-out', async () => {
			await Bun.write('null.file', data);
			expect((await sh($`bun ${cli} o _ null.file --output-match --null-out`)).out).toBe(
				'o\0o\0o\0o\0'
			);
		});
	});
});
