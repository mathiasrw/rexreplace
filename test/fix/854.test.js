// https://github.com/mathiasrw/rexreplace/issues/854
// Regex+ is behind the engines. rr, the default, reads patterns like the native engine, with the extended syntax of Regex+ on top.
// regex+ is Regex+ with the flags v, x and n, and --flags sets all the flags of any engine.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {$} from 'bun';
import {rr, rrStatus, sh, cli} from '../helper.js';

// What the regex engine was asked to do: the source and the flags of the regex
async function compiled(pattern, config = {}) {
	const status = await rrStatus(pattern, 'x', {
		pipedData: '',
		verbose: true,
		status: true,
		...config,
	});
	return status.engine.execution;
}

const out = async (pattern, replacement, text, config = {}) =>
	(await rr(pattern, replacement, {pipedData: text, ...config})).out;

describe('#854 the rr engine', () => {
	test.each([
		[`(['"])([^\\1]+)\\1`],
		[`\\"`],
		['a]'],
		['a{'],
		['\\01'],
		['[(]'],
		['[a-z-]'],
		['\\++'],
		['[+]+'],
		['\\{2}+'],
		['[(?>]'],
		['[a++]'],
		['\\(?>'],
		['(?<n>a)\\k<n>'],
		['\\k<x>'],
		['a+?'],
		['x{1,2}?'],
		['(foo)(.*)'],
		['[\\]+]+'],
		['\\c'],
		['\\x4'],
		['(?<a>x)\\1'],
		['$'],
		['[[]'],
	])('gives the same regex as the native engine for %s', async pattern => {
		const native = new RegExp(pattern, 'gim');
		expect(await compiled(pattern)).toMatchObject({search: native.source, flags: 'gim'});
	});

	test('only uses the u flag with -u', async () => {
		expect((await compiled('a', {unicode: true})).flags).toBe('gimu');
	});

	test.each([
		['an atomic group', '(?>a+)(b)', '[$1]', 'aab', '[b]'],
		['a possessive quantifier', 'a++b', 'X', 'aaab', 'X'],
		['a possessive quantifier that gives nothing back', 'a++a', 'X', 'aaa', 'aaa'],
		['a subroutine', '(?<d>\\d)-\\g<d>', 'X', '1-2', 'X'],
		[
			'a DEFINE group',
			'\\b(?<v>\\g<n>\\.\\g<n>\\.\\g<n>)(?(DEFINE)(?<n>0|[1-9]\\d*))',
			'v$<v>',
			'3.12.0 and 01.2.3',
			'v3.12.0 and 01.2.3',
		],
	])('reads %s', async (name, pattern, replacement, text, result) => {
		expect(await out(pattern, replacement, text)).toBe(result);
	});

	test('is the engine for default too', async () => {
		expect(await out('(?>a+)(b)', '[$1]', 'aab', {engine: 'default'})).toBe('[b]');
	});
});

describe('#854 the groups Regex+ adds', () => {
	// (?>a+) adds a group of its own in front of (b) and (c)
	test.each([
		['$1', 'b'],
		['$2$1', 'cb'],
		['$3', '$3'],
		['$10', 'b0'],
		['$$1', '$1'],
		['$&', 'aabc'],
	])('are not counted in the replacement %s', async (replacement, result) => {
		expect(await out('(?>a+)(b)(c)?', replacement, 'aabc')).toBe(result);
	});

	test('are not counted in --js', async () => {
		expect(await out('(?>a+)(b)', "$1 + '!'", 'aab', {replacementJs: true})).toBe('b!');
	});

	test('are not printed by --output-match', async () => {
		expect(await out('(?>a+)(b)', 'x', 'aab', {outputMatch: true})).toBe('b\n');
	});

	test('are told in the status report', async () => {
		expect(await compiled('(?>a+)(b)')).toMatchObject({engine: 'rr', hiddenCaptures: [1]});
	});
});

describe('#854 the other engines', () => {
	// The tests are run by Bun, so the native engine is JSC
	test.each([['JSC'], ['runtime']])(
		'%s is the native engine, without the extended syntax',
		async engine => {
			expect(await out('(?<d>a)\\g<d>', 'X', 'ag<d>', {engine})).toBe('X');
		}
	);

	test.each([['regex+'], ['V']])(
		'%s has free spacing, only named groups capture, and the v flag',
		async engine => {
			expect(await out('foo bar', 'X', 'foobar', {engine})).toBe('X');
			expect(await out('(foo)(?<rest>.*)', '$1', 'foox', {engine})).toBe('x');
			expect((await compiled('a', {engine})).flags).toContain('v');
		}
	);

	test.each([['regex+n'], ['N'], ['regex+x'], ['X'], ['regex+u'], ['U'], ['regex+v']])(
		'%s is not an engine',
		async engine => {
			expect(await rr('a', 'b', {pipedData: 'a', engine})).toEqual({
				out: '',
				err: ` ❌ Engine ${engine} not supported\n    No further processing.\n\n`,
				exit: 3,
			});
		}
	);

	test('regex+ stops the run on an escape that is not strict, and the file is not changed', async () => {
		fs.writeFileSync('a.txt', 'a"b');
		const result = await rr('\\"', 'x', {includeGlob: ['a.txt'], engine: 'regex+'});
		expect(result.exit).toBe(3);
		expect(result.err).toStartWith(' ❌ Invalid regular expression');
		expect(fs.readFileSync('a.txt', 'utf8')).toBe('a"b');
	});

	test('--literal gives the text as it is, also with the free spacing of regex+', async () => {
		expect(await out('a b #c (d)', 'X', 'a b #c (d)!', {engine: 'regex+', literal: true})).toBe(
			'X!'
		);
	});
});

describe('#854 --flags', () => {
	const plus = {engine: 'regex+'};

	test('leaves free spacing out of regex+ without x', async () => {
		expect(await out('foo bar', 'X', 'foo bar', {...plus, flags: 'gimvn'})).toBe('X');
	});

	test('lets all groups of regex+ capture without n', async () => {
		expect(await out('(foo)', '[$1]', 'foo', {...plus, flags: 'gimvx'})).toBe('[foo]');
	});

	test('sets all the flags, so without i the search is case sensitive and without g only the first match', async () => {
		expect(await out('o', 'x', 'oOo', {flags: 'm'})).toBe('xOo');
	});

	test('gives regex+ the flag v when it has neither v nor u', async () => {
		expect((await compiled('a', {...plus, flags: 'gx'})).flags).toContain('v');
	});

	test('can not go with -I, -G, -M, -s or -u in the CLI', async () => {
		fs.writeFileSync('a.txt', 'a');
		const result = await sh($`bun ${cli} a b a.txt --flags g -I`);
		expect(result.exit).toBe(3);
		expect(result.err).toEndWith('Arguments flags and I are mutually exclusive\n');
		expect(fs.readFileSync('a.txt', 'utf8')).toBe('a');
	});

	test('gives regex+ the flag u in place of v', async () => {
		const {flags} = await compiled('a', {...plus, flags: 'gu'});
		expect(flags).toContain('u');
		expect(flags).not.toContain('v');
	});

	test.each([
		['x without regex+', {flags: 'gx'}, ' ❌ The flags x and n need -E regex+\n    gx'],
		['n without regex+', {flags: 'gn'}, ' ❌ The flags x and n need -E regex+\n    gn'],
		['a flag that is not a flag', {flags: 'gqz'}, ' ❌ Unknown flags in --flags\n    qz'],
	])('stops the run with %s, and says so', async (name, config, message) => {
		expect(await rr('a', 'b', {pipedData: 'a', ...config})).toEqual({
			out: '',
			err: message + '\n    No further processing.\n\n',
			exit: 3,
		});
	});
});

describe('#854 --js with the flag n of regex+', () => {
	const config = {engine: 'regex+', replacementJs: true};

	test('has the named groups and $0, but no group numbers', async () => {
		expect(await out('(?<y>\\d)(?<m>\\d)', '$m + $y + $0', '12', config)).toBe('2112');
		expect((await rr('(?<y>\\d)', '$1', {pipedData: '1', ...config})).err).toContain(
			'ReferenceError: $1 is not defined'
		);
	});

	test('warns when the replacement text uses a group number, as it is the first named group', async () => {
		const result = await rr('(?<y>\\d)', '[$1]', {pipedData: '1', engine: 'regex+'});
		expect(result.out).toBe('[1]');
		expect(result.err).toContain('With the flag n the groups have no numbers');
	});

	test('has the group numbers again without n', async () => {
		expect(await out('(\\d)(\\d)', '$2 + $1', '12', {...config, flags: 'gimvx'})).toBe('21');
	});
});
