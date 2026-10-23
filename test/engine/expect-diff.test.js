import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('--expect-diff', () => {
	test('is met when a file is changed', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'bar');
		expect(await rr('o', 'x', {includeGlob: ['*.file'], expectDiff: true})).toEqual({
			out: 'a.file\n',
			err: '',
			exit: null,
		});
	});

	test('is not met when nothing is changed', async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect(await rr('nope', 'x', {includeGlob: ['my.file'], expectDiff: true})).toEqual({
			out: '',
			err: ' ❌ Expected a diff, but nothing was changed\n\n',
			exit: 1,
		});
	});

	test('is not met when no file is found', async () => {
		expect((await rr('o', 'x', {includeGlob: ['nope.file'], expectDiff: true})).exit).toBe(1);
	});

	test('says would with --simulate', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const config = {includeGlob: ['my.file'], expectDiff: true, simulate: true};
		expect((await rr('nope', 'x', config)).err).toBe(
			' ❌ Expected a diff, but nothing would change\n\n'
		);
	});

	test('a match that gives the same text is not a diff', async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect((await rr('o', 'o', {includeGlob: ['my.file'], expectDiff: true})).exit).toBe(1);
	});

	test('piped data counts as one file', async () => {
		expect(await rr('o', 'x', {pipedData: 'foo', expectDiff: true})).toEqual({
			out: 'fxx',
			err: '',
			exit: null,
		});
		expect((await rr('z', 'x', {pipedData: 'foo', expectDiff: true})).exit).toBe(1);
	});

	test('a rename is a diff', async () => {
		fs.writeFileSync('a.md', 'foo');
		const config = {includeGlob: ['a.md'], rename: true, expectDiff: true};
		expect((await rr('md', 'txt', config)).exit).toBe(null);
	});
});
