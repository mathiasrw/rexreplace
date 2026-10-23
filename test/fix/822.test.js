// https://github.com/mathiasrw/rexreplace/issues/822
// --js code that threw something that is not an error crashed the error handling, or gave an empty message.
import {describe, test, expect} from 'bun:test';
import {rr} from '../helper.js';

const failed = text =>
	` ❌ The code of --js failed for the piped data: ${text}\n    No further processing.\n\n`;

describe('#822 code that throws something that is not an error', () => {
	test.each([
		['throw Object.create(null)', 'an object was thrown'],
		['throw {code: 42}', 'an object was thrown: {"code":42}'],
		['throw ""', 'an empty string was thrown'],
		['throw 7', '7'],
		[
			'const e = new TypeError("x"); Object.defineProperty(e, "message", {get() { throw 1; }}); throw e',
			'a TypeError was thrown',
		],
	])('%s gives a message, and not a crash', async (code, text) => {
		expect(await rr('o', code, {pipedData: 'foo', replacementJs: true})).toEqual({
			out: '',
			err: failed(text),
			exit: 3,
		});
	});

	test('only tells the start of a big object', async () => {
		const result = await rr('o', 'throw {text: "y".repeat(1000)}', {
			pipedData: 'foo',
			replacementJs: true,
		});
		expect(result.err).toContain('an object was thrown: {"text":"' + 'y'.repeat(291) + '…');
		expect(result.err.length).toBeLessThan(400);
	});
});
