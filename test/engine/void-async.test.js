import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

// Note that rr() from the helper sets voidAsync per default, so the async flow is `voidAsync: false`

describe('--void-async', () => {
	test('is done with a file before the next one is opened', async () => {
		['a', 'b'].forEach(name => fs.writeFileSync(name + '.file', 'foo'));
		const config = {includeGlob: ['*.file'], voidAsync: true, verbose: true};
		const result = await rr('o', 'x', config);
		expect(result.err.trim().split('\n')).toEqual([
			'2 files found',
			'Open sync: a.file',
			'Work on content from: a.file',
			'Write new content to: a.file',
			'Open sync: b.file',
			'Work on content from: b.file',
			'Write new content to: b.file',
		]);
		expect(result.out).toBe('a.file\nb.file\n');
	});

	test('is not the default: all files are opened before the first one is done', async () => {
		['a', 'b'].forEach(name => fs.writeFileSync(name + '.file', 'foo'));
		const config = {includeGlob: ['*.file'], voidAsync: false, verbose: true};
		const result = await rr('o', 'x', config);
		const lines = result.err.split('\n');
		expect(lines.slice(0, 3)).toEqual([
			'2 files found',
			'Open async: a.file',
			'Open async: b.file',
		]);
		// Either file can be read first
		expect(lines[3]).toMatch(/^Work on content from: [ab]\.file$/);
		expect(result.out.split('\n').sort()).toEqual(['', 'a.file', 'b.file']);
		expect(['a', 'b'].map(name => fs.readFileSync(name + '.file', 'utf8'))).toEqual(['fxx', 'fxx']);
	});

	test('handles the files one by one in alphabetical order', async () => {
		['c', 'a', 'd', 'b'].forEach(name => fs.writeFileSync(name + '.file', 'foo'));
		const result = await rr('o', 'x', {includeGlob: ['*.file'], voidAsync: true});
		expect(result.out).toBe('a.file\nb.file\nc.file\nd.file\n');
	});

	test('leaves no temporary files behind', async () => {
		fs.writeFileSync('my.file', 'foobar');
		await rr('o', 'x', {includeGlob: ['my.file'], voidAsync: true});
		expect(fs.readdirSync('.')).toEqual(['my.file']);

		await rr('x', 'o', {includeGlob: ['my.file'], voidAsync: false});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
		expect(fs.readdirSync('.')).toEqual(['my.file']);
	});

	test('does not write a file where nothing was replaced', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const longAgo = new Date('2001-02-03T04:05:06Z');
		fs.utimesSync('my.file', longAgo, longAgo);
		await rr('nope', 'x', {includeGlob: ['my.file'], voidAsync: true});
		expect(fs.statSync('my.file').mtime).toEqual(longAgo);
	});

	describe('combined', () => {
		test('with --verbose it tells that the file is opened sync', async () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {includeGlob: ['my.file'], verbose: true, voidAsync: true};
			expect((await rr('o', 'x', config)).err).toContain('Open sync: my.file');
		});

		test('with --keep-backup', async () => {
			fs.writeFileSync('my.file', 'foobar');
			await rr('o', 'x', {includeGlob: ['my.file'], voidAsync: true, keepBackup: true});
			const [backup, file] = fs.readdirSync('.').sort().reverse();
			expect(fs.readFileSync(file, 'utf8')).toBe('fxxbar');
			expect(fs.readFileSync(backup, 'utf8')).toBe('foobar');
		});

		test.each(['output', 'outputMatch'])(
			'is forced by --%s on several files to keep the order',
			async flag => {
				['b', 'c', 'a'].forEach(name => fs.writeFileSync(name + '.file', name + '\n'));
				const config = {includeGlob: ['*.file'], voidAsync: false, [flag]: true};
				expect((await rr('[abc]', '$&', config)).out).toBe('a\nb\nc\n');
			}
		);

		test('with --replacement-js and several files', async () => {
			['a', 'b', 'c'].forEach(name => fs.writeFileSync(name + '.file', 'foo'));
			await rr('foo', 'name + name', {
				includeGlob: ['*.file'],
				voidAsync: true,
				replacementJs: true,
			});
			expect(['a', 'b', 'c'].map(name => fs.readFileSync(name + '.file', 'utf8'))).toEqual([
				'aa',
				'bb',
				'cc',
			]);
		});
	});
});
