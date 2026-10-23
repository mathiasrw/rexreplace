// https://github.com/mathiasrw/rexreplace/issues/720
// Only the errors that stopped the run started with ❌, so the other errors looked like the info around them.
// Finding no files was an error with the exit code 1, also when there was just nothing to do.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr, rrStatus} from '../../helper.js';

describe('#720 every error starts with ❌', () => {
	test('an error from a file, and the other files are still changed', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		fs.chmodSync('a.file', 0);
		const result = await rr('o', 'x', {includeGlob: ['a.file', 'b.file']});
		expect(result.out).toBe('b.file\n');
		expect(result.err).toStartWith(' ❌ ');
		expect(result.err).toContain('EACCES');
		expect(result.err).toEndWith('\n\n');
		expect(result.exit).toBe(1);
	});

	test('an error that stops the run', async () => {
		expect((await rr('(', 'x', {pipedData: 'foo'})).err).toStartWith(
			' ❌ Invalid regular expression'
		);
	});
});

describe('#720 finding no files is a warning', () => {
	test('with the exit code 0', async () => {
		expect(await rr('o', 'x', {includeGlob: ['nope.file']})).toEqual({
			out: '',
			err: ' 🟡 0 files found\n\n',
			exit: null,
		});
	});

	test('in the status report', async () => {
		const status = await rrStatus('o', 'x', {includeGlob: ['nope.file']});
		expect(status.warnings).toEqual(['0 files found']);
		expect(status.errors).toEqual([]);
	});

	test.each(['quiet', 'quietTotal'])('not shown with --%s', async flag => {
		expect(await rr('o', 'x', {includeGlob: ['nope.file'], [flag]: true})).toEqual({
			out: '',
			err: '',
			exit: null,
		});
	});

	test('does not stop the run with --halt', async () => {
		expect((await rr('o', 'x', {includeGlob: ['nope.file'], halt: true})).exit).toBe(null);
	});
});
