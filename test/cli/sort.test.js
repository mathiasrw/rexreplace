// With --sort the files are handled one at a time, so the names are printed in the order of the sort
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {$} from 'bun';
import {cli, sh} from '../helper.js';

describe('--sort', () => {
	test('prints the names in the order of the sort, also with many files', async () => {
		const names = Array.from({length: 40}, (_, i) => `file${i}.md`);
		// The first name gets the largest file, so the order by size is the other way
		names.forEach((name, i) => fs.writeFileSync(name, 'o'.repeat(40 - i)));
		const result = await sh($`bun ${cli} o x '*.md' --sort size`);
		expect(result.out).toBe([...names].reverse().join('\n') + '\n');
	});

	test('must have a value', async () => {
		fs.writeFileSync('a.md', 'foo');
		const result = await sh($`bun ${cli} o x a.md --sort`);
		expect(result.exit).toBe(3);
		expect(fs.readFileSync('a.md', 'utf8')).toBe('foo');
	});
});
