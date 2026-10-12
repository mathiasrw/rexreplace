import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr, random, until} from '../helper.js';

describe('--void-backup', () => {
	test('ends up with the same file as with a backup', async () => {
		const rnd = random(1);
		for (let i = 0; i < 50; i++) {
			const text = rnd.text('ab \næ🦖', 0, 30);
			const pattern = rnd.pick(['a', 'b+', '\\s', 'ab']);
			fs.writeFileSync('with.file', text);
			fs.writeFileSync('without.file', text);

			rr(pattern, '_', {includeGlob: ['with.file']});
			const expected = fs.readFileSync('with.file', 'utf8');
			expect(expected, JSON.stringify({pattern, text})).toBe(
				text.replace(new RegExp(pattern, 'gim'), '_')
			);

			rr(pattern, '_', {includeGlob: ['without.file'], voidBackup: true, quiet: true});
			await until(() => expected === fs.readFileSync('without.file', 'utf8'));
		}
	});
});
