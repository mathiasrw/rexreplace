// Random combinations of flags and input compared with what plain javascript gives
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr, random, until} from '../helper.js';

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
			// What is sent to stdout can only be caught while rr() runs
			config.voidAsync = config.voidAsync || !written;
			const later = written && (config.voidBackup || !config.voidAsync);
			if (later) {
				// Anything told after rr() has returned would end up in the output of the test run
				Object.assign(config, {quiet: true, verbose: false, debug: false});
			}

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

			const result = rr(pattern, config.replacementPipe ? '_' : given, {
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

			if (later) {
				await until(
					() =>
						expected === fs.readFileSync(file, 'utf8') &&
						files === fs.readdirSync(`run${i}`).length
				);
			} else {
				expect(fs.readFileSync(file, 'utf8'), note).toBe(expected);
				expect(fs.readdirSync(`run${i}`), note).toHaveLength(files);
			}
		}
	});

	test('a file, piped data and --output all give the same', () => {
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

			const piped = rr(pattern, replacement, {...config, pipedData: text}).out;

			fs.writeFileSync('my.file', text);
			expect(
				rr(pattern, replacement, {...config, includeGlob: ['my.file'], output: true}).out,
				note
			).toBe(piped);

			rr(pattern, replacement, {...config, includeGlob: ['my.file']});
			expect(fs.readFileSync('my.file', 'utf8'), note).toBe(piped);
		}
	});
});
