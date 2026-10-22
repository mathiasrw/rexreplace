import {describe, test, expect} from 'bun:test';
import {spawnSync} from 'child_process';
import fs from 'fs';
import path from 'path';
import {rr} from './helper.js';

// --bail is a CLI alias for --halt, so these cases run the CLI itself (like test/js/fix/691.test.js).
const cli = path.join(import.meta.dir, '../../src/cli.ts');

function runCli(...args) {
	const {stdout, stderr, status} = spawnSync(process.execPath, [cli, ...args], {
		input: '',
		encoding: 'utf8',
	});
	return {out: stdout, err: stderr, exit: status};
}

describe('--halt', () => {
	// a.file can not be read, and the files are handled in the order of the list
	function lockedFirst() {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		fs.chmodSync('a.file', 0);
		return {includeGlob: ['a.file', 'b.file']};
	}

	test('stops the process on the first error', async () => {
		const result = await rr('o', 'x', {...lockedFirst(), halt: true});
		expect(result.err).toContain('EACCES');
		expect(result.exit).toBe(1);
		expect(fs.readFileSync('b.file', 'utf8')).toBe('foo');
	});

	test('is not the default, so the other files are still handled', async () => {
		const result = await rr('o', 'x', lockedFirst());
		expect(result.err).toContain('EACCES');
		expect(result.exit).toBe(1);
		expect(fs.readFileSync('b.file', 'utf8')).toBe('fxx');
	});

	test('changes nothing when all goes well', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('o', 'x', {includeGlob: ['my.file'], halt: true});
		expect(result).toEqual({out: 'my.file\n', err: '', exit: null});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
	});

	test('stops with a number as exit code', async () => {
		expect((await rr('o', 'x', {includeGlob: ['nope.file'], halt: true})).exit).toBe(1);
		expect((await rr('(', 'x', {pipedData: 'foobar', halt: true})).exit).toBe(1);
	});

	describe('--bail alias', () => {
		test('is listed in --help with --halt', () => {
			const result = runCli('--help');
			expect(result.exit).toBe(0);
			expect(result.out).toContain('--bail');
			expect(result.out).toMatch(/-H,\s*--halt,\s*--bail/);
		});

		test.each(['--bail', '--halt', '-H'])('%s stops on the first error like --halt', (flag) => {
			const result = runCli('o', 'x', 'nope.file', flag);
			expect(result.err).toContain('0 files found');
			expect(result.exit).toBe(1);
		});

		test('--bail is accepted and changes nothing when all goes well', () => {
			fs.writeFileSync('my.file', 'foobar');
			const result = runCli('o', 'x', 'my.file', '--bail');
			expect(result.exit).toBe(0);
			expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
		});
	});

	describe('combined', () => {
		test.each(['quiet', 'quietTotal'])('with --%s it still stops', async (flag) => {
			const result = await rr('o', 'x', {
				includeGlob: ['nope.file'],
				halt: true,
				[flag]: true,
			});
			expect(result.exit).not.toBe(null);
		});

		test('with an invalid pattern it stops with or without it', async () => {
			expect((await rr('(', 'x', {pipedData: 'foobar', halt: true})).exit).not.toBe(null);
			expect((await rr('(', 'x', {pipedData: 'foobar'})).exit).toBe(1);
		});

		test('with piped data and several flags when all goes well', async () => {
			const config = {
				pipedData: 'Foo foo',
				halt: true,
				voidIgnoreCase: true,
				voidGlobal: true,
			};
			expect(await rr('f', 'x', config)).toEqual({out: 'Foo xoo', err: '', exit: null});
		});

		test('with --exclude-glob leaving no files', async () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {includeGlob: ['my.file'], excludeGlob: ['*.file'], halt: true};
			expect((await rr('o', 'x', config)).exit).not.toBe(null);
			expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
		});
	});
});
