// https://github.com/mathiasrw/rexreplace/issues/824
// Since #808 --js code that failed only gave the message, also with --verbose, so a module loaded with r() did not tell where.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('#824 --js code that fails in a module', () => {
	test('tells the file and the line with --verbose', async () => {
		fs.writeFileSync('helper.js', 'module.exports = value => {\n\treturn value.nope.deeper;\n};\n');
		const config = {pipedData: 'foo', replacementJs: true, verbose: true};
		const result = await rr('o', 'r("helper")($0)', config);
		expect(result.err).toMatch(/\n {4}at helper\.js:2:\d+\n {4}No further processing\.\n/);
		expect(result.exit).toBe(3);
	});

	test('does not tell where without --verbose, or when the code in the command fails', async () => {
		fs.writeFileSync('helper.js', 'module.exports = value => {\n\treturn value.nope.deeper;\n};\n');
		const config = {pipedData: 'foo', replacementJs: true};
		expect((await rr('o', 'r("helper")($0)', config)).err).not.toContain(' at ');
		expect((await rr('o', 'nope()', {...config, verbose: true})).err).not.toContain(' at ');
	});

	test('reads a path with parentheses as a whole', async () => {
		fs.mkdirSync('a (copy)');
		fs.writeFileSync(
			'a (copy)/helper.js',
			'module.exports = value => {\n\treturn value.nope.deeper;\n};\n'
		);
		const config = {pipedData: 'foo', replacementJs: true, verbose: true};
		expect((await rr('o', 'r("a (copy)/helper.js")($0)', config)).err).toMatch(
			/\n {4}at a \(copy\)\/helper\.js:2:\d+\n/
		);
	});

	test('does not tell places in the runtime itself', async () => {
		const config = {pipedData: 'foo', replacementJs: true, verbose: true};
		expect((await rr('o', 'new URL("x")', config)).err).not.toContain(' at ');
	});

	test('does not crash when the stack can not be read', async () => {
		const config = {pipedData: 'foo', replacementJs: true, verbose: true};
		const result = await rr('o', 'throw new Proxy({}, {get() { throw 1; }})', config);
		expect(result.err).toContain(
			'The code of --js failed for the piped data: an object was thrown'
		);
		expect(result.exit).toBe(3);
	});

	test('reads a place without a function name, also when the path has parentheses (#846)', async () => {
		// Bun has no function name for the code at the top of a module
		fs.mkdirSync('a (copy)');
		fs.writeFileSync('a (copy)/top.js', 'throw new Error("top");\n');
		const config = {pipedData: 'foo', replacementJs: true, verbose: true};
		expect((await rr('o', 'r("a (copy)/top.js")', config)).err).toMatch(
			/\n {4}at a \(copy\)\/top\.js:1:\d+\n/
		);
	});
});
