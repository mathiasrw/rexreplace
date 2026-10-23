import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {cli} from '../helper.js';

describe('--halt', () => {
	describe('--bail alias', () => {
		test('is listed in --help with --halt', async () => {
			const result = await cli(['--help']);
			expect(result.exit).toBe(0);
			expect(result.out).toMatch(/-H,\s*--halt,\s*--bail/);
		});

		test.each(['--bail', '--halt', '-H'])('%s stops on the first error like --halt', async flag => {
			const result = await cli(['o', 'x', 'nope.file', flag]);
			expect(result.err).toContain('0 files found');
			expect(result.exit).toBe(1);
		});

		test('--bail is accepted and changes nothing when all goes well', async () => {
			fs.writeFileSync('my.file', 'foobar');
			expect((await cli(['o', 'x', 'my.file', '--bail'])).exit).toBe(0);
			expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
		});
	});
});
