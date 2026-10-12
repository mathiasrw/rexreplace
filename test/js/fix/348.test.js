// https://github.com/mathiasrw/rexreplace/issues/348
// `§` is an alias for `\` but in the replacement it was converted after the escape sequences were interpreted, so `§n` gave a backslash and an `n` instead of a line break.
// The replacement is unescaped by the CLI (not the engine), so these tests run the CLI itself.
import {describe, test, expect} from 'bun:test';
import {spawnSync} from 'child_process';
import path from 'path';

const cli = path.join(import.meta.dir, '../../../src/cli.ts');

// Give `input` to the CLI as piped data and return what it gives back
function run(input, ...args) {
	const {stdout, stderr, status} = spawnSync(process.execPath, [cli, ...args], {
		input,
		encoding: 'utf8',
	});
	return {out: stdout, err: stderr, exit: status};
}

// Replace the `b` in `foobar` with the replacement
const replaceB = (replacement, ...flags) => run('foobar', 'b', replacement, ...flags);

describe('#348 § is a full substitute for \\ in the replacement', () => {
	test('the example from the issue', () => {
		expect(run('abc\n', '§n', 'X§n')).toEqual({out: 'abcX\n', err: '', exit: 0});
		expect(run('abc\n', '§n', 'X\\n')).toEqual({out: 'abcX\n', err: '', exit: 0});
	});

	test.each([
		['§n', '\n'],
		['§t', '\t'],
		['§r§n', '\r\n'],
		['§x41', 'A'],
		['§u00e9', 'é'],
		['§u{1F600}', '😀'],
		['§§', '\\'],
		['§§n', '\\n'],
		['§', '\\'],
		["§'", "'"],
		['a§\nb', 'ab'],
		['[€&§n]', '[b\n]'],
	])('%j gives %j like it does with a backslash', (replacement, expected) => {
		const result = replaceB(replacement);
		expect(result).toEqual({out: `foo${expected}ar`, err: '', exit: 0});
		expect(replaceB(replacement.replaceAll('§', '\\'))).toEqual(result);
	});

	test('an invalid escape sequence gives the same error as with a backslash', () => {
		expect(replaceB('§x4')).toEqual({
			out: '',
			err: ' ❌ Invalid escape sequence in replacement: §x4\n',
			exit: 1,
		});
	});

	test('--void-section keeps § as a plain char', () => {
		expect(replaceB('§n', '--void-section').out).toBe('foo§nar');
		expect(replaceB('§', '--void-section').out).toBe('foo§ar');
		expect(replaceB('§x4', '--void-section').out).toBe('foo§x4ar');
		expect(replaceB('§\\n', '-§').out).toBe('foo§\nar');
	});

	test('--replacement-js still gets § as a backslash in the source', () => {
		expect(replaceB('"a§nb"', '--replacement-js').out).toBe('fooa\nbar');
		expect(replaceB('"a§nb"', '--replacement-js', '--void-section').out).toBe('fooa§nbar');
	});
});
