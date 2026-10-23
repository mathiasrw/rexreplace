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
});
