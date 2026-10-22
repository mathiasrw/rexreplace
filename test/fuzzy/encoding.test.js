import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr, random} from '../js/helper.js';

describe('--encoding', () => {
	test('latin1 leaves all bytes around the match alone', async () => {
		const rnd = random(1);
		for (let i = 0; i < 200; i++) {
			// Any byte but the letters of the needle
			const junk = () =>
				Buffer.from(
					Array.from({length: rnd.int(40)}, () => rnd.int(255)).filter(
						byte => !'qQzZ'.includes(String.fromCharCode(byte))
					)
				);
			const [before, after] = [junk(), junk()];

			fs.writeFileSync('my.file', Buffer.concat([before, Buffer.from('qzq'), after]));
			await rr('qzq', 'ok', {includeGlob: ['my.file'], encoding: 'latin1'});
			expect(fs.readFileSync('my.file')).toEqual(Buffer.concat([before, Buffer.from('ok'), after]));
		}
	});

	test.each(['utf8', 'utf16le'])('%s keeps any unicode text intact', async encoding => {
		const rnd = random(2);
		const alphabet = ['a', 'b', ' ', '\n', 'æ', 'ß', '中', '🦖', '👍🏽', 'é', '​', '€'];
		for (let i = 0; i < 200; i++) {
			const text = rnd.text(alphabet, 0, 30);
			fs.writeFileSync('my.file', Buffer.from(text + 'x', encoding));
			await rr('x$', '🦕', {includeGlob: ['my.file'], encoding, voidMultiline: true});
			expect(fs.readFileSync('my.file', encoding), JSON.stringify(text)).toBe(text + '🦕');
		}
	});
});
