// CLI-level coverage for changed file names on stdout, --null/-0 and --name-delimiter.
import {describe, test, expect} from 'bun:test';
import {spawnSync} from 'child_process';
import fs from 'fs';
import path from 'path';

const cli = path.join(import.meta.dir, '../../src/cli.ts');

function run(...args) {
	const {stdout, stderr, status} = spawnSync(process.execPath, [cli, ...args], {
		input: '',
		encoding: 'utf8',
	});
	return {out: stdout, err: stderr, exit: status};
}

describe('changed file names on stdout (CLI)', () => {
	test('prints each changed file name on stdout', () => {
		fs.writeFileSync('my.file', 'foobar');
		expect(run('o', 'x', 'my.file')).toEqual({out: 'my.file\n', err: '', exit: 0});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
	});

	test('keeps verbose chat on stderr and names on stdout', () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = run('o', 'x', 'my.file', '--verbose');
		expect(result.out).toBe('my.file\n');
		expect(result.err).toContain('files found');
		expect(result.err).toContain('Open');
		expect(result.err).not.toContain('my.file\n');
		expect(result.exit).toBe(0);
	});

	test('--output keeps the result on stdout and no file name', () => {
		fs.writeFileSync('my.file', 'foobar');
		expect(run('o', 'x', 'my.file', '--output')).toEqual({
			out: 'fxxbar',
			err: '',
			exit: 0,
		});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
	});

	test('--quiet suppresses the names', () => {
		fs.writeFileSync('my.file', 'foobar');
		expect(run('o', 'x', 'my.file', '--quiet')).toEqual({out: '', err: '', exit: 0});
	});
});

describe('--absolute-path / -a (CLI)', () => {
	test('prints the full path', () => {
		fs.mkdirSync('docs');
		fs.writeFileSync('docs/a.md', 'foo');
		const full = path.normalize(path.join(process.cwd(), 'docs/a.md'));
		expect(run('o', 'x', 'docs/*.md', '--absolute-path')).toEqual({
			out: full + '\n',
			err: '',
			exit: 0,
		});
	});

	test('-a is an alias', () => {
		fs.writeFileSync('my.file', 'foobar');
		const full = path.normalize(path.join(process.cwd(), 'my.file'));
		expect(run('o', 'x', 'my.file', '-a')).toEqual({out: full + '\n', err: '', exit: 0});
	});

	test('default still prints the path as given', () => {
		fs.mkdirSync('docs');
		fs.writeFileSync('docs/a.md', 'foo');
		expect(run('o', 'x', 'docs/*.md').out).toBe('docs/a.md\n');
	});
});

describe('--null / -0 (CLI)', () => {
	test('ends names with NUL', () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		// --void-async keeps alphabetical name order
		expect(run('o', 'x', '*.file', '--null', '--void-async')).toEqual({
			out: 'a.file\0b.file\0',
			err: '',
			exit: 0,
		});
	});

	test('-0 is an alias for --null', () => {
		fs.writeFileSync('my.file', 'foobar');
		expect(run('o', 'x', 'my.file', '-0')).toEqual({out: 'my.file\0', err: '', exit: 0});
	});
});

describe('--name-delimiter (CLI)', () => {
	test('puts the delimiter between names', () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		expect(run('o', 'x', '*.file', '--name-delimiter', ', ', '--void-async')).toEqual({
			out: 'a.file, b.file',
			err: '',
			exit: 0,
		});
	});

	test('understands escape sequences and § like the replacement', () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		expect(run('o', 'x', '*.file', '--name-delimiter', '\\t', '--void-async').out).toBe(
			'a.file\tb.file'
		);
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		expect(run('o', 'x', '*.file', '--name-delimiter', '§t', '--void-async').out).toBe(
			'a.file\tb.file'
		);
		// § from a unicode escape is turned into \ after unescaping (same as replacement)
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		expect(run('o', 'x', '*.file', '--name-delimiter', '\\u00a7', '--void-async').out).toBe(
			'a.file\\b.file'
		);
	});

	test('understands € as $ unless --void-euro', () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		expect(run('o', 'x', '*.file', '--name-delimiter', '€', '--void-async').out).toBe(
			'a.file$b.file'
		);
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		expect(
			run('o', 'x', '*.file', '--name-delimiter', '€', '--void-euro', '--void-async').out
		).toBe('a.file€b.file');
	});

	test('rejects an invalid escape sequence', () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = run('o', 'x', 'my.file', '--name-delimiter', '\\x4');
		expect(result.out).toBe('');
		expect(result.err).toContain('Invalid escape sequence in --name-delimiter');
		expect(result.exit).toBe(1);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
	});

	test('conflicts with --null', () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = run('o', 'x', 'my.file', '--null', '--name-delimiter', ',');
		expect(result.exit).not.toBe(0);
		expect(result.err.length).toBeGreaterThan(0);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
	});
});
