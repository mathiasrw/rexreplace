// https://github.com/mathiasrw/rexreplace/issues/735
// Emoji and other UTF-8 in every way data comes in and goes out.
import {describe, test, expect} from 'bun:test';
import path from 'path';
import {rr} from '../helper.js';

// rr() gives stdout as a JavaScript string. This is what real stdout (or a file) gets, so half an emoji shows up as `�`.
const asUtf8 = text => Buffer.from(text).toString();

const text = 'æ 中 🦖 👩‍💻\r\n';

describe('#735 UTF-8 in the pattern', () => {
	test('is found as it is', async () => {
		expect(asUtf8((await rr('🦖', 'x', {pipedData: text})).out)).toBe('æ 中 x 👩‍💻\r\n');
	});

	test('. takes half an emoji without --unicode, which then shows as �', async () => {
		const out = (await rr('.', 'x', {pipedData: '🦖a', voidGlobal: true})).out;
		expect(asUtf8(out)).toBe('x�a');
	});

	test('. takes the whole emoji with --unicode', async () => {
		const config = {pipedData: '🦖a', voidGlobal: true, unicode: true};
		expect(asUtf8((await rr('.', 'x', config)).out)).toBe('xa');
	});

	test('is plain text with --literal', async () => {
		const config = {pipedData: 'a中.🦖b 中x🦖', literal: true};
		expect(asUtf8((await rr('中.🦖', 'x', config)).out)).toBe('axb 中x🦖');
	});
});

describe('#735 UTF-8 in the replacement', () => {
	test('is inserted as it is', async () => {
		expect(asUtf8((await rr('a', '🦖', {pipedData: 'aba'})).out)).toBe('🦖b🦖');
	});

	test('works with the € and § aliases', async () => {
		expect(asUtf8((await rr('(🦖)', '€1€1', {pipedData: 'a🦖b'})).out)).toBe('a🦖🦖b');
		expect(asUtf8((await rr('§d', '🦖', {pipedData: 'a1b'})).out)).toBe('a🦖b');
	});

	test('can come from --replacement-js, where an emoji has the length 2', async () => {
		const config = {pipedData: 'a🦖', replacementJs: true};
		expect(asUtf8((await rr('🦖', '$0 + $0.length', config)).out)).toBe('a🦖2');
	});
});

describe('#735 UTF-8 in the content of a file', () => {
	test('is written as UTF-8 when changed in place', async () => {
		await Bun.write('my.file', text);
		await rr('🦖', '🦕', {includeGlob: ['my.file']});
		expect(Buffer.from(await Bun.file('my.file').arrayBuffer())).toEqual(
			Buffer.from('æ 中 🦕 👩‍💻\r\n')
		);
	});

	test('is printed with --output', async () => {
		await Bun.write('my.file', text);
		const out = (await rr('🦖', '🦕', {includeGlob: ['my.file'], output: true})).out;
		expect(asUtf8(out)).toBe('æ 中 🦕 👩‍💻\r\n');
	});

	test('is printed with --output-match', async () => {
		await Bun.write('my.file', text);
		const config = {includeGlob: ['my.file'], outputMatch: true};
		expect(asUtf8((await rr('🦖|👩‍💻', '_', config)).out)).toBe('🦖\n👩‍💻\n');
	});
});

describe('#735 UTF-8 in piped data', () => {
	test('comes out as it went in, with \\r\\n', async () => {
		expect(asUtf8((await rr('中', 'x', {pipedData: text})).out)).toBe('æ x 🦖 👩‍💻\r\n');
	});

	test('can be the replacement with --replacement-pipe', async () => {
		await Bun.write('my.file', 'aXb');
		await rr('X', '_', {includeGlob: ['my.file'], replacementPipe: true, pipedData: '🦖'});
		expect(await Bun.file('my.file').text()).toBe('a🦖b');
	});
});

describe('#735 UTF-8 in file names', () => {
	const name = '🦖 中.file';

	test('a name is printed as it was given', async () => {
		await Bun.write(name, 'foo');
		expect(asUtf8((await rr('o', 'x', {includeGlob: [name]})).out)).toBe(name + '\n');
		expect(await Bun.file(name).text()).toBe('fxx');
	});

	test('a glob finds a name with emoji', async () => {
		await Bun.write(name, 'foo');
		await Bun.write('other.file', 'foo');
		expect(asUtf8((await rr('o', 'x', {includeGlob: ['*🦖*']})).out)).toBe(name + '\n');
	});

	test('a name is printed with its full path with --full-path', async () => {
		await Bun.write(name, 'foo');
		const out = (await rr('o', 'x', {includeGlob: [name], fullPath: true})).out;
		expect(asUtf8(out)).toBe(path.resolve(name) + '\n');
	});
});

describe('#735 UTF-8 in the delimiters', () => {
	async function makeFiles() {
		await Bun.write('a.file', 'foo');
		await Bun.write('b.file', 'foo');
		return {includeGlob: ['*.file']};
	}

	test('--name-delimiter, also with no tail', async () => {
		const config = {...(await makeFiles()), nameDelimiter: '🦖'};
		expect(asUtf8((await rr('o', 'x', config)).out)).toBe('a.file🦖b.file🦖');
		await makeFiles();
		const noTail = {...config, nameDelimiterTail: false};
		expect(asUtf8((await rr('o', 'x', noTail)).out)).toBe('a.file🦖b.file');
	});

	test('--content-delimiter with a combined emoji', async () => {
		const config = {...(await makeFiles()), output: true, contentDelimiter: '👩‍💻'};
		expect(asUtf8((await rr('o', 'x', config)).out)).toBe('fxx👩‍💻fxx👩‍💻');
	});

	test('--delimiter sets both', async () => {
		const config = {...(await makeFiles()), output: true, delimiter: '🦕'};
		const result = await rr('o', 'x', config);
		expect(asUtf8(result.out)).toBe('fxx🦕fxx🦕');
		expect(asUtf8(result.err)).toBe('a.file🦕b.file🦕');
	});
});
