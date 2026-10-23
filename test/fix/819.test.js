// https://github.com/mathiasrw/rexreplace/issues/819
// With --sort modified, created or size, a file that was gone between the glob and the sort crashed the run with a stack trace.
import {describe, test, expect, spyOn} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

// The sort looks at each file with statSync and no options. When it looks at the given file, the file is made to fail.
function failInSort(name, fail) {
	const statSync = fs.statSync;
	return spyOn(fs, 'statSync').mockImplementation((file, options) => {
		if (name === file && !options) {
			fail();
		}
		return statSync(file, options);
	});
}

describe('#819 a file that can not be looked at in the sort', () => {
	test.each([['modified'], ['created'], ['size']])(
		'when deleted, is sorted last with --sort %s, and told about as not found',
		async sort => {
			['a.md', 'gone.md', 'z.md'].forEach(name => fs.writeFileSync(name, 'foo'));
			const spy = failInSort('gone.md', () => fs.unlinkSync('gone.md'));
			try {
				expect(await rr('foo', 'bar', {includeGlob: ['*.md'], sort})).toEqual({
					out: 'a.md\nz.md\n',
					err: ' ❌ File not found\n    gone.md\n\n',
					exit: 2,
				});
			} finally {
				spy.mockRestore();
			}
		}
	);

	test('for another reason, is an error with that reason, and is left out', async () => {
		['a.md', 'b.md'].forEach(name => fs.writeFileSync(name, 'foo'));
		const spy = failInSort('b.md', () => {
			throw Object.assign(new Error('EACCES: permission denied'), {code: 'EACCES'});
		});
		try {
			expect(await rr('foo', 'bar', {includeGlob: ['*.md'], sort: 'size'})).toEqual({
				out: 'a.md\n',
				err: ' ❌ EACCES: permission denied\n\n',
				exit: 2,
			});
			expect(fs.readFileSync('b.md', 'utf8')).toBe('foo');
		} finally {
			spy.mockRestore();
		}
	});
});
