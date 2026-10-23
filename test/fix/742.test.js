// https://github.com/mathiasrw/rexreplace/issues/742
// The engine ended the process itself and resolved with nothing useful. Now it resolves with a status, a panic is thrown
// when the run can not go on, and only the CLI acts on the process. It prints the status report with --status and --status-compact.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {$} from 'bun';
import {rr, rrStatus, cli, sh} from '../helper.js';

describe('#742 the engine resolves with a status', () => {
	test('with the files searched and updated', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'bar');
		fs.writeFileSync('c.file', 'foo');
		expect(await rrStatus('o', 'x', {includeGlob: ['*.file']})).toEqual({
			files: {searched: ['a.file', 'b.file', 'c.file'], updated: ['a.file', 'c.file']},
			pipe: null,
			warnings: [],
			errors: [],
		});
	});

	test('with the files that would be updated with --output', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'bar');
		fs.writeFileSync('c.file', 'foo');
		const status = await rrStatus('o', 'x', {includeGlob: ['*.file'], output: true});
		expect(status.files.updated).toEqual(['a.file', 'c.file']);
		expect(fs.readFileSync('a.file', 'utf8')).toBe('foo');
	});

	test('with --name-all only updates the files that are changed', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'bar');
		fs.writeFileSync('c.file', 'foo');
		const status = await rrStatus('o', 'x', {includeGlob: ['*.file'], nameAll: true});
		expect(status.files.updated).toEqual(['a.file', 'c.file']);
	});

	test('with the errors, also when --quiet-total hides them', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		fs.chmodSync('b.file', 0);
		const status = await rrStatus('o', 'x', {includeGlob: ['*.file'], quietTotal: true});
		expect(status.files).toEqual({searched: ['a.file', 'b.file'], updated: ['a.file']});
		expect(status.errors).toHaveLength(1);
		expect(status.errors[0]).toContain('EACCES');
	});

	test('with the warnings, also when --quiet hides them', async () => {
		fs.writeFileSync('a.file', 'foo');
		const status = await rrStatus('o', 'x', {
			includeGlob: ['a.file'],
			pipedData: 'x',
			quiet: true,
		});
		expect(status.warnings).toEqual([
			'Data is piped in, but no flag tells what to do with it. It is not used.',
		]);
	});
});

describe('#742 the status tells about the piped data', () => {
	test('as the content that is updated', async () => {
		expect((await rrStatus('o', 'x', {pipedData: 'foo'})).pipe).toEqual({
			bytes: 3,
			type: 'CONTENT',
			updated: true,
		});
		expect((await rrStatus('z', 'x', {pipedData: 'foo'})).pipe.updated).toBe(false);
	});

	test('with the size in bytes', async () => {
		expect((await rrStatus('o', 'x', {pipedData: 'æø🦖'})).pipe.bytes).toBe(8);
	});

	test.each([
		['REPLACEMENT', {replacementPipe: true}],
		['JS', {replacementJs: true}],
		['JS', {replacementPipe: true, replacementJs: true}],
		['UNUSED', {}],
	])('as %s', async (type, flags) => {
		fs.writeFileSync('a.file', 'foo');
		const status = await rrStatus('o', 'pipe', {
			includeGlob: ['a.file'],
			pipedData: '"y"',
			...flags,
		});
		expect(status.pipe).toEqual({bytes: 3, type, updated: false});
	});
});

describe('#742 a panic', () => {
	test('stops the run with --halt, with the status so far', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'foo');
		fs.writeFileSync('c.file', 'foo');
		fs.chmodSync('b.file', 0);
		const config = {includeGlob: ['*.file'], halt: true};
		expect((await rr('o', 'x', config)).exit).toBe(3);
		fs.writeFileSync('a.file', 'foo');
		const status = await rrStatus('o', 'x', config);
		expect(status.files).toEqual({searched: ['a.file', 'b.file'], updated: ['a.file']});
		expect(status.errors[0]).toContain('EACCES');
	});

	test('is thrown when the run can not go on, with the error in the status', async () => {
		expect(await rr('(', 'x', {pipedData: 'foo'})).toMatchObject({out: '', exit: 3});
		expect((await rrStatus('(', 'x', {pipedData: 'foo'})).errors).toHaveLength(1);
	});
});

describe('#742 the engine part of the status', () => {
	const debug = {status: true, verbose: true};

	test('is only there with --verbose on --status or --status-compact', async () => {
		expect(await rrStatus('o', 'x', {pipedData: 'foo', verbose: true})).not.toHaveProperty(
			'engine'
		);
		expect(await rrStatus('o', 'x', {pipedData: 'foo', status: true})).not.toHaveProperty('engine');
		const status = await rrStatus('o', 'x', {
			pipedData: 'foo',
			statusCompact: true,
			verbose: true,
		});
		expect(status.engine.version).toMatch(/^\d+\.\d+\.\d+/);
		expect(status.engine.runtime).toBe('Bun JSC');
	});

	test('has the config as it came in, but not the piped data', async () => {
		const {config} = (await rrStatus('o', 'x', {pipedData: 'foo', ...debug})).engine;
		expect(config).toMatchObject({pattern: 'o', replacement: 'x', status: true});
		expect(config).not.toHaveProperty('pipedData');
		expect(config).not.toHaveProperty('statusInfo');
	});

	test.each([
		['a replacement', {}, 'x', null],
		['--js', {replacementJs: true}, null, '"x"'],
		['--output-match', {outputMatch: true}, null, null],
	])(
		'tells what the regex engine was asked to do with %s',
		async (name, flags, replacement, src) => {
			const code = flags.replacementJs ? '"x"' : 'x';
			const status = await rrStatus('o+', code, {
				pipedData: 'foo',
				voidMultiline: true,
				...debug,
				...flags,
			});
			expect(status.engine.execution).toEqual({
				search: 'o+',
				flags: 'gi',
				replacement,
				replacementSrc: src,
			});
		}
	);

	test('has the steps of the run in order, also when they are not printed', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.writeFileSync('b.file', 'bar');
		const config = {includeGlob: ['*.file'], ...debug, quietTotal: true};
		expect((await rr('o', 'x', config)).err).toBe('');
		fs.writeFileSync('a.file', 'foo');
		expect((await rrStatus('o', 'x', config)).engine.steps).toEqual([
			'2 files found',
			'Open sync: a.file',
			'Work on content from: a.file',
			'Write new content to: a.file',
			'Open sync: b.file',
			'Work on content from: b.file',
			'Nothing changed in: b.file',
		]);
	});

	test('tells the replacement that was piped in', async () => {
		fs.writeFileSync('a.file', 'foo');
		const status = await rrStatus('o', '_', {
			includeGlob: ['a.file'],
			pipedData: 'y',
			replacementPipe: true,
			...debug,
		});
		expect(status.engine.execution.replacement).toBe('y');
	});
});

describe('#742 the CLI', () => {
	test('--status prints a line break and the status report with an indent of two spaces after the result', async () => {
		fs.writeFileSync('a.file', 'foo');
		const result = await sh($`bun ${cli} o x a.file --status`);
		const status = {
			files: {searched: ['a.file'], updated: ['a.file']},
			pipe: null,
			warnings: [],
			errors: [],
		};
		expect(result).toEqual({
			out: 'a.file\n\n' + JSON.stringify(status, null, 2) + '\n',
			err: '',
			exit: 0,
		});
	});

	test.each(['--status-compact', '-c'])(
		'%s prints the status report on one line, with no line break in front',
		async flag => {
			fs.writeFileSync('a.file', 'foo');
			const result = await sh($`bun ${cli} o x a.file ${flag} --quiet-total`);
			expect(result.out).toBe(
				'{"files":{"searched":["a.file"],"updated":["a.file"]},"pipe":null,"warnings":[],"errors":[]}\n'
			);
		}
	);

	test('sets the exit code to 2 when a file gives an error, and prints the status report', async () => {
		fs.writeFileSync('a.file', 'foo');
		fs.chmodSync('a.file', 0);
		const result = await sh($`bun ${cli} o x a.file --status-compact --quiet-total`);
		expect(JSON.parse(result.out).errors[0]).toContain('EACCES');
		expect(result.exit).toBe(2);
	});

	test('ends the process on a panic, and still prints the status report', async () => {
		fs.writeFileSync('a.file', 'foo');
		const result = await sh($`bun ${cli} '(' x a.file --status-compact --quiet-total`);
		expect(JSON.parse(result.out).errors).toHaveLength(1);
		expect(result.exit).toBe(3);
	});
});
