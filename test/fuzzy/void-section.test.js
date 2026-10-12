import {describe, test, expect} from 'bun:test';
import {rr, random} from '../js/helper.js';

describe('--void-section', () => {
	test('§ and \\ can be swapped freely unless voided', async () => {
		const rnd = random(1);
		for (let i = 0; i < 300; i++) {
			const pattern = rnd.text(['\\d', '\\s', '\\w', '\\.', '\\\\', '\\b', 'a', '+'], 1, 3);
			const text = rnd.text('a1 .\\\n', 0, 20);
			const note = JSON.stringify({pattern, text});

			let regex;
			try {
				regex = new RegExp(pattern, 'gim');
			} catch (e) {
				continue;
			}

			const section = pattern.replace(/\\/g, '§');
			expect((await rr(pattern, '_', {pipedData: text})).out, note).toBe(
				text.replace(regex, '_')
			);
			expect((await rr(section, '_', {pipedData: text})).out, note).toBe(
				text.replace(regex, '_')
			);
			expect((await rr(pattern, '_', {pipedData: text, voidSection: true})).out, note).toBe(
				text.replace(regex, '_')
			);
		}
	});

	test('a voided § is a char like any other', async () => {
		const rnd = random(2);
		for (let i = 0; i < 300; i++) {
			const text = rnd.text('ab§\\ ', 0, 20);
			expect((await rr('§', '<§>', {pipedData: text, voidSection: true})).out, text).toBe(
				text.split('§').join('<§>')
			);
		}
	});
});
