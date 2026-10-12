import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from './helper.js';

describe('--void-backup', () => {
	test('writes straight to the file', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('o', 'x', {includeGlob: ['my.file'], voidBackup: true});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
		expect(fs.readdirSync('.')).toEqual(['my.file']);
		expect(result.err).toBe('my.file \n');
	});

	test('does not write a file where nothing was replaced', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const longAgo = new Date('2001-02-03T04:05:06Z');
		fs.utimesSync('my.file', longAgo, longAgo);
		await rr('nope', 'x', {includeGlob: ['my.file'], voidBackup: true});
		expect(fs.statSync('my.file').mtime).toEqual(longAgo);
	});

	test('handles several files', async () => {
		['a', 'b', 'c'].forEach((name) => fs.writeFileSync(name + '.file', 'foo' + name));
		await rr('foo', 'x', {includeGlob: ['*.file'], voidBackup: true});
		expect(['a', 'b', 'c'].map((name) => fs.readFileSync(name + '.file', 'utf8'))).toEqual([
			'xa',
			'xb',
			'xc',
		]);
	});

	describe('combined', () => {
		test.each([true, false])('with --void-async set to %p', async (voidAsync) => {
			fs.writeFileSync('my.file', 'foobar');
			await rr('o', 'x', {includeGlob: ['my.file'], voidBackup: true, voidAsync});
			expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
			expect(fs.readdirSync('.')).toEqual(['my.file']);
		});

		test('with --keep-backup there is still no backup', async () => {
			fs.writeFileSync('my.file', 'foobar');
			await rr('o', 'x', {includeGlob: ['my.file'], voidBackup: true, keepBackup: true});
			expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
			expect(fs.readdirSync('.')).toEqual(['my.file']);
		});

		test('with --output the file is left alone', async () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {includeGlob: ['my.file'], voidBackup: true, output: true};
			expect((await rr('o', 'x', config)).out).toBe('fxxbar');
			expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
		});

		test('with --replacement-js', async () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {includeGlob: ['my.file'], voidBackup: true, replacementJs: true};
			await rr('foo', 'filename', config);
			expect(fs.readFileSync('my.file', 'utf8')).toBe('my.filebar');
		});
	});
});
