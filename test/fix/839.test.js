// https://github.com/mathiasrw/rexreplace/issues/839
// When the reader of a pipe stopped early, like head, the run crashed with EPIPE and a stack trace.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {$} from 'bun';
import {cli, sh} from '../helper.js';

describe('#839 a pipe the reader closes early', () => {
	test('ends the run as usual, with no error', async () => {
		fs.writeFileSync('big.txt', Array.from({length: 200000}, (_, i) => `${i} foo`).join('\n'));
		expect(await sh($`bun ${cli} foo bar big.txt -o | head -1`)).toEqual({
			out: '0 bar\n',
			err: 'big.txt\n',
			exit: 0,
		});
	});

	test('also when the status report comes after the reader is gone', async () => {
		fs.writeFileSync('big.txt', Array.from({length: 200000}, (_, i) => `${i} foo`).join('\n'));
		const result = await sh($`bun ${cli} foo bar big.txt -o -d | head -1`);
		expect(result.out).toBe('0 bar\n');
		expect(result.err).toBe('');
	});
});
