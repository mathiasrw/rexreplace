import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('--replacement-file', () => {
	test('uses the content of the file at the path as the replacement', async () => {
		fs.writeFileSync('footer.html', '<footer>');
		const config = {pipedData: 'a {{footer}}', replacementFile: true};
		expect((await rr('\\{\\{footer\\}\\}', 'footer.html', config)).out).toBe('a <footer>');
	});

	test('gives $1 in the content its meaning, unless --literal-replacement', async () => {
		fs.writeFileSync('price.txt', 'only $1.99');
		const config = {pipedData: 'PRICE', replacementFile: true};
		expect((await rr('(PRICE)', 'price.txt', config)).out).toBe('only PRICE.99');
		expect((await rr('(PRICE)', 'price.txt', {...config, literalReplacement: true})).out).toBe(
			'only $1.99'
		);
	});

	test('does not use the € and § aliases in the content, as they are only for what is typed', async () => {
		fs.writeFileSync('cost.txt', '5€');
		expect((await rr('x', 'cost.txt', {pipedData: 'x', replacementFile: true})).out).toBe('5€');
	});

	test('takes the path from --replacement-pipe', async () => {
		fs.writeFileSync('footer.html', '<footer>');
		fs.writeFileSync('page.html', '{{footer}}');
		const config = {
			includeGlob: ['page.html'],
			pipedData: 'footer.html',
			replacementPipe: true,
			replacementFile: true,
		};
		await rr('\\{\\{footer\\}\\}', '_', config);
		expect(fs.readFileSync('page.html', 'utf8')).toBe('<footer>');
	});

	test('with --js the code gives the path, and each file is read once', async () => {
		fs.mkdirSync('partials');
		fs.writeFileSync('partials/a.html', 'A');
		fs.writeFileSync('partials/b.html', 'B');
		const config = {
			pipedData: '{{a}}{{b}}{{a}}',
			replacementJs: true,
			replacementFile: true,
			verbose: true,
		};
		const result = await rr('\\{\\{(\\w+)\\}\\}', '"partials/" + $1 + ".html"', config);
		expect(result.out).toBe('ABA');
		expect(
			result.err.split('\n').filter(line => line.startsWith('Read the replacement file'))
		).toEqual([
			'Read the replacement file: partials/a.html',
			'Read the replacement file: partials/b.html',
		]);
	});

	test('that can not be read stops the run before any file is changed', async () => {
		fs.writeFileSync('my.file', 'foo');
		const result = await rr('foo', 'nope.txt', {includeGlob: ['my.file'], replacementFile: true});
		expect(result.err).toStartWith(' ❌ The replacement file can not be read: nope.txt');
		expect(result.exit).toBe(3);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foo');
	});

	test('with --js a path that can not be read is an error, and the match is left as it is', async () => {
		const config = {pipedData: 'foo', replacementJs: true, replacementFile: true};
		expect(await rr('o', '"nope.txt"', config)).toEqual({
			out: 'foo',
			err: ' ❌ The replacement file can not be read: nope.txt\n\n',
			exit: 2,
		});
	});

	test('is not read with --output-match, and a warning tells so', async () => {
		const config = {pipedData: 'foo', replacementFile: true, outputMatch: true};
		expect(await rr('o', 'nope.txt', config)).toEqual({
			out: 'o\no\n',
			err: ' 🟡 The replacement file is not read with --output-match, as only the matches are printed.\n\n',
			exit: null,
		});
	});

	test('gives the new name with --rename', async () => {
		fs.writeFileSync('a.md', 'foo');
		fs.writeFileSync('name.txt', 'b');
		const config = {includeGlob: ['a.md'], rename: true, replacementFile: true};
		expect((await rr('^a', 'name.txt', config)).out).toBe('b.md\n');
	});
});
