// https://github.com/mathiasrw/rexreplace/issues/788
// A path the file system could not look at, like a name that is too long, crashed the run with a stack trace.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('#788 a path that can not be looked at', () => {
	test('is not a file, so it is globbed', async () => {
		fs.writeFileSync('a.md', 'foo');
		const long = `{a,${'x'.repeat(300)}}.md`;
		expect(await rr('foo', 'bar', {includeGlob: [long]})).toEqual({
			out: 'a.md\n',
			err: '',
			exit: null,
		});
		expect(fs.readFileSync('a.md', 'utf8')).toBe('bar');
	});

	test.each([
		['as an argument', {includeGlob: ['a.md/x']}],
		['from --glob-pipe', {pipedData: 'a.md/x', globPipe: true}],
		['in --exclude-glob', {includeGlob: ['a.md'], excludeGlob: ['a.md/x']}],
	])('gives a panic when the glob can not be used, %s', async (name, config) => {
		fs.writeFileSync('a.md', 'foo');
		const result = await rr('foo', 'bar', config);
		expect(result.err).toStartWith(' ❌ The files can not be found\n    ENOTDIR');
		expect(result.err).toEndWith('\n    No further processing.\n\n');
		expect(result.exit).toBe(3);
		expect(fs.readFileSync('a.md', 'utf8')).toBe('foo');
	});
});
