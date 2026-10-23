// https://github.com/mathiasrw/rexreplace/issues/819
// With --sort modified, created or size, a file that was gone between the glob and the sort crashed the run with a stack trace.
import {describe, test, expect, spyOn} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

// The sort looks at each file with statSync and no options. When it looks at one of the given files, that file is made to fail.
function failInSort(names, fail) {
	const statSync = fs.statSync;
	return spyOn(fs, 'statSync').mockImplementation((file, options) => {
		if (names.includes(file) && !options) {
			fail(file);
		}
		return statSync(file, options);
	});
}

// Each sort puts z.md before a.md, so the order is not the ascii order. The files to delete would come first.
async function makeFiles(gone) {
	for (const name of [...gone, 'z.md', 'a.md']) {
		fs.writeFileSync(name, 'z.md' === name ? 'foo' : 'foo foo');
		await Bun.sleep(20);
	}
	gone.forEach(name => fs.utimesSync(name, 500, 500));
	fs.utimesSync('z.md', 1000, 1000);
	fs.utimesSync('a.md', 3000, 3000);
}

async function sortWithGone(gone, config) {
	await makeFiles(gone);
	const spy = failInSort(gone, file => fs.unlinkSync(file));
	try {
		return await rr('foo', 'bar', {includeGlob: ['*.md'], ...config});
	} finally {
		spy.mockRestore();
	}
}

describe('#819 a file deleted before --sort looks at it', () => {
	test.each([['modified'], ['created'], ['size']])(
		'is told about as not found with --sort %s, and the other files are sorted',
		async sort => {
			const result = await sortWithGone(['gone.md'], {sort});
			expect(result.out).toBe('z.md\na.md\n');
			expect(result.err).toEndWith(' ❌ File not found\n    gone.md\n\n');
			expect(result.exit).toBe(2);
		}
	);

	test('is told about for each file, when more than one is deleted', async () => {
		expect(await sortWithGone(['gone.md', 'gone2.md'], {sort: 'size'})).toEqual({
			out: 'z.md\na.md\n',
			err: ' ❌ File not found\n    gone.md\n\n ❌ File not found\n    gone2.md\n\n',
			exit: 2,
		});
	});

	test('does not change the order of the others with --sort-reverse', async () => {
		expect(await sortWithGone(['gone.md'], {sort: 'size', sortReverse: true})).toEqual({
			out: 'a.md\nz.md\n',
			err: ' ❌ File not found\n    gone.md\n\n',
			exit: 2,
		});
	});

	test('stops the run with --halt, before any file is changed', async () => {
		expect(await sortWithGone(['gone.md'], {sort: 'size', halt: true})).toEqual({
			out: '',
			err: ' ❌ File not found\n    gone.md\n    No further processing.\n\n',
			exit: 3,
		});
		expect(fs.readFileSync('a.md', 'utf8')).toBe('foo foo');
	});
});

describe('#819 a file that can not be looked at in the sort for another reason', () => {
	test.each([
		[false, '\n', 2, 'a.md\n'],
		[true, '\n    No further processing.\n', 3, ''],
	])(
		'is an error with that reason, and is left out, with --halt %s',
		async (halt, end, exit, out) => {
			['a.md', 'b.md'].forEach(name => fs.writeFileSync(name, 'foo'));
			const spy = failInSort(['b.md'], () => {
				throw Object.assign(new Error('EACCES: permission denied'), {code: 'EACCES'});
			});
			try {
				expect(await rr('foo', 'bar', {includeGlob: ['*.md'], sort: 'size', halt})).toEqual({
					out,
					err: ' ❌ EACCES: permission denied' + end + '\n',
					exit,
				});
				expect(fs.readFileSync('b.md', 'utf8')).toBe('foo');
			} finally {
				spy.mockRestore();
			}
		}
	);
});
