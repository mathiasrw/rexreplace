import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('--expect-zero-diff', () => {
	test('is met when nothing is changed, also when no file is found', async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect(await rr('nope', 'x', {includeGlob: ['my.file'], expectZeroDiff: true})).toEqual({
			out: '',
			err: '',
			exit: null,
		});
		expect((await rr('o', 'x', {includeGlob: ['nope.file'], expectZeroDiff: true})).exit).toBe(
			null
		);
	});

	test('is not met when a file is changed, and the file is still changed', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		expect(await rr('o', 'x', {includeGlob: ['*.file'], expectZeroDiff: true})).toEqual({
			out: 'a.file\nb.file\n',
			err: ' ❌ Expected no diff, but 2 files were changed\n\n',
			exit: 1,
		});
		expect(fs.readFileSync('a.file', 'utf8')).toBe('fxx');
	});

	test('with --simulate only checks', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const config = {includeGlob: ['my.file'], expectZeroDiff: true, simulate: true};
		expect(await rr('o', 'x', config)).toEqual({
			out: 'my.file\n',
			err: ' ❌ Expected no diff, but 1 file would change\n\n',
			exit: 1,
		});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
	});

	test('tells about piped data', async () => {
		expect((await rr('o', 'x', {pipedData: 'foo', expectZeroDiff: true})).err).toBe(
			' ❌ Expected no diff, but the piped data was changed\n\n'
		);
	});

	test.each([['expectDiff'], ['expectDiffAll']])('can not be used with --%s', async flag => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('o', 'x', {
			includeGlob: ['my.file'],
			expectZeroDiff: true,
			[flag]: true,
		});
		expect(result.exit).toBe(3);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
	});
});
