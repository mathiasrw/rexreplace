// https://github.com/mathiasrw/rexreplace/issues/791
// The code of --js knew about the file, but not where it was in the run, so files could not be numbered.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

const content = name => fs.readFileSync(name, 'utf8');

describe('#791 numbers for --js', () => {
	test('$n is the number of the file and $t the number of files', async () => {
		fs.writeFileSync('a.txt', 'x');
		fs.writeFileSync('b.txt', 'x');
		await rr('x', '$n + " of " + $t', {includeGlob: ['*.txt'], replacementJs: true});
		expect([content('a.txt'), content('b.txt')]).toEqual(['1 of 2', '2 of 2']);
	});

	test('have cousins with zeros in front, and with a space at the end', async () => {
		const config = {pipedData: 'x', replacementJs: true};
		expect((await rr('x', '$n0 + $n00 + $n_ + $n00_', config)).out).toBe('010011 001 ');
		expect((await rr('x', '$n000000000', config)).out).toBe('0000000001');
	});

	test('$i counts the files with a match, and $c the files changed', async () => {
		fs.writeFileSync('a.txt', 'x');
		fs.writeFileSync('b.txt', 'x');
		fs.writeFileSync('c.txt', 'x');
		// a.txt has a match, but is not changed
		const code = 'name === "a" ? "x" : $i + "-" + $c';
		await rr('x', code, {includeGlob: ['*.txt'], replacementJs: true});
		expect([content('a.txt'), content('b.txt'), content('c.txt')]).toEqual(['x', '2-1', '3-2']);
	});

	test('$m is the number of the match in the file, and $M across the files', async () => {
		fs.writeFileSync('a.txt', 'oo');
		fs.writeFileSync('b.txt', 'oo');
		await rr('o', '$m + "" + $M', {includeGlob: ['*.txt'], replacementJs: true});
		expect([content('a.txt'), content('b.txt')]).toEqual(['1122', '1324']);
	});

	test('are the same on every run, also when the files could be handled at the same time', async () => {
		const names = Array.from({length: 30}, (_, i) => `file${i + 1}.txt`);
		names.forEach(name => fs.writeFileSync(name, 'x'));
		await rr('x', '$i', {includeGlob: ['*.txt'], replacementJs: true, voidAsync: false});
		expect(names.map(content)).toEqual(names.map((_, i) => String(i + 1)));
	});

	test('number the files to rename', async () => {
		fs.writeFileSync('b.jpg', 'x');
		fs.writeFileSync('a.jpg', 'x');
		const config = {includeGlob: ['*.jpg'], rename: true, replacementJs: true};
		expect((await rr('^.*$', '"photo-" + $n00 + ext', config)).out).toBe(
			'photo-001.jpg\nphoto-002.jpg\n'
		);
	});
});
