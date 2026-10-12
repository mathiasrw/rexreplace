import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr, until} from './helper.js';

const backups = (dir = '.') => fs.readdirSync(dir).filter((name) => name.endsWith('.backup'));

describe('--keep-backup', () => {
	test('keeps the original content in a backup file next to the file', () => {
		fs.writeFileSync('my.file', 'foobar');
		rr('o', 'x', {includeGlob: ['my.file'], keepBackup: true});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
		expect(backups()).toHaveLength(1);
		expect(fs.readFileSync(backups()[0], 'utf8')).toBe('foobar');
	});

	test('names the backup after the file and the time', () => {
		fs.writeFileSync('my.file', 'foobar');
		rr('o', 'x', {includeGlob: ['my.file'], keepBackup: true});
		expect(backups()[0]).toMatch(/^my\.file\.\d{4}-\d\d-\d\dT\d\d_\d\d_\d\d\.\d{3}\.backup$/);
	});

	test('is not the default', () => {
		fs.writeFileSync('my.file', 'foobar');
		rr('o', 'x', {includeGlob: ['my.file']});
		expect(fs.readdirSync('.')).toEqual(['my.file']);
	});

	test('makes no backup of a file where nothing was replaced', () => {
		fs.writeFileSync('my.file', 'foobar');
		rr('nope', 'x', {includeGlob: ['my.file'], keepBackup: true});
		expect(fs.readdirSync('.')).toEqual(['my.file']);
	});

	test('makes a backup of each file that was changed', () => {
		fs.mkdirSync('sub');
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'bar');
		fs.writeFileSync('sub/c.file', 'foo');
		rr('foo', 'x', {includeGlob: ['**/*.file'], keepBackup: true});
		expect(backups().map((name) => name.slice(0, 7))).toEqual(['a.file.']);
		expect(backups('sub').map((name) => name.slice(0, 7))).toEqual(['c.file.']);
		expect(fs.readFileSync('sub/' + backups('sub')[0], 'utf8')).toBe('foo');
	});

	test('keeps the exact bytes of the original', () => {
		const bytes = Buffer.from(Array.from({length: 256}, (_, i) => i));
		fs.writeFileSync('my.file', bytes);
		rr('a', 'x', {includeGlob: ['my.file'], keepBackup: true});
		expect(fs.readFileSync(backups()[0])).toEqual(bytes);
	});

	describe('combined', () => {
		test('with the async flow', async () => {
			fs.writeFileSync('my.file', 'foobar');
			rr('o', 'x', {
				includeGlob: ['my.file'],
				keepBackup: true,
				voidAsync: false,
				quiet: true,
			});
			await until(() => 'fxxbar' === fs.readFileSync('my.file', 'utf8'));
			expect(fs.readFileSync(backups()[0], 'utf8')).toBe('foobar');
		});

		test.each(['output', 'outputMatch'])('with --%s there is nothing to back up', (flag) => {
			fs.writeFileSync('my.file', 'foobar');
			rr('o', 'x', {includeGlob: ['my.file'], keepBackup: true, [flag]: true});
			expect(fs.readdirSync('.')).toEqual(['my.file']);
		});

		test('with --replacement-js', () => {
			fs.writeFileSync('my.file', 'foobar');
			rr('foo', 'name', {includeGlob: ['my.file'], keepBackup: true, replacementJs: true});
			expect(fs.readFileSync('my.file', 'utf8')).toBe('mybar');
			expect(fs.readFileSync(backups()[0], 'utf8')).toBe('foobar');
		});

		test('with --exclude-glob the backups are easy to keep out of the next run', async () => {
			fs.writeFileSync('my.file', 'foobar');
			rr('o', 'x', {includeGlob: ['my.*'], keepBackup: true});
			// The time in the name of the backup is in milliseconds
			await new Promise((resolve) => setTimeout(resolve, 5));
			rr('x', 'y', {includeGlob: ['my.*'], excludeGlob: ['*.backup'], keepBackup: true});
			expect(fs.readFileSync('my.file', 'utf8')).toBe('fyybar');
			expect(
				backups()
					.map((name) => fs.readFileSync(name, 'utf8'))
					.sort()
			).toEqual(['foobar', 'fxxbar']);
		});

		test('with --quiet-total', () => {
			fs.writeFileSync('my.file', 'foobar');
			const result = rr('o', 'x', {
				includeGlob: ['my.file'],
				keepBackup: true,
				quietTotal: true,
			});
			expect(result.err).toBe('');
			expect(backups()).toHaveLength(1);
		});
	});
});
