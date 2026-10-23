// https://github.com/mathiasrw/rexreplace/issues/819
// With --sort modified, created or size, a file that was gone between the glob and the sort crashed the run with a stack trace.
import {describe, test, expect, spyOn} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('#819 a file that is gone before the sort', () => {
	test.each([['modified'], ['created'], ['size']])(
		'is sorted last with --sort %s, and the run goes on',
		async sort => {
			fs.writeFileSync('a.md', 'foo');
			fs.writeFileSync('gone.md', 'foo');
			fs.writeFileSync('z.md', 'foo');
			// The sort looks at gone.md as if it was deleted after the glob found it
			const statSync = fs.statSync;
			const spy = spyOn(fs, 'statSync').mockImplementation((file, options) => {
				if ('gone.md' === file && !options) {
					throw Object.assign(new Error('ENOENT: no such file or directory'), {code: 'ENOENT'});
				}
				return statSync(file, options);
			});
			try {
				const result = await rr('foo', 'bar', {includeGlob: ['*.md'], sort});
				expect(result.out).toBe('a.md\nz.md\ngone.md\n');
				expect(result.exit).toBe(null);
			} finally {
				spy.mockRestore();
			}
		}
	);
});
