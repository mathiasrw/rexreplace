import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr, random} from '../helper.js';

const backups = (dir = '.') => fs.readdirSync(dir).filter((name) => name.endsWith('.backup'));

describe('--keep-backup', () => {
	test('the backup is always the original and the file is always the result', () => {
		const rnd = random(1);
		for (let i = 0; i < 100; i++) {
			const text = rnd.text('ab \r\n\tæ🦖', 0, 30);
			const pattern = rnd.pick(['a', 'b+', '\\s', 'ab']);
			const expected = text.replace(new RegExp(pattern, 'gim'), '_');
			const note = JSON.stringify({pattern, text});

			fs.mkdirSync('run' + i);
			fs.writeFileSync(`run${i}/my.file`, text);
			rr(pattern, '_', {includeGlob: [`run${i}/my.file`], keepBackup: true});

			expect(fs.readFileSync(`run${i}/my.file`, 'utf8'), note).toBe(expected);
			expect(backups('run' + i), note).toHaveLength(expected === text ? 0 : 1);
			backups('run' + i).forEach((name) =>
				expect(fs.readFileSync(`run${i}/${name}`, 'utf8'), note).toBe(text)
			);
		}
	});
});
