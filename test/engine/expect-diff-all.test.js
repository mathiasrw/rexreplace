import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('--expect-diff-all', () => {
	test('is met when all files found are changed', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'boo');
		expect((await rr('o', 'x', {includeGlob: ['*.file'], expectDiffAll: true})).exit).toBe(null);
	});

	test('is not met when a file is not changed', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'bar');
		fs.writeFileSync('c.file', 'baz');
		expect(await rr('o', 'x', {includeGlob: ['*.file'], expectDiffAll: true})).toEqual({
			out: 'a.file\n',
			err: ' ❌ Expected all files to change, but 2 files were not changed\n\n',
			exit: 1,
		});
	});

	test('is not met when no file is found', async () => {
		const result = await rr('o', 'x', {includeGlob: ['nope.file'], expectDiffAll: true});
		expect(result.err).toContain(' ❌ Expected a diff, but nothing was changed');
		expect(result.exit).toBe(1);
	});

	test('says would with --simulate', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'bar');
		const config = {includeGlob: ['*.file'], expectDiffAll: true, simulate: true};
		expect((await rr('o', 'x', config)).err).toBe(
			' ❌ Expected all files to change, but 1 file would not change\n\n'
		);
	});
});
