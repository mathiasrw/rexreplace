// Random combinations of flags and input compared with what plain javascript gives
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr, random} from '../js/helper.js';

const flags = [
	'verbose',
	'literal',
	'voidIgnoreCase',
	'voidGlobal',
	'dotAll',
	'voidMultiline',
	'unicode',
	'quiet',
	'quietTotal',
	'halt',
	'debug',
	'voidEuro',
	'voidSection',
	'output',
	'voidAsync',
	'voidBackup',
	'keepBackup',
	'outputMatch',
	'replacementPipe',
	'replacementJs',
];

const patterns = ['a', 'b+', '^.', '.$', 'a.b', '[ab]', '(a)(b)', 'a|b', '\\s', 'B', 'a*b', '^a?'];

describe('crossover', () => {
	test('any combination of flags', async () => {
		const rnd = random(1);
		for (let i = 0; i < 300; i++) {
			const config = Object.fromEntries(flags.map((flag) => [flag, 0 === rnd.int(3)]));
			const pattern = rnd.pick(patterns);
			const text = rnd.text('abAB \næ.*+', 0, 30);
			const replacement = rnd.text('xy \n<>&', 0, 3);
			const file = `run${i}/my.file`;

			const written = !config.output && !config.outputMatch;

			const regex = new RegExp(
				config.literal ? pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : pattern,
				(config.voidGlobal ? '' : 'g') +
					(config.voidIgnoreCase ? '' : 'i') +
					(config.voidMultiline ? '' : 'm') +
					(config.dotAll ? 's' : '') +
					(config.unicode ? 'u' : '')
			);
			const replaced = text.replace(regex, () => replacement);
			const matches = (
				config.voidGlobal ? [text.match(regex)] : Array.from(text.matchAll(regex))
			)
				.filter(Boolean)
				.map((match) => (1 < match.length ? match.slice(1).join('') : match[0]) + '\n')
				.join('');

			const given = config.replacementJs ? JSON.stringify(replacement) : replacement;
			const note = JSON.stringify({config, pattern, text, replacement});

			fs.mkdirSync(`run${i}`);
			fs.writeFileSync(file, text);

			const result = await rr(pattern, config.replacementPipe ? '_' : given, {
				...config,
				includeGlob: [file],
				pipedData: config.replacementPipe ? given : null,
			});

			expect(result.exit, note).toBe(null);
			expect(result.out, note).toBe(
				config.outputMatch ? matches : config.output ? replaced : ''
			);

			const expected = written ? replaced : text;
			const files =
				written && replaced !== text && config.keepBackup && !config.voidBackup ? 2 : 1;

			expect(fs.readFileSync(file, 'utf8'), note).toBe(expected);
			expect(fs.readdirSync(`run${i}`), note).toHaveLength(files);
		}
	});

	test('a file, piped data and --output all give the same', async () => {
		const rnd = random(2);
		for (let i = 0; i < 200; i++) {
			const config = Object.fromEntries(
				[
					'literal',
					'voidIgnoreCase',
					'voidGlobal',
					'dotAll',
					'voidMultiline',
					'unicode',
				].map((flag) => [flag, 0 === rnd.int(2)])
			);
			const pattern = rnd.pick(patterns);
			const text = rnd.text('abAB \r\næ中.*+', 0, 40);
			const replacement = rnd.text(['x', '$&', '$1', '$$', '\n', '"'], 0, 3);
			const note = JSON.stringify({config, pattern, text, replacement});

			const piped = (await rr(pattern, replacement, {...config, pipedData: text})).out;

			fs.writeFileSync('my.file', text);
			expect(
				(
					await rr(pattern, replacement, {
						...config,
						includeGlob: ['my.file'],
						output: true,
					})
				).out,
				note
			).toBe(piped);

			await rr(pattern, replacement, {...config, includeGlob: ['my.file']});
			expect(fs.readFileSync('my.file', 'utf8'), note).toBe(piped);
		}
	});
});
