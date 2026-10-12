import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr, random} from '../js/helper.js';

describe('basics', () => {
	test('gives the same as String.replace with the flags gim', () => {
		const rnd = random(1);
		for (let i = 0; i < 500; i++) {
			const pattern = rnd.text('abc.*+?|^$', 1, 4);
			const replacement = rnd.text('xyz &1', 0, 3);
			const text = rnd.text('abcABC \n', 0, 40);

			let regex;
			try {
				regex = new RegExp(pattern, 'gim');
			} catch (e) {
				expect(rr(pattern, replacement, {pipedData: text}).exit, pattern).toBe(1);
				continue;
			}

			expect(
				rr(pattern, replacement, {pipedData: text}).out,
				JSON.stringify({pattern, replacement, text})
			).toBe(text.replace(regex, replacement));
		}
	});

	test('treats a file exactly like piped data', () => {
		const rnd = random(2);
		for (let i = 0; i < 200; i++) {
			const pattern = rnd.text('abc[]', 1, 3).replace(/[\[\]]/g, '.');
			const replacement = rnd.text('xyz"\'\\\n🦖', 0, 3);
			const text = rnd.text('abcABCæøå中 \r\n\t', 0, 60);
			const expected = rr(pattern, replacement, {pipedData: text}).out;

			fs.writeFileSync('my.file', text);
			expect(rr(pattern, replacement, {includeGlob: ['my.file'], output: true}).out).toBe(
				expected
			);

			rr(pattern, replacement, {includeGlob: ['my.file']});
			expect(
				fs.readFileSync('my.file', 'utf8'),
				JSON.stringify({pattern, replacement, text})
			).toBe(expected);
		}
	});
});
