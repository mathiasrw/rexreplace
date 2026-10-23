// https://github.com/mathiasrw/rexreplace/issues/826
// --rename put control characters into the new name, like the line break at the end of a replacement file.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('#826 control characters in a new name', () => {
	test('are removed, like the line break at the end of a replacement file', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('name.txt', 'b\n');
		const config = {includeGlob: ['a.md'], rename: true, replacementFile: true, verbose: true};
		const result = await rr('^a', 'name.txt', config);
		expect(result.out).toBe('b.md\n');
		expect(result.err).toContain('Removed control characters from the new name of: a.md');
		expect(fs.readdirSync('.').sort()).toEqual(['b.md', 'name.txt']);
	});

	test('are removed with --rename-path too, also a tab, a null byte and DEL', async () => {
		fs.writeFileSync('a.md', 'foo');
		const config = {includeGlob: ['a.md'], renamePath: true};
		expect((await rr('^a', 'b\t\0\x7f\x01c', config)).out).toBe('bc.md\n');
		expect(fs.readdirSync('.')).toEqual(['bc.md']);
	});
});
