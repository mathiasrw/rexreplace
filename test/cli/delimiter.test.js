// The delimiters after the names and after the content, as given on the command line
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {$} from 'bun';
import {cli, sh} from '../helper.js';

describe('--name-delimiter', () => {
	test('goes after each name', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		fs.writeFileSync('your.file', 'abc123\n');
		const result = await sh($`bun ${cli} b x my.file your.file -A --name-delimiter ', '`);
		expect(result.out).toBe('my.file, your.file, ');
	});

	test('understands escape sequences and the € and § aliases', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		fs.writeFileSync('your.file', 'abc123\n');
		const delimiter = '\\t§t€';
		const result = await sh($`bun ${cli} b x my.file your.file -A --name-delimiter ${delimiter}`);
		expect(result.out).toBe('my.file\t\t$your.file\t\t$');
	});

	test('keeps € and § with --void-euro and --void-section', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		fs.writeFileSync('your.file', 'abc123\n');
		const delimiter = '§t€';
		const result = await sh(
			$`bun ${cli} b x my.file your.file -A --name-delimiter ${delimiter} --no-name-delimiter-tail --void-section --void-euro`
		);
		expect(result.out).toBe('my.file§t€your.file');
	});

	test('is only put between the names with --no-name-delimiter-tail or --name-delimiter-tail=false', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		fs.writeFileSync('your.file', 'abc123\n');
		const noTail = await sh(
			$`bun ${cli} b x my.file your.file -A --name-delimiter ', ' --no-name-delimiter-tail`
		);
		expect(noTail.out).toBe('my.file, your.file');
		fs.writeFileSync('my.file', 'foobar\n');
		fs.writeFileSync('your.file', 'abc123\n');
		const tailFalse = await sh(
			$`bun ${cli} b x my.file your.file -A --name-delimiter ', ' --name-delimiter-tail=false`
		);
		expect(tailFalse.out).toBe('my.file, your.file');
	});

	test('with no tail and one name gives just the name', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		const result = await sh(
			$`bun ${cli} b x my.file --name-delimiter ', ' --no-name-delimiter-tail`
		);
		expect(result.out).toBe('my.file');
	});
});

describe('the content delimiter', () => {
	test('is a line break by default, unless the content already ends with one', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		fs.writeFileSync('your.file', 'abc123\n');
		expect((await sh($`bun ${cli} b x my.file your.file -o`)).out).toBe('fooxar\naxc123\n');
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'bar');
		expect((await sh($`bun ${cli} o x a.file b.file -o`)).out).toBe('fxx\nbar\n');
		expect((await sh($`bun ${cli} '[ab]' _ a.file b.file -m`)).out).toBe('b\na\n');
	});

	test('is not put after piped data, unless asked for', async () => {
		expect((await sh($`echo -n foo | bun ${cli} o x`)).out).toBe('fxx');
		expect((await sh($`echo -n foo | bun ${cli} o x --content-delimiter '|'`)).out).toBe('fxx');
		const tail = await sh(
			$`echo -n foo | bun ${cli} o x --content-delimiter '|' --content-delimiter-tail`
		);
		expect(tail.out).toBe('fxx|');
	});

	test('is used as it is when given', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		fs.writeFileSync('your.file', 'abc123\n');
		expect((await sh($`bun ${cli} b x my.file your.file -o --delimiter ''`)).out).toBe(
			'fooxar\naxc123\n'
		);
		const delimiter = '§t-\\n';
		expect(
			(await sh($`bun ${cli} b x my.file your.file -o --content-delimiter ${delimiter}`)).out
		).toBe('fooxar\n\t-\naxc123\n\t-\n');
		const noTail = await sh(
			$`bun ${cli} b x my.file your.file -o --content-delimiter '|' --no-content-delimiter-tail`
		);
		expect(noTail.out).toBe('fooxar\n|axc123\n');
	});

	test('goes after each match with --output-match, also with no tail', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		fs.writeFileSync('your.file', 'abc123\n');
		expect((await sh($`bun ${cli} '[bc]' _ my.file your.file -m --delimiter ','`)).out).toBe(
			'b,b,c,'
		);
		expect(
			(await sh($`bun ${cli} '[bc]' _ my.file your.file -m --delimiter ',' --no-tail`)).out
		).toBe('b,b,c');
	});
});

describe('--delimiter, --null-out and --tail', () => {
	test('--delimiter sets both delimiters', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		fs.writeFileSync('your.file', 'abc123\n');
		expect(await sh($`bun ${cli} b x my.file your.file -o --delimiter '|'`)).toEqual({
			out: 'fooxar\n|axc123\n|',
			err: 'my.file|your.file|',
			exit: 0,
		});
	});

	test('--null-out is a null byte after each name and each content', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		fs.writeFileSync('your.file', 'abc123\n');
		expect((await sh($`bun ${cli} b x my.file your.file -A --null-out`)).out).toBe(
			'my.file\0your.file\0'
		);
		fs.writeFileSync('my.file', 'foobar\n');
		fs.writeFileSync('your.file', 'abc123\n');
		expect((await sh($`bun ${cli} b x my.file your.file -o --null-out`)).out).toBe(
			'fooxar\n\0axc123\n\0'
		);
	});

	test('the most specific flag wins', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		fs.writeFileSync('your.file', 'abc123\n');
		expect((await sh($`bun ${cli} b x my.file your.file -o --null-out --delimiter ', '`)).err).toBe(
			'my.file, your.file, '
		);
		expect(
			(await sh($`bun ${cli} b x my.file your.file -o --delimiter ', ' --content-delimiter '|'`))
				.out
		).toBe('fooxar\n|axc123\n|');
		expect(
			(await sh($`bun ${cli} b x my.file your.file -A --name-delimiter ',' --null-out`)).out
		).toBe('my.file,your.file,');
	});

	test('--tail sets both tails, and the specific tail flag wins', async () => {
		fs.writeFileSync('my.file', 'foobar\n');
		fs.writeFileSync('your.file', 'abc123\n');
		expect((await sh($`bun ${cli} '[bc]' _ my.file your.file -m --delimiter ',' --tail`)).out).toBe(
			'b,b,c,'
		);
		expect((await sh($`bun ${cli} b x my.file your.file -o --delimiter '|' --no-tail`)).err).toBe(
			'my.file|your.file'
		);
		expect((await sh($`bun ${cli} b x my.file your.file -o --delimiter '|' --tail`)).out).toBe(
			'fooxar\n|axc123\n|'
		);
		expect(
			(
				await sh(
					$`bun ${cli} b x my.file your.file -o --delimiter '|' --no-tail --name-delimiter-tail`
				)
			).err
		).toBe('my.file|your.file|');
	});
});

describe('an invalid escape sequence in a delimiter', () => {
	test.each([['--name-delimiter'], ['--content-delimiter'], ['--delimiter']])(
		'in %s stops with an error and changes nothing',
		async flag => {
			fs.writeFileSync('my.file', 'foobar\n');
			const result = await sh($`bun ${cli} b x my.file ${flag} '\x4'`);
			expect(result.err).toContain(`Invalid escape sequence in ${flag}`);
			expect(result.exit).toBe(3);
			expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar\n');
		}
	);
});
