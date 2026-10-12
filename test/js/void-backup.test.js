import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr, until} from './helper.js';

// Note that --void-backup always writes asynchronously, so these tests wait for the file with until()

describe('--void-backup', () => {
	test('writes straight to the file', async () => {
		fs.writeFileSync('my.file', 'foobar');
		rr('o', 'x', {includeGlob: ['my.file'], voidBackup: true, quiet: true});
		await until(() => 'fxxbar' === fs.readFileSync('my.file', 'utf8'));
		expect(fs.readdirSync('.')).toEqual(['my.file']);
	});

	test('does not write a file where nothing was replaced', () => {
		fs.writeFileSync('my.file', 'foobar');
		const longAgo = new Date('2001-02-03T04:05:06Z');
		fs.utimesSync('my.file', longAgo, longAgo);
		rr('nope', 'x', {includeGlob: ['my.file'], voidBackup: true});
		expect(fs.statSync('my.file').mtime).toEqual(longAgo);
	});

	test('handles several files', async () => {
		['a', 'b', 'c'].forEach((name) => fs.writeFileSync(name + '.file', 'foo' + name));
		rr('foo', 'x', {includeGlob: ['*.file'], voidBackup: true, quiet: true});
		await until(
			() =>
				'xaxbxc' ===
				['a', 'b', 'c'].map((name) => fs.readFileSync(name + '.file', 'utf8')).join('')
		);
	});

	describe('combined', () => {
		test.each([true, false])('with --void-async set to %p', async (voidAsync) => {
			fs.writeFileSync('my.file', 'foobar');
			rr('o', 'x', {includeGlob: ['my.file'], voidBackup: true, voidAsync, quiet: true});
			await until(() => 'fxxbar' === fs.readFileSync('my.file', 'utf8'));
			expect(fs.readdirSync('.')).toEqual(['my.file']);
		});

		test('with --keep-backup there is still no backup', async () => {
			fs.writeFileSync('my.file', 'foobar');
			rr('o', 'x', {
				includeGlob: ['my.file'],
				voidBackup: true,
				keepBackup: true,
				quiet: true,
			});
			await until(() => 'fxxbar' === fs.readFileSync('my.file', 'utf8'));
			expect(fs.readdirSync('.')).toEqual(['my.file']);
		});

		test('with --output the file is left alone', () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {includeGlob: ['my.file'], voidBackup: true, output: true};
			expect(rr('o', 'x', config).out).toBe('fxxbar');
			expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
		});

		test('with --replacement-js', async () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {
				includeGlob: ['my.file'],
				voidBackup: true,
				replacementJs: true,
				quiet: true,
			};
			rr('foo', 'filename', config);
			await until(() => 'my.filebar' === fs.readFileSync('my.file', 'utf8'));
		});
	});
});
