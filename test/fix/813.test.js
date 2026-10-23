// https://github.com/mathiasrw/rexreplace/issues/813
// When a file failed in the middle of a run, the CLI ended while other files were halfway written, and they were left only as .backup.
import {describe, test, expect, spyOn} from 'bun:test';
import fs from 'fs';
import {$} from 'bun';
import {cli, sh, rr, rrStatus} from '../helper.js';
import {engine} from '../../src/engine.ts';

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

	test('tells only the first panic, and keeps the files that fail after it in the status', async () => {
		const names = Array.from({length: 100}, (_, i) => `f${String(i).padStart(3, '0')}.txt`);
		names.forEach(name => fs.writeFileSync(name, 'foo'));
		const config = {includeGlob: ['*.txt'], replacementJs: true, voidAsync: false};
		const result = await rr('foo', 'nope()', config);
		expect(result.err.match(/❌/g)).toHaveLength(1);
		expect(result.exit).toBe(3);
		names.forEach(name => fs.writeFileSync(name, 'foo'));
		expect((await rrStatus('foo', 'nope()', config)).errors.length).toBeGreaterThan(1);
	});

	test('tells the panic of a second run with the same config again (#844)', async () => {
		const config = {
			engine: 'default',
			encoding: 'utf8',
			pipedData: 'foo',
			includeGlob: [],
			excludeGlob: [],
			excludeRe: [],
			pattern: 'o',
			replacement: 'nope()',
			replacementJs: true,
		};
		const spy = spyOn(process.stderr, 'write').mockImplementation(() => true);
		try {
			await expect(engine(config)).rejects.toMatchObject({panic: true});
			spy.mockClear();
			await expect(engine(config)).rejects.toMatchObject({panic: true});
			expect(spy.mock.calls.join('')).toContain('❌');
		} finally {
			spy.mockRestore();
		}
	});
});
