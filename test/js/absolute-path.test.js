import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import path from 'path';
import {rr} from './helper.js';

describe('--absolute-path', () => {
	test('prints the full path of each changed file', async () => {
		fs.mkdirSync('docs');
		fs.writeFileSync('docs/a.md', 'foo');
		const result = await rr('o', 'x', {
			includeGlob: ['docs/*.md'],
			absolutePath: true,
		});
		expect(result.out).toBe(path.normalize(path.join(process.cwd(), 'docs/a.md')) + '\n');
		expect(result.err).toBe('');
		expect(fs.readFileSync('docs/a.md', 'utf8')).toBe('fxx');
	});

	test('is not the default: the path is printed the way it was given', async () => {
		fs.mkdirSync('docs');
		fs.writeFileSync('docs/a.md', 'foo');
		const result = await rr('o', 'x', {includeGlob: ['docs/*.md']});
		expect(result.out).toBe('docs/a.md\n');
		expect(result.err).toBe('');
	});

	test('still respects --quiet', async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect(
			await rr('o', 'x', {includeGlob: ['my.file'], absolutePath: true, quiet: true})
		).toEqual({out: '', err: '', exit: null});
	});

	test('works with --null', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const full = path.normalize(path.join(process.cwd(), 'my.file'));
		const result = await rr('o', 'x', {
			includeGlob: ['my.file'],
			absolutePath: true,
			null: true,
		});
		expect(result.out).toBe(full + '\0');
	});

	test('works with --name-delimiter on several files', async () => {
		['a', 'b'].forEach((name) => fs.writeFileSync(name + '.file', 'foo'));
		const a = path.normalize(path.join(process.cwd(), 'a.file'));
		const b = path.normalize(path.join(process.cwd(), 'b.file'));
		const result = await rr('o', 'x', {
			includeGlob: ['*.file'],
			absolutePath: true,
			nameDelimiter: '|',
		});
		expect(result.out).toBe(a + '|' + b);
	});
});
