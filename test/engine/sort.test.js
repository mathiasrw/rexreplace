import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('--sort', () => {
	test('is natural by default: numbers as numbers, and case ignored', async () => {
		fs.writeFileSync('file10.md', 'foo');
		fs.writeFileSync('file2.md', 'foo');
		fs.writeFileSync('B.md', 'foo');
		fs.writeFileSync('a.md', 'foo');
		expect((await rr('o', 'x', {includeGlob: ['*.md']})).out).toBe(
			'a.md\nB.md\nfile2.md\nfile10.md\n'
		);
	});

	test('ascii sorts by char code', async () => {
		fs.writeFileSync('file10.md', 'foo');
		fs.writeFileSync('file2.md', 'foo');
		fs.writeFileSync('B.md', 'foo');
		fs.writeFileSync('a.md', 'foo');
		expect((await rr('o', 'x', {includeGlob: ['*.md'], sort: 'ascii'})).out).toBe(
			'B.md\na.md\nfile10.md\nfile2.md\n'
		);
	});

	test.each([['NATURAL'], ['Natural'], ['true'], ['yes'], ['YES']])(
		'%s is natural',
		async value => {
			fs.writeFileSync('file10.md', 'foo');
			fs.writeFileSync('file2.md', 'foo');
			expect((await rr('o', 'x', {includeGlob: ['*.md'], sort: value})).out).toBe(
				'file2.md\nfile10.md\n'
			);
		}
	);

	test('none keeps the paths in the order given, and then the files from globs, sorted natural', async () => {
		fs.writeFileSync('c.md', 'foo');
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('file10.txt', 'foo');
		fs.writeFileSync('file2.txt', 'foo');
		const config = {includeGlob: ['c.md', '*.txt', 'a.md'], sort: 'none'};
		expect((await rr('o', 'x', config)).out).toBe('c.md\na.md\nfile2.txt\nfile10.txt\n');
	});

	test('modified puts the oldest first, and ascii decides when they are the same', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('b.md', 'foo');
		fs.writeFileSync('c.md', 'foo');
		fs.utimesSync('a.md', 3000, 3000);
		fs.utimesSync('b.md', 1000, 1000);
		fs.utimesSync('c.md', 1000, 1000);
		expect((await rr('o', 'x', {includeGlob: ['*.md'], sort: 'modified'})).out).toBe(
			'b.md\nc.md\na.md\n'
		);
	});

	test('created puts the oldest first, or uses the modified time where the file system has no time for it', async () => {
		for (const name of ['c.md', 'b.md', 'a.md']) {
			fs.writeFileSync(name, 'foo');
			await Bun.sleep(20);
		}
		expect((await rr('o', 'x', {includeGlob: ['*.md'], sort: 'created'})).out).toBe(
			'c.md\nb.md\na.md\n'
		);
	});

	test('size puts the smallest first, and ascii decides when they are the same', async () => {
		fs.writeFileSync('a.md', 'ooo');
		fs.writeFileSync('b.md', 'o');
		fs.writeFileSync('c.md', 'o');
		expect((await rr('o', 'x', {includeGlob: ['*.md'], sort: 'size'})).out).toBe(
			'b.md\nc.md\na.md\n'
		);
	});

	test.each([['nope'], ['']])('%j stops the run, and tells the values', async value => {
		fs.writeFileSync('a.md', 'foo');
		const result = await rr('o', 'x', {includeGlob: ['a.md'], sort: value});
		expect(result.err).toStartWith(
			' ❌ --sort must be one of natural, ascii, modified, created, size, none'
		);
		expect(result.exit).toBe(3);
		expect(fs.readFileSync('a.md', 'utf8')).toBe('foo');
	});
});
