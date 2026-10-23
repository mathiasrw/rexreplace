import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr, random, ended} from '../helper.js';

describe('--replacement-pipe', () => {
	test('inserts any piped text without a $ exactly as it is', async () => {
		const rnd = random(1);
		fs.writeFileSync('my.file', 'a-b-c');
		for (let i = 0; i < 500; i++) {
			const pipedData = rnd.text('ab01 \t\r\n\\\'"`€§%&{}[]()*+?.^|#æ中🦖', 0, 12);
			const config = {
				includeGlob: ['my.file'],
				replacementPipe: true,
				pipedData,
				output: true,
			};
			expect((await rr('-', '_', config)).out, JSON.stringify(pipedData)).toBe(
				`a${pipedData}b${pipedData}c\n`
			);
		}
	});

	test('gives the same as the replacement given as parameter', async () => {
		const rnd = random(2);
		fs.writeFileSync('my.file', 'abc abc');
		for (let i = 0; i < 300; i++) {
			const replacement = rnd.text(['$1', '$2', '$&', '$$', '$', 'x', ' ', '\n'], 0, 5);
			const config = {
				includeGlob: ['my.file'],
				output: true,
				voidEuro: true,
				voidSection: true,
			};
			expect(
				(
					await rr('(a)(b)', '_', {
						...config,
						replacementPipe: true,
						pipedData: replacement,
					})
				).out,
				JSON.stringify(replacement)
			).toBe((await rr('(a)(b)', replacement, config)).out);
		}
	});
});
