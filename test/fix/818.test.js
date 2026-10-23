// https://github.com/mathiasrw/rexreplace/issues/818
// A replacement file that could not be read gave no reason, and with --js the error came once for each file.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr, rrStatus} from '../helper.js';

describe('#818 a replacement file that can not be read', () => {
	test.each([
		['is not there', 'nope.txt', '"nope.txt" (ENOENT)'],
		['is a folder', 'adir', '"adir" (EISDIR)'],
		['has a line break at the end, like from echo', 'a.txt\n', '"a.txt\\n" (ENOENT)'],
	])('tells the reason when the path %s', async (name, filepath, text) => {
		fs.mkdirSync('adir');
		fs.writeFileSync('a.txt', 'X');
		const result = await rr('X', filepath, {includeGlob: ['a.txt'], replacementFile: true});
		expect(result.err).toStartWith(' ❌ The replacement file can not be read: ' + text);
	});

	test('with --js is told once in the run, not once for each file', async () => {
		fs.writeFileSync('a.txt', 'X');
		fs.writeFileSync('b.txt', 'X');
		const config = {includeGlob: ['*.txt'], replacementJs: true, replacementFile: true};
		const status = await rrStatus('X', '"nope.txt"', config);
		expect(status.errors).toEqual(['The replacement file can not be read: "nope.txt" (ENOENT)']);
	});
});
