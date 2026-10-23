// https://github.com/mathiasrw/rexreplace/issues/813
// When a file failed in the middle of a run, the CLI ended while other files were halfway written, and they were left only as .backup.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {$} from 'bun';
import {cli, sh} from '../helper.js';

describe('#813 a run that stops', () => {
	test('finishes the files in work, so none is left only as a backup', async () => {
		const names = Array.from({length: 200}, (_, i) => `b${String(i).padStart(3, '0')}.txt`);
		names.forEach(name => fs.writeFileSync(name, 'foo'));
		const code = "if (filename === 'b050.txt') throw new Error('boom'); 'bar'";
		const result = await sh($`bun ${cli} foo ${code} 'b*.txt' --js`);
		expect(result.exit).toBe(3);
		expect(fs.readdirSync('.').sort()).toEqual(names);
		expect(fs.readFileSync('b050.txt', 'utf8')).toBe('foo');
	});
});
