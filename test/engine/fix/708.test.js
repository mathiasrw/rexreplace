// https://github.com/mathiasrw/rexreplace/issues/708
// All files were in work at the same time, so with many files the memory filled up and files failed with `EMFILE: too many open files`.
import {describe, test, expect, spyOn} from 'bun:test';
import fs from 'fs';
import os from 'os';
import {rr} from '../../helper.js';

const workers = Math.max(16, os.availableParallelism() * 2);

describe('#708 the number of files in work at the same time is limited', () => {
	test('all files are changed when there are more files than workers', async () => {
		const names = Array.from({length: workers * 3}, (_, i) => `file-${i}.txt`);
		names.forEach(name => fs.writeFileSync(name, 'foo'));
		const result = await rr('o', 'x', {includeGlob: ['*.txt'], voidAsync: false});
		expect(result.err).toBe('');
		expect(result.out.split('\n').sort()).toEqual(['', ...names].sort());
		for (const name of names) {
			expect(fs.readFileSync(name, 'utf8')).toBe('fxx');
		}
	});

	test(`at most ${workers} files are read at the same time`, async () => {
		const names = Array.from({length: workers * 3}, (_, i) => `file-${i}.txt`);
		names.forEach(name => fs.writeFileSync(name, 'foo'));
		const readFile = fs.promises.readFile;
		let reading = 0;
		let mostReading = 0;
		const spy = spyOn(fs.promises, 'readFile').mockImplementation(async (...args) => {
			mostReading = Math.max(mostReading, ++reading);
			try {
				return await readFile(...args);
			} finally {
				reading--;
			}
		});

		try {
			await rr('o', 'x', {includeGlob: ['*.txt'], voidAsync: false});
		} finally {
			spy.mockRestore();
		}

		expect(mostReading).toBeGreaterThan(1);
		expect(mostReading).toBeLessThanOrEqual(workers);
	});

	test('the number of CPU cores is not asked for with 16 files or fewer', async () => {
		const names = Array.from({length: 16}, (_, i) => `file-${i}.txt`);
		names.forEach(name => fs.writeFileSync(name, 'foo'));
		const spy = spyOn(os, 'availableParallelism');
		try {
			await rr('o', 'x', {includeGlob: ['*.txt'], voidAsync: false});
			expect(spy).not.toHaveBeenCalled();
		} finally {
			spy.mockRestore();
		}
	});

	test('one file is handled in the synchronous flow', async () => {
		fs.writeFileSync('my.file', 'foo');
		const result = await rr('o', 'x', {
			includeGlob: ['my.file'],
			voidAsync: false,
			verbose: true,
		});
		expect(result.err).toContain('Open sync: my.file');
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxx');
	});

	test('a file that can not be read gives an error in the synchronous flow, and the run goes on', async () => {
		fs.writeFileSync('locked.file', 'foo');
		fs.writeFileSync('my.file', 'foo');
		fs.chmodSync('locked.file', 0);

		const result = await rr('o', 'x', {
			includeGlob: ['locked.file', 'my.file'],
			voidAsync: true,
		});

		expect(result.out).toBe('my.file\n');
		expect(result.err).toContain('EACCES');
		expect(result.exit).toBe(2);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxx');
	});
});
