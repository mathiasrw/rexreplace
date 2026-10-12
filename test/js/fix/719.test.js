// https://github.com/mathiasrw/rexreplace/issues/719
// Warn when data is piped in and files are also given, but the piped data is not used.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

const warnMsg = ' 🟡 Data is piped in, but no flag tells what to do with it. It is not used.\n';

describe('#719 warn when piped data is not used', () => {
	test('warns when data is piped in and files are given', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('foo', 'bar', {
			includeGlob: ['my.file'],
			pipedData: 'notes',
		});
		expect(result.err).toContain(warnMsg);
		expect(result.exit).toBe(null);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('barbar');
	});

	test('warning starts with 🟡 and goes to stderr', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('foo', 'bar', {
			includeGlob: ['my.file'],
			pipedData: 'notes',
		});
		expect(result.err.startsWith(' 🟡')).toBe(true);
		expect(result.out).toBe('');
	});

	test('--quiet hides the warning', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('foo', 'bar', {
			includeGlob: ['my.file'],
			pipedData: 'notes',
			quiet: true,
		});
		expect(result.err).toBe('');
		expect(fs.readFileSync('my.file', 'utf8')).toBe('barbar');
	});

	test('--quiet-total hides the warning', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('foo', 'bar', {
			includeGlob: ['my.file'],
			pipedData: 'notes',
			quietTotal: true,
		});
		expect(result.err).toBe('');
		expect(fs.readFileSync('my.file', 'utf8')).toBe('barbar');
	});

	test('warning never stops the run, also not with --halt', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('foo', 'bar', {
			includeGlob: ['my.file'],
			pipedData: 'notes',
			halt: true,
		});
		expect(result.err).toContain(warnMsg);
		expect(result.exit).toBe(null);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('barbar');
	});

	test('--void-pipe suppresses the warning', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('foo', 'bar', {
			includeGlob: ['my.file'],
			pipedData: 'notes',
			voidPipe: true,
		});
		expect(result.err).not.toContain(warnMsg);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('barbar');
	});

	test('--replacement-pipe suppresses the warning', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('foo', '_', {
			includeGlob: ['my.file'],
			pipedData: 'bar',
			replacementPipe: true,
		});
		expect(result.err).not.toContain(warnMsg);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('barbar');
	});

	test('--replacement-js suppresses the warning', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('foo', 'pipe', {
			includeGlob: ['my.file'],
			pipedData: 'bar',
			replacementJs: true,
		});
		expect(result.err).not.toContain(warnMsg);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('barbar');
	});

	test('empty piped data does not trigger a warning', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const result = await rr('foo', 'bar', {
			includeGlob: ['my.file'],
			pipedData: '',
		});
		expect(result.err).not.toContain(warnMsg);
	});

	test('piped data with only a newline does not trigger a warning', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const resultN = await rr('foo', 'bar', {
			includeGlob: ['my.file'],
			pipedData: '\n',
		});
		expect(resultN.err).not.toContain(warnMsg);

		const resultRN = await rr('foo', 'bar', {
			includeGlob: ['my.file'],
			pipedData: '\r\n',
		});
		expect(resultRN.err).not.toContain(warnMsg);
	});

	test('piped data when no files are given does not trigger a warning', async () => {
		const result = await rr('foo', 'bar', {
			includeGlob: [],
			pipedData: 'foobar',
		});
		expect(result.err).not.toContain(warnMsg);
		expect(result.out).toBe('barbar');
	});
});
