import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr, random} from '../helper.js';

describe('--void-backup', () => {
	test('ends up with the same file as with a backup', async () => {
		const rnd = random(1);
		for (let i = 0; i < 50; i++) {
			const text = rnd.text('ab \næ🦖', 0, 30);
			const pattern = rnd.pick(['a', 'b+', '\\s', 'ab']);
			fs.writeFileSync('with.file', text);
			fs.writeFileSync('without.file', text);

			const note = JSON.stringify({pattern, text});

			await rr(pattern, '_', {includeGlob: ['with.file']});
			const expected = fs.readFileSync('with.file', 'utf8');
			expect(expected, note).toBe(text.replace(new RegExp(pattern, 'gim'), '_'));

			await rr(pattern, '_', {includeGlob: ['without.file'], voidBackup: true});
			expect(fs.readFileSync('without.file', 'utf8'), note).toBe(expected);
		}
	});
});
