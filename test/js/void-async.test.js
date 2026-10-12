import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr, until} from './helper.js';

// Note that rr() from the helper sets voidAsync per default, so the async flow is `voidAsync: false`

describe('--void-async', () => {
	test('has the file changed when the engine returns', () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = rr('o', 'x', {includeGlob: ['my.file'], voidAsync: true});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
		expect(result.err).toBe('my.file \n');
	});

	test('is not the default: the file is changed later', async () => {
		fs.writeFileSync('my.file', 'foobar');
		rr('o', 'x', {includeGlob: ['my.file'], voidAsync: false, quiet: true});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
		await until(() => 'fxxbar' === fs.readFileSync('my.file', 'utf8'));
	});

	test('handles the files one by one in alphabetical order', () => {
		['c', 'a', 'd', 'b'].forEach((name) => fs.writeFileSync(name + '.file', 'foo'));
		const result = rr('o', 'x', {includeGlob: ['*.file'], voidAsync: true});
		expect(result.err).toBe('a.file \nb.file \nc.file \nd.file \n');
	});

	test('leaves no temporary files behind', async () => {
		fs.writeFileSync('my.file', 'foobar');
		rr('o', 'x', {includeGlob: ['my.file'], voidAsync: true});
		expect(fs.readdirSync('.')).toEqual(['my.file']);

		rr('x', 'o', {includeGlob: ['my.file'], voidAsync: false, quiet: true});
		await until(
			() =>
				'foobar' === fs.readFileSync('my.file', 'utf8') && 1 === fs.readdirSync('.').length
		);
	});

	test('does not write a file where nothing was replaced', () => {
		fs.writeFileSync('my.file', 'foobar');
		const longAgo = new Date('2001-02-03T04:05:06Z');
		fs.utimesSync('my.file', longAgo, longAgo);
		rr('nope', 'x', {includeGlob: ['my.file'], voidAsync: true});
		expect(fs.statSync('my.file').mtime).toEqual(longAgo);
	});

	describe('combined', () => {
		test('with --verbose it tells that the file is opened sync', () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {includeGlob: ['my.file'], verbose: true, voidAsync: true};
			expect(rr('o', 'x', config).err).toContain('Open sync: my.file');
		});

		test('with --keep-backup', () => {
			fs.writeFileSync('my.file', 'foobar');
			rr('o', 'x', {includeGlob: ['my.file'], voidAsync: true, keepBackup: true});
			const [backup, file] = fs.readdirSync('.').sort().reverse();
			expect(fs.readFileSync(file, 'utf8')).toBe('fxxbar');
			expect(fs.readFileSync(backup, 'utf8')).toBe('foobar');
		});

		test.each(['output', 'outputMatch'])(
			'is forced by --%s on several files to keep the order',
			(flag) => {
				['b', 'c', 'a'].forEach((name) => fs.writeFileSync(name + '.file', name + '\n'));
				const config = {includeGlob: ['*.file'], voidAsync: false, [flag]: true};
				expect(rr('[abc]', '$&', config).out).toBe('a\nb\nc\n');
			}
		);

		test('with --replacement-js and several files', () => {
			['a', 'b', 'c'].forEach((name) => fs.writeFileSync(name + '.file', 'foo'));
			rr('foo', 'name + name', {
				includeGlob: ['*.file'],
				voidAsync: true,
				replacementJs: true,
			});
			expect(['a', 'b', 'c'].map((name) => fs.readFileSync(name + '.file', 'utf8'))).toEqual([
				'aa',
				'bb',
				'cc',
			]);
		});
	});
});
