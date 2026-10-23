// --nl (-l) ends stdout and stderr with a line break, unless they already end with one
import {describe, test, expect} from 'bun:test';
import {$} from 'bun';
import {cli, sh} from '../helper.js';

async function makeFiles() {
	await Bun.write('my.file', 'foobar\n');
	await Bun.write('your.file', 'abc123\n');
}

describe('--nl', () => {
	test('adds a line break after the last match, also as -l', async () => {
		await makeFiles();
		expect(
			(await sh($`bun ${cli} '[bc]' _ my.file your.file -m --delimiter ',' --no-tail --nl`)).out
		).toBe('b,b,c\n');
		expect(
			(await sh($`bun ${cli} '[bc]' _ my.file your.file -m --delimiter ',' --no-tail -l`)).out
		).toBe('b,b,c\n');
	});

	test('comes after the tail', async () => {
		await makeFiles();
		expect(
			(await sh($`bun ${cli} '[bc]' _ my.file your.file -m --delimiter ',' --tail --nl`)).out
		).toBe('b,b,c,\n');
	});

	test('adds nothing when the output already ends with a line break', async () => {
		await makeFiles();
		expect((await sh($`bun ${cli} b x my.file -o --nl`)).out).toBe('fooxar\n');
	});

	test('adds a line break after piped data', async () => {
		expect((await sh($`echo -n foo | bun ${cli} o x --nl`)).out).toBe('fxx\n');
	});

	test('adds nothing when nothing is printed', async () => {
		expect((await sh($`echo -n foo | bun ${cli} nope x -m --nl`)).out).toBe('');
	});

	test('ends the names with a line break, on stdout and on stderr', async () => {
		await makeFiles();
		const stdout = await sh(
			$`bun ${cli} b x my.file your.file -A --name-delimiter ',' --no-name-delimiter-tail --nl`
		);
		expect(stdout.out).toBe('my.file,your.file\n');
		await makeFiles();
		const stderr = await sh(
			$`bun ${cli} b x my.file your.file -o --name-delimiter ',' --no-name-delimiter-tail --nl`
		);
		expect(stderr.err).toBe('my.file,your.file\n');
	});
});
