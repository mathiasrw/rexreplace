// https://github.com/mathiasrw/rexreplace/issues/718
// Every path was treated as a glob, so a file with glob characters in its name was not found, or other files were changed with it.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

const content = (name) => fs.readFileSync(name, 'utf8');

describe('#718 a path that is a file is used as it is', () => {
	test.each(['my (1).file', '(draft).file', '{a,b}.file', '!important.file', 'a+(b).file'])(
		'%s is found',
		async (name) => {
			fs.writeFileSync(name, 'foo');
			expect(await rr('o', 'x', {includeGlob: [name]})).toEqual({
				out: name + '\n',
				err: '',
				exit: null,
			});
			expect(content(name)).toBe('fxx');
		}
	);

	test.each([
		['a[1].file', 'a1.file'],
		['[id].file', 'i.file'],
		['what?.file', 'whatX.file'],
		['star*.file', 'star123.file'],
	])('%s does not also change %s', async (name, other) => {
		fs.writeFileSync(name, 'foo');
		fs.writeFileSync(other, 'foo');
		expect(await rr('o', 'x', {includeGlob: [name]})).toEqual({
			out: name + '\n',
			err: '',
			exit: null,
		});
		expect(content(name)).toBe('fxx');
		expect(content(other)).toBe('foo');
	});

	test('a path that is not a file is still a glob', async () => {
		fs.writeFileSync('a[1].file', 'foo');
		fs.writeFileSync('a1.file', 'foo');
		const result = await rr('o', 'x', {includeGlob: ['*.file']});
		expect(result.out).toBe('a1.file\na[1].file\n');
	});

	test('a file given by its name and also found by a glob is only handled once', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		const result = await rr('o', 'x', {includeGlob: ['./a.file', '*.file']});
		expect(result).toEqual({out: './a.file\nb.file\n', err: '', exit: null});
		expect(fs.readdirSync('.').sort()).toEqual(['a.file', 'b.file']);
	});

	test('--exclude-glob also takes away a file given by its name', async () => {
		fs.writeFileSync('a[1].file', 'foo');
		fs.writeFileSync('a1.file', 'foo');
		const config = {includeGlob: ['a[1].file', 'a1.file'], excludeGlob: ['a[1].file']};
		expect((await rr('o', 'x', config)).out).toBe('a1.file\n');
		expect(content('a[1].file')).toBe('foo');
		expect(content('a1.file')).toBe('fxx');
	});

	test('--exclude-re also takes away a file given by its name', async () => {
		fs.writeFileSync('a[1].file', 'foo');
		fs.writeFileSync('a1.file', 'foo');
		const config = {includeGlob: ['a[1].file', 'a1.file'], excludeRe: ['\\[']};
		expect((await rr('o', 'x', config)).out).toBe('a1.file\n');
		expect(content('a[1].file')).toBe('foo');
	});
});
