import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import path from 'path';
import {rr} from './helper.js';

const js = async (pattern, code, pipedData, config) =>
	(await rr(pattern, code, {pipedData, replacementJs: true, ...config})).out;

// Run `code` against my.file holding `text` and return what it gives
const inFile = async (code, text = 'foobar', file = 'my.file') => {
	fs.mkdirSync(path.dirname(file), {recursive: true});
	fs.writeFileSync(file, text);
	return (
		await rr('^[^]*$', code, {
			includeGlob: [file],
			replacementJs: true,
			output: true,
			// Without the tail only the value of the code is given
			contentDelimiterTail: false,
			voidMultiline: true,
		})
	).out;
};

const timestamp = /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{3}$/;

describe('--replacement-js', () => {
	test('treats the replacement as javascript', async () => {
		expect(await js('foo', '2+2', 'foobar')).toBe('4bar');
	});

	test('is not the default', async () => {
		expect((await rr('foo', '2+2', {pipedData: 'foobar'})).out).toBe('2+2bar');
	});

	test('uses the value of the last statement', async () => {
		expect(await js('foo', 'var i = 2; i + 2', 'foobar')).toBe('4bar');
		expect(
			await js('foo', 'const list = [1, 2, 3]; list.map((n) => n * 2).join("-")', 'foobar')
		).toBe('2-4-6bar');
	});

	test('turns the value into a string', async () => {
		expect(await js('foo', '1/3 > 0', 'foobar')).toBe('truebar');
		expect(await js('foo', 'null', 'foobar')).toBe('nullbar');
		expect(await js('foo', 'undefined', 'foobar')).toBe('undefinedbar');
		expect(await js('foo', '[1, [2, 3]]', 'foobar')).toBe('1,2,3bar');
	});

	test('writes the result to the file', async () => {
		fs.writeFileSync('my.file', 'foobar');
		await rr('foo', '"x".repeat(3)', {includeGlob: ['my.file'], replacementJs: true});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('xxxbar');
	});

	test('throws the errors of the code', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const config = {includeGlob: ['my.file'], replacementJs: true};
		await expect(rr('foo', 'this is not javascript', config)).rejects.toThrow(SyntaxError);
		await expect(rr('foo', 'nope.nope', config)).rejects.toThrow(ReferenceError);
		await expect(rr('foo', 'throw new Error("my own")', config)).rejects.toThrow('my own');
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
	});

	describe('matches', () => {
		test('are available as $0, $1, $2...', async () => {
			expect(await js('(f)(o)o', '$0.toUpperCase() + $2 + $1', 'foobar')).toBe('FOOofbar');
		});

		test('are available as €0, €1, €2...', async () => {
			expect(await js('(f)(o)o', '€0.toUpperCase() + €2 + €1', 'foobar')).toBe('FOOofbar');
		});

		test('are plain strings no matter what they contain', async () => {
			const text = `'"\`\\ \n\t\r\u2028 \${1} $& 🦖`;
			expect(await js('[^]+', '$0', text)).toBe(text);
			expect(await js('([^]+)', '$1.length', text)).toBe(String(text.length));
		});

		test('are undefined for a group that did not take part', async () => {
			expect(await js('(o)|(b)', 'typeof $1 + "/" + typeof $2 + " "', 'ob')).toBe(
				'string/undefined undefined/string '
			);
		});

		test('can be more than nine groups', async () => {
			expect(await js('(a)(b)(c)(d)(e)(f)(g)(h)(i)(j)(k)', '$11 + $10 + $1', 'abcdefghijk')).toBe(
				'kja'
			);
		});

		test('make the code run once per match', async () => {
			expect(await js('(\\d)', '$1 * 2', '1 2 3')).toBe('2 4 6');
			globalThis.rexreplaceTestRuns = 0;
			expect(await js('o', '$0; ++rexreplaceTestRuns', 'foo boo')).toBe('f12 b34');
			delete globalThis.rexreplaceTestRuns;
		});

		test('not being used make the code run only once per file', async () => {
			globalThis.rexreplaceTestRuns = 0;
			expect(await js('o', '++rexreplaceTestRuns', 'foo boo')).toBe('f11 b11');
			delete globalThis.rexreplaceTestRuns;
		});
	});

	describe('variables', () => {
		test('fs, path and globs are available', async () => {
			expect(await inFile('typeof fs.readFileSync + typeof path.join + typeof globs.sync')).toBe(
				'functionfunctionfunction'
			);
			expect(await inFile('fs.readFileSync(file, "utf8").toUpperCase()')).toBe('FOOBAR');
			expect(await inFile('globs.sync("*").join()')).toBe('my.file');
		});

		test('require and r find files relative to the current dir', async () => {
			fs.writeFileSync('data.json', '{"version": "1.2.3"}');
			expect(await inFile('require("./data.json").version')).toBe('1.2.3');
			expect(await inFile('r("./data.json").version')).toBe('1.2.3');
			expect(await inFile('r("data.json").version')).toBe('1.2.3');
			expect(await inFile('r("data").version')).toBe('1.2.3');
			expect(await inFile('r(cwd + "/data.json").version')).toBe('1.2.3');
			expect(await inFile('require("path").sep')).toBe(path.sep);
		});

		test('text is the full content and find is the pattern', async () => {
			expect(await js('o', '"[" + text + "|" + find + "]"', 'fo\nbo')).toBe(
				'f[fo\nbo|o]\nb[fo\nbo|o]'
			);
		});

		test('pipe is the piped data', async () => {
			expect(await js('o', 'pipe', 'fo')).toBe('ffo');
			expect(await js('o', 'pipe_', 'fo')).toBe('ffo ');
			fs.writeFileSync('my.file', 'foobar');
			const config = {includeGlob: ['my.file'], replacementJs: true, output: true};
			expect((await rr('foo', 'pipe', {...config, pipedData: 'boo'})).out).toBe('boobar\n');
		});

		test('pipe is null and pipe_ is ❌ without piped data', async () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {includeGlob: ['my.file'], replacementJs: true, output: true};
			expect((await rr('foo', 'String(pipe) + pipe_', config)).out).toBe('null❌ bar\n');
			expect((await rr('(o)', 'pipe_ + €1', config)).out).toBe('f❌ o❌ obar\n');
		});

		test('file, file_rel, dirpath, dirpath_rel, dirname, filename, name and ext tell about the file', async () => {
			const code =
				'[file, file_rel, dirpath, dirpath_rel, dirname, filename, name, ext].join("\\n")';
			const cwd = process.cwd();

			expect((await inFile(code)).split('\n')).toEqual([
				path.join(cwd, 'my.file'),
				'my.file',
				cwd,
				'',
				path.basename(cwd),
				'my.file',
				'my',
				'.file',
			]);

			expect((await inFile(code, 'foobar', 'sub/dir/my.file.txt')).split('\n')).toEqual([
				path.join(cwd, 'sub/dir/my.file.txt'),
				path.join('sub/dir/my.file.txt'),
				path.join(cwd, 'sub/dir'),
				path.join('sub/dir'),
				'dir',
				'my.file.txt',
				'my.file',
				'.txt',
			]);
		});

		test('the file variables are ❌ for piped data', async () => {
			const code =
				'[file, file_rel, dirpath, dirpath_rel, dirname, filename, name, ext, mtime, ctime].join("")';
			expect(await js('foobar', code, 'foobar')).toBe('❌'.repeat(10));
		});

		test('cwd is the current working dir', async () => {
			expect(await inFile('cwd')).toBe(process.cwd());
			expect(await js('foo', 'cwd', 'foo')).toBe(process.cwd());
		});

		test('bytes and size tell the size of the content', async () => {
			expect(await inFile('bytes + "|" + size')).toBe('6|6 Bytes');
			expect(await inFile('bytes + "|" + size', 'x')).toBe('1|1 Byte');
			expect(await inFile('bytes + "|" + size', 'æ🦖')).toBe('6|6 Bytes');
			expect(await inFile('bytes + "|" + size', 'x'.repeat(1024))).toBe('1024|1.0 KB');
			expect(await inFile('bytes + "|" + size', 'x'.repeat(1536))).toBe('1536|1.5 KB');
			expect(await inFile('bytes + "|" + size', 'x'.repeat(3 * 1024 * 1024))).toBe(
				'3145728|3.0 MB'
			);
			expect(await js('foobar', 'bytes + "|" + size', 'foobar')).toBe('6|6 Bytes');
		});

		test('size of empty content is "0 Bytes" (#687)', async () => {
			expect(await inFile('bytes + "|" + size', '')).toBe('0|0 Bytes');
		});

		test('time and now tell when rexreplace was started', async () => {
			expect(await inFile('time')).toMatch(timestamp);
			expect(await inFile('now === time')).toBe('true');
			expect(await inFile('time_obj instanceof Date')).toBe('true');
			expect(Math.abs(Date.now() - Number(await inFile('time_obj.getTime()')))).toBeLessThan(60000);
		});

		test('mtime and ctime tell about the last change of the file', async () => {
			fs.writeFileSync('my.file', 'foobar');
			const longAgo = new Date('2001-02-03T04:05:06.789Z');
			fs.utimesSync('my.file', longAgo, longAgo);
			const config = {
				includeGlob: ['my.file'],
				replacementJs: true,
				output: true,
				contentDelimiterTail: false,
			};

			expect((await rr('foobar', 'mtime', config)).out).toMatch(timestamp);
			expect((await rr('foobar', 'mtime_obj.toISOString()', config)).out).toBe(
				longAgo.toISOString()
			);
			expect((await rr('foobar', 'ctime', config)).out).toMatch(timestamp);
			expect((await rr('foobar', 'ctime_obj > mtime_obj', config)).out).toBe('true');
		});

		test('nl is a newline and _ is a space', async () => {
			expect(await js('foo', 'JSON.stringify(nl + _)', 'foo')).toBe('"\\n "');
		});

		test('most variables come in a version with a space after', async () => {
			const names = [
				'find',
				'text',
				'file',
				'file_rel',
				'dirpath',
				'dirpath_rel',
				'dirname',
				'filename',
				'name',
				'ext',
				'cwd',
				'now',
				'time',
				'mtime',
				'ctime',
				'bytes',
				'size',
			];
			const code = `[${names.map(name => `${name}_ === ${name} + " "`).join()}].join()`;
			expect(await inFile(code)).toBe(names.map(() => 'true').join());
			expect(await js('foobar', code, 'foobar')).toBe(names.map(() => 'true').join());
		});

		test('are the same when the code runs once per match', async () => {
			expect(await inFile('$0; [filename, name, ext, bytes, text, find, _, nl].join("|")')).toBe(
				'my.file|my|.file|6|foobar|^[^]*$| |\n'
			);
		});

		test('follow the file when several files are handled', async () => {
			fs.writeFileSync('a.txt', 'x');
			fs.writeFileSync('b.md', 'xx');
			const config = {includeGlob: ['a.txt', 'b.md'], replacementJs: true, output: true};
			expect((await rr('x+', 'name + ext + bytes + nl', config)).out).toBe('a.txt1\nb.md2\n');
		});
	});

	test('the result of the code is inserted as it is, also $& and $$ (#689)', async () => {
		expect(await js('o', '"$" + "&"', 'fo')).toBe('f$&');
		expect(await js('o', '"$" + "$"', 'fo')).toBe('f$$');
	});

	describe('combined', () => {
		test('with --void-euro there is only the $ to get to the groups', async () => {
			expect(await js('(o)', '$1.toUpperCase()', 'fo', {voidEuro: true})).toBe('fO');
			await expect(js('(o)', '€1.toUpperCase()', 'fo', {voidEuro: true})).rejects.toThrow(
				SyntaxError
			);
		});

		test('with --void-section a § can be used in the code', async () => {
			expect(await js('o', '"§".length', 'fo', {voidSection: true})).toBe('f1');
		});

		test('with --literal', async () => {
			expect(await js('$0', '$0.length', 'a $0', {literal: true})).toBe('a 2');
		});

		test('with --void-global the code only runs for the first match', async () => {
			expect(await js('(o)', '$1.toUpperCase()', 'foo', {voidGlobal: true})).toBe('fOo');
		});

		test('with --void-ignore-case, --dot-all, --void-multiline and --unicode', async () => {
			const config = {voidIgnoreCase: true, dotAll: true, voidMultiline: true, unicode: true};
			expect(await js('^a(.+)b$', 'Array.from($1).length', 'a🦖\n🦕b', config)).toBe('3');
		});

		test('with --replacement-pipe the code is piped in', async () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {
				includeGlob: ['my.file'],
				replacementJs: true,
				replacementPipe: true,
				pipedData: '$0.length + name',
			};
			await rr('fo+', '_', config);
			expect(fs.readFileSync('my.file', 'utf8')).toBe('3mybar');
		});

		test('with --keep-backup', async () => {
			fs.writeFileSync('my.file', 'foobar');
			await rr('foo', 'filename', {
				includeGlob: ['my.file'],
				replacementJs: true,
				keepBackup: true,
			});
			expect(fs.readFileSync('my.file', 'utf8')).toBe('my.filebar');
			expect(fs.readdirSync('.')).toHaveLength(2);
		});

		test('with --exclude-glob', async () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'foo');
			const config = {
				includeGlob: ['*.file'],
				excludeGlob: ['a.*'],
				replacementJs: true,
				output: true,
			};
			expect((await rr('foo', 'name', config)).out).toBe('b\n');
		});
	});
});
