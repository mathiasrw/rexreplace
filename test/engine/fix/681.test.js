// https://github.com/mathiasrw/rexreplace/issues/681
// `--halt` used the error message as exit code: Node 18 exited with 0, newer Node versions crashed with ERR_INVALID_ARG_TYPE.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../../helper.js';

describe('#681 --halt exits with a numeric non-zero code', () => {
	test('a file that can not be read', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.chmodSync('a.file', 0);
		const result = await rr('o', 'x', {includeGlob: ['a.file'], halt: true});
		expect(result.err).toContain('EACCES');
		expect(result.exit).toBe(3);
	});

	test('invalid regular expression', async () => {
		const result = await rr('(', 'x', {pipedData: 'foobar', halt: true});
		expect(result.err).toContain('Invalid regular expression');
		expect(result.exit).toBe(3);
	});

	test('--quiet-total still halts with the exit code but shows no message', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.chmodSync('a.file', 0);
		const result = await rr('o', 'x', {
			includeGlob: ['a.file'],
			halt: true,
			quietTotal: true,
		});
		expect(result).toEqual({out: '', err: '', exit: 3});
	});
});
