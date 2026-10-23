// https://github.com/mathiasrw/rexreplace/issues/719
// Data piped in together with files was not used, and nothing told about it.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../../helper.js';

const warning = ' 🟡 Data is piped in, but no flag tells what to do with it. It is not used.\n\n';
const expectedOutput = 'my.file\n';

describe('#719 a warning when piped data is not used', () => {
	test('is given when data is piped in and files are also given', async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect(await rr('b', '_', {includeGlob: ['my.file'], pipedData: 'x'})).toEqual({
			out: expectedOutput,
			err: warning,
			exit: null,
		});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foo_ar');
	});

	test.each(['quiet', 'quietTotal'])('is not shown with --%s', async flag => {
		fs.writeFileSync('my.file', 'foobar');
		expect(await rr('b', '_', {includeGlob: ['my.file'], pipedData: 'x', [flag]: true})).toEqual({
			out: '',
			err: '',
			exit: null,
		});
	});

	test('does not stop the run with --halt', async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect(await rr('b', '_', {includeGlob: ['my.file'], pipedData: 'x', halt: true})).toEqual({
			out: expectedOutput,
			err: warning,
			exit: null,
		});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foo_ar');
	});

	test('is not given when the piped data is used', async () => {
		fs.writeFileSync('my.file', 'foobar');
		expect(
			await rr('b', '_', {includeGlob: ['my.file'], pipedData: 'x', replacementPipe: true})
		).toEqual({
			out: expectedOutput,
			err: '',
			exit: null,
		});
		fs.writeFileSync('my.file', 'foobar');
		expect(
			await rr('b', 'pipe', {includeGlob: ['my.file'], pipedData: 'x', replacementJs: true})
		).toEqual({
			out: expectedOutput,
			err: '',
			exit: null,
		});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fooxar');
	});

	test.each([null, '', '\n', '\r\n'])('is not given when %j is piped in', async pipedData => {
		fs.writeFileSync('my.file', 'foobar');
		expect(await rr('b', '_', {includeGlob: ['my.file'], pipedData})).toEqual({
			out: expectedOutput,
			err: '',
			exit: null,
		});
	});

	test('is not given when only data is piped in', async () => {
		expect(await rr('b', '_', {pipedData: 'foobar'})).toEqual({
			out: 'foo_ar',
			err: '',
			exit: null,
		});
	});
});
