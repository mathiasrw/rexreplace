// https://github.com/mathiasrw/rexreplace/issues/710
// There was no way to see which files a command would change without changing them.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr, rrStatus} from '../helper.js';

// Note that rr() from the helper sets voidAsync per default, so the async flow is `voidAsync: false`
const flows = [
	['the async flow', {voidAsync: false}],
	['--void-async', {voidAsync: true}],
];

const contents = () => ['a.file', 'b.file', 'c.file'].map(name => fs.readFileSync(name, 'utf8'));

describe('#710 --simulate', () => {
	test.each(flows)(
		'names the files that would be changed, and changes nothing, with %s',
		async (name, flags) => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'bar');
			fs.writeFileSync('c.file', 'foo');
			const result = await rr('o', 'x', {includeGlob: ['*.file'], simulate: true, ...flags});
			expect(result.out.split('\n').sort()).toEqual(['', 'a.file', 'c.file']);
			expect(result.err).toBe('');
			expect(result.exit).toBe(null);
			expect(contents()).toEqual(['foo', 'bar', 'foo']);
			expect(fs.readdirSync('.').sort()).toEqual(['a.file', 'b.file', 'c.file']);
		}
	);

	test('makes no backup, also with --keep-backup', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'bar');
		fs.writeFileSync('c.file', 'foo');
		await rr('o', 'x', {includeGlob: ['*.file'], simulate: true, keepBackup: true});
		expect(fs.readdirSync('.').sort()).toEqual(['a.file', 'b.file', 'c.file']);
	});

	test('has the files that would be changed in the status report', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'bar');
		fs.writeFileSync('c.file', 'foo');
		const status = await rrStatus('o', 'x', {includeGlob: ['*.file'], simulate: true});
		expect(status.files).toEqual({
			searched: ['a.file', 'b.file', 'c.file'],
			updated: ['a.file', 'c.file'],
		});
	});

	test('with --name-all names all files, but only the changed ones are updated', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'bar');
		fs.writeFileSync('c.file', 'foo');
		const config = {includeGlob: ['*.file'], simulate: true, nameAll: true};
		expect((await rr('o', 'x', config)).out).toBe('a.file\nb.file\nc.file\n');
		expect((await rrStatus('o', 'x', config)).files.updated).toEqual(['a.file', 'c.file']);
		expect(contents()).toEqual(['foo', 'bar', 'foo']);
	});
});
