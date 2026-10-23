import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr, rrStatus} from '../helper.js';

describe('--expect-files', () => {
	test('is met when a file is found, also when nothing is changed', async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect(await rr('nope', 'x', {includeGlob: ['my.file'], expectFiles: true})).toEqual({
			out: '',
			err: '',
			exit: null,
		});
	});

	test('is not met when no file is found, so the warning becomes a failed check', async () => {
		expect(await rr('o', 'x', {includeGlob: ['nope.file'], expectFiles: true})).toEqual({
			out: '',
			err: ' 🟡 0 files found\n\n ❌ Expected files, but 0 files found\n\n',
			exit: 1,
		});
	});

	test('is told in `checks` in the status report, and not in `errors`', async () => {
		const status = await rrStatus('o', 'x', {includeGlob: ['nope.file'], expectFiles: true});
		expect(status.checks).toEqual(['Expected files, but 0 files found']);
		expect(status.errors).toEqual([]);
	});

	test('is still shown with --quiet, but not with --quiet-total', async () => {
		const config = {includeGlob: ['nope.file'], expectFiles: true};
		expect((await rr('o', 'x', {...config, quiet: true})).err).toBe(
			' ❌ Expected files, but 0 files found\n\n'
		);
		expect(await rr('o', 'x', {...config, quietTotal: true})).toEqual({out: '', err: '', exit: 1});
	});

	test('an error in a file gives the exit code 2, also when a check is not met', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.chmodSync('a.file', 0);
		expect((await rr('o', 'x', {includeGlob: ['a.file'], expectDiff: true})).exit).toBe(2);
	});
});
