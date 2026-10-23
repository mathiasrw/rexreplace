// https://github.com/mathiasrw/rexreplace/issues/710
// There was no way to see which files a command would change without changing them.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr, rrStatus} from '../../helper.js';

// Note that rr() from the helper sets voidAsync per default, so the async flow is `voidAsync: false`
const flows = [
	['the async flow', {voidAsync: false}],
	['--void-async', {voidAsync: true}],
];

// Make a.file and c.file with `foo`, and b.file with `bar` (nothing to replace)
function makeFiles() {
	fs.writeFileSync('a.file', 'foo');
	fs.writeFileSync('b.file', 'bar');
	fs.writeFileSync('c.file', 'foo');
	return {includeGlob: ['*.file'], simulate: true};
}

const contents = () => ['a.file', 'b.file', 'c.file'].map(name => fs.readFileSync(name, 'utf8'));

describe('#710 --simulate', () => {
	test.each(flows)(
		'names the files that would be changed, and changes nothing, with %s',
		async (name, flags) => {
			const result = await rr('o', 'x', {...makeFiles(), ...flags});
			expect(result.out.split('\n').sort()).toEqual(['', 'a.file', 'c.file']);
			expect(result.err).toBe('');
			expect(result.exit).toBe(null);
			expect(contents()).toEqual(['foo', 'bar', 'foo']);
			expect(fs.readdirSync('.').sort()).toEqual(['a.file', 'b.file', 'c.file']);
		}
	);

	test('makes no backup, also with --keep-backup', async () => {
		await rr('o', 'x', {...makeFiles(), keepBackup: true});
		expect(fs.readdirSync('.').sort()).toEqual(['a.file', 'b.file', 'c.file']);
	});

	test('has the files that would be changed in the status report', async () => {
		const status = await rrStatus('o', 'x', makeFiles());
		expect(status.files).toEqual({
			searched: ['a.file', 'b.file', 'c.file'],
			updated: ['a.file', 'c.file'],
		});
	});

	test('with --name-all names all files, but only the changed ones are updated', async () => {
		const config = {...makeFiles(), nameAll: true};
		expect((await rr('o', 'x', config)).out).toBe('a.file\nb.file\nc.file\n');
		expect((await rrStatus('o', 'x', config)).files.updated).toEqual(['a.file', 'c.file']);
		expect(contents()).toEqual(['foo', 'bar', 'foo']);
	});
});
