import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import path from 'path';

// --debug is set by the CLI, so these cases run the CLI itself
const cli = path.join(import.meta.dir, '../../src/cli.ts');

function runCli(...args) {
	const {stdout, stderr, exitCode} = Bun.spawnSync([process.execPath, cli, ...args], {
		stdin: 'ignore',
	});
	return {out: stdout.toString(), err: stderr.toString(), exit: exitCode};
}

describe('--debug', () => {
	test.each(['--debug', '-d'])(
		'%s prints only the status report, with what went into the engine and what it did',
		flag => {
			fs.writeFileSync('my.file', 'foobar');
			const result = runCli('o', 'x', 'my.file', flag);
			expect(result.err).toBe('');
			expect(result.exit).toBe(0);
			expect(result.out.startsWith('\n{')).toBe(true);
			const status = JSON.parse(result.out);
			expect(status.files).toEqual({searched: ['my.file'], updated: ['my.file']});
			expect(status.engine.config).toMatchObject({pattern: 'o', replacement: 'x'});
			expect(status.engine.execution).toEqual({
				search: 'o',
				flags: 'gim',
				replacement: 'x',
				replacementSrc: null,
			});
			expect(status.engine.steps).toEqual([
				'1 files found',
				'Open sync: my.file',
				'Work on content from: my.file',
				'Write new content to: my.file',
			]);
			expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
		}
	);

	test('still prints the result of --output before the status report', () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = runCli('o', 'x', 'my.file', '--debug', '--output');
		expect(result.out.startsWith('fxxbar\n\n{')).toBe(true);
		expect(JSON.parse(result.out.slice('fxxbar\n'.length)).files.updated).toEqual(['my.file']);
	});

	test('gives the errors in the status report, and the exit code 1', () => {
		const result = runCli('o', 'x', 'nope.file', '--debug');
		expect(result.err).toBe('');
		expect(result.exit).toBe(1);
		expect(JSON.parse(result.out).errors).toEqual(['0 files found']);
	});

	test('gives the error of an invalid pattern in the status report', () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = runCli('(', 'x', 'my.file', '--debug');
		expect(result.err).toBe('');
		expect(result.exit).toBe(1);
		expect(JSON.parse(result.out).errors[0]).toContain('Invalid regular expression');
	});
});
