// https://github.com/mathiasrw/rexreplace/issues/818
// A replacement file that could not be read gave no reason, and with --js the error came once for each file.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr, rrStatus} from '../helper.js';

describe('#818 a replacement file that can not be read', () => {
	test.each([
		['is not there', 'nope.txt', 'nope.txt (ENOENT: no such file or directory)'],
		['is a folder', 'adir', 'adir (EISDIR: illegal operation on a directory)'],
		[
			'has a zero-width space',
			'no\u200bpe.txt',
			'"no\\u200bpe.txt" (ENOENT: no such file or directory)',
		],
		['has a C1 char', 'no\u0085pe.txt', '"no\\u0085pe.txt" (ENOENT: no such file or directory)'],
		[
			'has a line break at the end, like from echo',
			'a.txt\n',
			'"a.txt\\n" (ENOENT: no such file or directory)',
		],
		[
			'has a backslash, like a Windows path',
			'my\\dir/nope.txt',
			'my\\dir/nope.txt (ENOENT: no such file or directory)',
		],
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
		expect(status.errors).toEqual([
			'The replacement file can not be read: nope.txt (ENOENT: no such file or directory)',
		]);
	});
});
