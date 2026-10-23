// https://github.com/mathiasrw/rexreplace/issues/728
// An error from a file was printed, but the exit code was 0, so a script could not see that something went wrong.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../../helper.js';

// Note that rr() from the helper sets voidAsync per default, so the async flow is `voidAsync: false`
const flows = [
	['the async flow', {voidAsync: false}],
	['--void-async', {voidAsync: true}],
];

describe('#728 the exit code is 1 when a file gives an error', () => {
	test.each(flows)('and the other files are still changed with %s', async (name, flags) => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		fs.chmodSync('b.file', 0);
		const result = await rr('o', 'x', {includeGlob: ['a.file', 'b.file'], ...flags});
		expect(result.out).toBe('a.file\n');
		expect(result.err).toContain('EACCES');
		expect(result.exit).toBe(1);
		expect(fs.readFileSync('a.file', 'utf8')).toBe('fxx');
	});

	test('when the backup can not be made', async () => {
		fs.mkdirSync('locked');
		fs.writeFileSync('locked/my.file', 'foo');
		fs.chmodSync('locked', 0o555);

		try {
			const result = await rr('o', 'x', {includeGlob: ['locked/my.file']});
			expect(result.out).toBe('');
			expect(result.err).toContain('EACCES');
			expect(result.exit).toBe(1);
			expect(fs.readFileSync('locked/my.file', 'utf8')).toBe('foo');
		} finally {
			// The folder must be writable again so the test folder can be removed
			fs.chmodSync('locked', 0o755);
		}
	});

	test.each(['quiet', 'quietTotal'])('also with --%s', async flag => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		fs.chmodSync('b.file', 0);
		expect((await rr('o', 'x', {includeGlob: ['a.file', 'b.file'], [flag]: true})).exit).toBe(1);
	});
});
