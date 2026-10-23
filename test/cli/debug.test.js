import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {$} from 'bun';
import {cli, sh} from '../helper.js';

describe('--debug', () => {
	test.each(['--debug', '-d'])(
		'%s prints only the status report, with what went into the engine and what it did',
		async flag => {
			fs.writeFileSync('my.file', 'foobar');
			const result = await sh($`bun ${cli} o x my.file ${flag}`);
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

	test('still prints the result of --output before the status report', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await sh($`bun ${cli} o x my.file --debug --output`);
		expect(result.out.startsWith('fxxbar\n\n{')).toBe(true);
		expect(JSON.parse(result.out.slice('fxxbar\n'.length)).files.updated).toEqual(['my.file']);
	});

	test('gives the errors in the status report, and the exit code 1', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.chmodSync('a.file', 0);
		const result = await sh($`bun ${cli} o x a.file --debug`);
		expect(result.err).toBe('');
		expect(result.exit).toBe(1);
		expect(JSON.parse(result.out).errors[0]).toContain('EACCES');
	});

	test('gives the error of an invalid pattern in the status report', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await sh($`bun ${cli} '(' x my.file --debug`);
		expect(result.err).toBe('');
		expect(result.exit).toBe(1);
		expect(JSON.parse(result.out).errors[0]).toContain('Invalid regular expression');
	});
});
