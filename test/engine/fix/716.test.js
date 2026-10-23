// https://github.com/mathiasrw/rexreplace/issues/716
// The search was case-insensitive by default, but the globs were case-sensitive.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../../helper.js';

// The names differ in more than case, so they can both be there on a file system that is case-insensitive
function makeFiles() {
	fs.writeFileSync('a.file', 'foo');
	fs.writeFileSync('B.FILE', 'foo');
}

describe('#716 the globs are case-insensitive like the search', () => {
	test('a glob finds a file whatever the case of its name', async () => {
		makeFiles();
		expect(await rr('o', 'x', {includeGlob: ['*.file']})).toEqual({
			out: 'B.FILE\na.file\n',
			err: '',
			exit: null,
		});
	});

	test('--exclude-glob leaves out a file whatever the case of its name', async () => {
		makeFiles();
		// `*.*` finds both files also when globs are case-sensitive, so only --exclude-glob is tested
		const config = {includeGlob: ['*.*'], excludeGlob: ['b.*']};
		expect((await rr('o', 'x', config)).out).toBe('a.file\n');
		expect(fs.readFileSync('B.FILE', 'utf8')).toBe('foo');
	});

	test('--void-ignore-case makes all globs case-sensitive', async () => {
		makeFiles();
		const config = {includeGlob: ['*.file'], voidIgnoreCase: true};
		expect((await rr('o', 'x', config)).out).toBe('a.file\n');
		fs.writeFileSync('a.file', 'foo');
		const excluded = {includeGlob: ['*.*'], excludeGlob: ['b.*'], voidIgnoreCase: true};
		expect((await rr('o', 'x', excluded)).out).toBe('B.FILE\na.file\n');
	});
});
