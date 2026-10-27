// https://github.com/mathiasrw/rexreplace/issues/859
// --js code that runs once per file ran at the start of each file, also when the file had no match
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('#859 --js code that runs once per file', () => {
	test('does not run for a file with no match', async () => {
		['a.txt', 'b.txt', 'c.txt'].forEach(name =>
			fs.writeFileSync(name, 'b.txt' === name ? 'bar' : 'foo')
		);
		await rr('foo', 'fs.appendFileSync("log", name); "x"', {
			includeGlob: ['*.txt'],
			replacementJs: true,
		});
		expect(fs.readFileSync('log', 'utf8')).toBe('ac');
	});

	test('runs once for a file with more than one match', async () => {
		fs.writeFileSync('a.txt', 'foo foo');
		await rr('foo', 'fs.appendFileSync("log", name); "x"', {
			includeGlob: ['a.txt'],
			replacementJs: true,
		});
		expect(fs.readFileSync('log', 'utf8')).toBe('a');
		expect(fs.readFileSync('a.txt', 'utf8')).toBe('x x');
	});

	test('tells an error for the first file with a match', async () => {
		['a.txt', 'b.txt'].forEach(name => fs.writeFileSync(name, 'b.txt' === name ? 'foo' : 'bar'));
		const result = await rr('foo', 'nope()', {includeGlob: ['*.txt'], replacementJs: true});
		expect(result.err).toStartWith(' ❌ The code of --js failed for b.txt\n');
	});
});
