// https://github.com/mathiasrw/rexreplace/issues/808
// When the code of --js failed, the stack trace showed all the code put in front of the code of the user.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr, rrStatus} from '../helper.js';

const failed = (where, message) =>
	` ❌ The code of --js failed for ${where}\n    ${message}\n    No further processing.\n\n`;

describe('#808 code of --js that fails', () => {
	test('stops the run with only the message', async () => {
		expect(await rr('o', 'nope()', {pipedData: 'foo', replacementJs: true})).toEqual({
			out: '',
			err: failed('the piped data', 'ReferenceError: nope is not defined'),
			exit: 3,
		});
	});

	test('tells a syntax error the same way', async () => {
		const result = await rr('o', '1 +', {pipedData: 'foo', replacementJs: true});
		expect(result.err).toStartWith(
			' ❌ The code of --js failed for the piped data\n    SyntaxError'
		);
		expect(result.exit).toBe(3);
	});

	test('tells the file, also when the code runs once per match, and changes nothing', async () => {
		fs.writeFileSync('my.file', 'foo');
		const config = {includeGlob: ['my.file'], replacementJs: true};
		expect((await rr('(o)', 'nope($1)', config)).err).toBe(
			failed('my.file', 'ReferenceError: nope is not defined')
		);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foo');
	});

	test('stops the run in the async flow too', async () => {
		const names = Array.from({length: 20}, (_, i) => `file${i}.txt`);
		names.forEach(name => fs.writeFileSync(name, 'foo'));
		const result = await rr('o', 'nope()', {
			includeGlob: ['*.txt'],
			replacementJs: true,
			voidAsync: false,
		});
		expect(result.err).toContain('ReferenceError: nope is not defined');
		expect(result.exit).toBe(3);
	});

	test('is in the errors of the status report', async () => {
		const status = await rrStatus('o', 'nope()', {pipedData: 'foo', replacementJs: true});
		expect(status.errors).toEqual([
			'The code of --js failed for the piped data\n    ReferenceError: nope is not defined',
		]);
	});
});
