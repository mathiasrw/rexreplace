import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import path from 'path';
import {rr} from './helper.js';

const js = (pattern, code, pipedData, config) =>
	rr(pattern, code, {pipedData, replacementJs: true, ...config}).out;

// Run `code` against my.file holding `text` and return what it gives
const inFile = (code, text = 'foobar', file = 'my.file') => {
	fs.mkdirSync(path.dirname(file), {recursive: true});
	fs.writeFileSync(file, text);
	return rr('^[^]*$', code, {
		includeGlob: [file],
		replacementJs: true,
		output: true,
		voidMultiline: true,
	}).out;
};

const timestamp = /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{3}$/;

describe('--replacement-js', () => {
	test('treats the replacement as javascript', () => {
		expect(js('foo', '2+2', 'foobar')).toBe('4bar');
	});

	test('is not the default', () => {
		expect(rr('foo', '2+2', {pipedData: 'foobar'}).out).toBe('2+2bar');
	});

	test('uses the value of the last statement', () => {
		expect(js('foo', 'var i = 2; i + 2', 'foobar')).toBe('4bar');
		expect(
			js('foo', 'const list = [1, 2, 3]; list.map((n) => n * 2).join("-")', 'foobar')
		).toBe('2-4-6bar');
	});

	test('turns the value into a string', () => {
		expect(js('foo', '1/3 > 0', 'foobar')).toBe('truebar');
		expect(js('foo', 'null', 'foobar')).toBe('nullbar');
		expect(js('foo', 'undefined', 'foobar')).toBe('undefinedbar');
		expect(js('foo', '[1, [2, 3]]', 'foobar')).toBe('1,2,3bar');
	});

	test('writes the result to the file', () => {
		fs.writeFileSync('my.file', 'foobar');
		rr('foo', '"x".repeat(3)', {includeGlob: ['my.file'], replacementJs: true});
		expect(fs.readFileSync('my.file', 'utf8')).toBe('xxxbar');
	});

	test('throws the errors of the code', () => {
		fs.writeFileSync('my.file', 'foobar');
		const config = {includeGlob: ['my.file'], replacementJs: true};
		expect(() => rr('foo', 'this is not javascript', config)).toThrow(SyntaxError);
		expect(() => rr('foo', 'nope.nope', config)).toThrow(ReferenceError);
		expect(() => rr('foo', 'throw new Error("my own")', config)).toThrow('my own');
		expect(fs.readFileSync('my.file', 'utf8')).toBe('foobar');
	});

	describe('matches', () => {
		test('are available as $0, $1, $2...', () => {
			expect(js('(f)(o)o', '$0.toUpperCase() + $2 + $1', 'foobar')).toBe('FOOofbar');
		});

		test('are available as €0, €1, €2...', () => {
			expect(js('(f)(o)o', '€0.toUpperCase() + €2 + €1', 'foobar')).toBe('FOOofbar');
		});

		test('are plain strings no matter what they contain', () => {
			const text = `'"\`\\ \n\t\r\u2028 \${1} $& 🦖`;
			expect(js('[^]+', '$0', text)).toBe(text);
			expect(js('([^]+)', '$1.length', text)).toBe(String(text.length));
		});

		test('are undefined for a group that did not take part', () => {
			expect(js('(o)|(b)', 'typeof $1 + "/" + typeof $2 + " "', 'ob')).toBe(
				'string/undefined undefined/string '
			);
		});

		test('can be more than nine groups', () => {
			expect(js('(a)(b)(c)(d)(e)(f)(g)(h)(i)(j)(k)', '$11 + $10 + $1', 'abcdefghijk')).toBe(
				'kja'
			);
		});

		test('make the code run once per match', () => {
			expect(js('(\\d)', '$1 * 2', '1 2 3')).toBe('2 4 6');
			globalThis.rexreplaceTestRuns = 0;
			expect(js('o', '$0; ++rexreplaceTestRuns', 'foo boo')).toBe('f12 b34');
			delete globalThis.rexreplaceTestRuns;
		});

		test('not being used make the code run only once per file', () => {
			globalThis.rexreplaceTestRuns = 0;
			expect(js('o', '++rexreplaceTestRuns', 'foo boo')).toBe('f11 b11');
			delete globalThis.rexreplaceTestRuns;
		});
	});

	describe('variables', () => {
		test('fs, path and globs are available', () => {
			expect(inFile('typeof fs.readFileSync + typeof path.join + typeof globs.sync')).toBe(
				'functionfunctionfunction'
			);
			expect(inFile('fs.readFileSync(file, "utf8").toUpperCase()')).toBe('FOOBAR');
			expect(inFile('globs.sync("*").join()')).toBe('my.file');
		});

		test('require and r find files relative to the current dir', () => {
			fs.writeFileSync('data.json', '{"version": "1.2.3"}');
			expect(inFile('require("./data.json").version')).toBe('1.2.3');
			expect(inFile('r("./data.json").version')).toBe('1.2.3');
			expect(inFile('r("data.json").version')).toBe('1.2.3');
			expect(inFile('r("data").version')).toBe('1.2.3');
			expect(inFile('r(cwd + "/data.json").version')).toBe('1.2.3');
			expect(inFile('require("path").sep')).toBe(path.sep);
		});

		test('text is the full content and find is the pattern', () => {
			expect(js('o', '"[" + text + "|" + find + "]"', 'fo\nbo')).toBe(
				'f[fo\nbo|o]\nb[fo\nbo|o]'
			);
		});

		test('pipe is the piped data', () => {
			expect(js('o', 'pipe', 'fo')).toBe('ffo');
			fs.writeFileSync('my.file', 'foobar');
			const config = {includeGlob: ['my.file'], replacementJs: true, output: true};
			expect(rr('foo', 'pipe', {...config, pipedData: 'boo'}).out).toBe('boobar');
			expect(rr('foo', 'String(pipe)', config).out).toBe('nullbar');
		});

		test('file, file_rel, dirpath, dirpath_rel, dirname, filename, name and ext tell about the file', () => {
			const code =
				'[file, file_rel, dirpath, dirpath_rel, dirname, filename, name, ext].join("\\n")';
			const cwd = process.cwd();

			expect(inFile(code).split('\n')).toEqual([
				path.join(cwd, 'my.file'),
				'my.file',
				cwd,
				'',
				path.basename(cwd),
				'my.file',
				'my',
				'.file',
			]);

			expect(inFile(code, 'foobar', 'sub/dir/my.file.txt').split('\n')).toEqual([
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

		test('the file variables are ❌ for piped data', () => {
			const code =
				'[file, file_rel, dirpath, dirpath_rel, dirname, filename, name, ext, mtime, ctime].join("")';
			expect(js('foobar', code, 'foobar')).toBe('❌'.repeat(10));
		});

		test('cwd is the current working dir', () => {
			expect(inFile('cwd')).toBe(process.cwd());
			expect(js('foo', 'cwd', 'foo')).toBe(process.cwd());
		});

		test('bytes and size tell the size of the content', () => {
			expect(inFile('bytes + "|" + size')).toBe('6|6 Bytes');
			expect(inFile('bytes + "|" + size', 'x')).toBe('1|1 Byte');
			expect(inFile('bytes + "|" + size', 'æ🦖')).toBe('6|6 Bytes');
			expect(inFile('bytes + "|" + size', 'x'.repeat(1024))).toBe('1024|1.0 KB');
			expect(inFile('bytes + "|" + size', 'x'.repeat(1536))).toBe('1536|1.5 KB');
			expect(inFile('bytes + "|" + size', 'x'.repeat(3 * 1024 * 1024))).toBe(
				'3145728|3.0 MB'
			);
			expect(js('foobar', 'bytes + "|" + size', 'foobar')).toBe('6|6 Bytes');
		});

		test.todo('BUG #687: size of empty content is "0 Bytes"', () => {
			expect(inFile('bytes + "|" + size', '')).toBe('0|0 Bytes');
		});

		test('time and now tell when rexreplace was started', () => {
			expect(inFile('time')).toMatch(timestamp);
			expect(inFile('now === time')).toBe('true');
			expect(inFile('time_obj instanceof Date')).toBe('true');
			expect(Math.abs(Date.now() - Number(inFile('time_obj.getTime()')))).toBeLessThan(60000);
		});

		test('mtime and ctime tell about the last change of the file', () => {
			fs.writeFileSync('my.file', 'foobar');
			const longAgo = new Date('2001-02-03T04:05:06.789Z');
			fs.utimesSync('my.file', longAgo, longAgo);
			const config = {includeGlob: ['my.file'], replacementJs: true, output: true};

			expect(rr('foobar', 'mtime', config).out).toMatch(timestamp);
			expect(rr('foobar', 'mtime_obj.toISOString()', config).out).toBe(longAgo.toISOString());
			expect(rr('foobar', 'ctime', config).out).toMatch(timestamp);
			expect(rr('foobar', 'ctime_obj > mtime_obj', config).out).toBe('true');
		});

		test('nl is a newline and _ is a space', () => {
			expect(js('foo', 'JSON.stringify(nl + _)', 'foo')).toBe('"\\n "');
		});

		test('most variables come in a version with a space after', () => {
			const names = [
				'pipe',
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
			const code = `[${names.map((name) => `${name}_ === ${name} + " "`).join()}].join()`;
			expect(inFile(code)).toBe(names.map(() => 'true').join());
			expect(js('foobar', code, 'foobar')).toBe(names.map(() => 'true').join());
		});

		test('are the same when the code runs once per match', () => {
			expect(inFile('$0; [filename, name, ext, bytes, text, find, _, nl].join("|")')).toBe(
				'my.file|my|.file|6|foobar|^[^]*$| |\n'
			);
		});

		test('follow the file when several files are handled', () => {
			fs.writeFileSync('a.txt', 'x');
			fs.writeFileSync('b.md', 'xx');
			const config = {includeGlob: ['a.txt', 'b.md'], replacementJs: true, output: true};
			expect(rr('x+', 'name + ext + bytes + nl', config).out).toBe('a.txt1\nb.md2\n');
		});
	});

	test.todo(
		'BUG #689: the result of the code is inserted as it is (now $& and $$ in it are expanded)',
		() => {
			expect(js('o', '"$" + "&"', 'fo')).toBe('f$&');
			expect(js('o', '"$" + "$"', 'fo')).toBe('f$$');
		}
	);

	describe('combined', () => {
		test('with --void-euro there is only the $ to get to the groups', () => {
			expect(js('(o)', '$1.toUpperCase()', 'fo', {voidEuro: true})).toBe('fO');
			expect(() => js('(o)', '€1.toUpperCase()', 'fo', {voidEuro: true})).toThrow(
				SyntaxError
			);
		});

		test('with --void-section a § can be used in the code', () => {
			expect(js('o', '"§".length', 'fo', {voidSection: true})).toBe('f1');
		});

		test('with --literal', () => {
			expect(js('$0', '$0.length', 'a $0', {literal: true})).toBe('a 2');
		});

		test('with --void-global the code only runs for the first match', () => {
			expect(js('(o)', '$1.toUpperCase()', 'foo', {voidGlobal: true})).toBe('fOo');
		});

		test('with --void-ignore-case, --dot-all, --void-multiline and --unicode', () => {
			const config = {voidIgnoreCase: true, dotAll: true, voidMultiline: true, unicode: true};
			expect(js('^a(.+)b$', 'Array.from($1).length', 'a🦖\n🦕b', config)).toBe('3');
		});

		test('with --replacement-pipe the code is piped in', () => {
			fs.writeFileSync('my.file', 'foobar');
			const config = {
				includeGlob: ['my.file'],
				replacementJs: true,
				replacementPipe: true,
				pipedData: '$0.length + name',
			};
			rr('fo+', '_', config);
			expect(fs.readFileSync('my.file', 'utf8')).toBe('3mybar');
		});

		test('with --keep-backup', () => {
			fs.writeFileSync('my.file', 'foobar');
			rr('foo', 'filename', {
				includeGlob: ['my.file'],
				replacementJs: true,
				keepBackup: true,
			});
			expect(fs.readFileSync('my.file', 'utf8')).toBe('my.filebar');
			expect(fs.readdirSync('.')).toHaveLength(2);
		});

		test('with --exclude-glob', () => {
			fs.writeFileSync('a.file', 'foo');
			fs.writeFileSync('b.file', 'foo');
			const config = {
				includeGlob: ['*.file'],
				excludeGlob: ['a.*'],
				replacementJs: true,
				output: true,
			};
			expect(rr('foo', 'name', config).out).toBe('b');
		});
	});
});
