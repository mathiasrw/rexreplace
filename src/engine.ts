const fs = require('fs');

const os = require('os');

const path = require('path');

const globs = require('fast-glob');

const now = new Date();

import {outputConfig, chat, info, print, printDone, warn, error, panic} from './output.ts';

import './shim.ts';

const re = {
	mctime: /[mc]time/,
	colon: /:/g,
	capturedGroupRef: /\$\d/,
	// Only the chars with a meaning outside a character class. Unicode mode does not allow to escape the others (#686).
	regexSpecialChars: /[\[\]{}()*+?.\/\\^$|]/g,
	byteOrSize: /bytes|size/,
	folderName: /[\\\/]+([^\\\/]+)[\\\/]+[^\\\/]+$/,
};

// Only the version ends up in the bundle
import {version} from '../package.json';
export {version};

// The regex engine comes with the runtime: Node has V8 and Bun has JSC (JavaScriptCore)
const runtime = process.versions.bun ? 'Bun' : 'Node';
const runtimeEngine = process.versions.bun ? 'JSC' : 'V8';

function validateEncoding(encoding = 'utf8') {
	if (!Buffer.isEncoding(encoding)) {
		panic('Unknown encoding:', encoding);
	}
}

// Resolves with the status of the run when all files are done.
// When the run can not go on, a panic is thrown with the status so far.
export async function engine(config: any = {engine: 'default'}) {
	config.statusInfo = newStatus(config);
	outputConfig(config);
	try {
		await run(config);
	} catch (e) {
		if (e?.panic) {
			e.status = config.statusInfo;
		}
		throw e;
	} finally {
		printDone();
	}
	return config.statusInfo;
}

function newStatus(config) {
	const status: any = {files: {searched: [], updated: []}, pipe: null, warnings: [], errors: []};

	// The old and the new path of each file that is renamed, or would be
	if (config.rename) {
		status.renames = [];
	}

	// The status report with --verbose also tells what went into the engine and what it did.
	// The config is copied before it gets the status, and the piped data is told about in `pipe`.
	if (config.verbose && (config.status || config.statusCompact)) {
		status.engine = {
			version,
			runtime: runtime + ' ' + runtimeEngine,
			config: JSON.parse(
				JSON.stringify(config, (key, value) =>
					'statusInfo' === key || 'pipedData' === key ? undefined : value
				)
			),
			execution: null,
			steps: [],
		};
	}

	return status;
}

async function run(config) {
	validateEncoding(config.encoding);

	// With --glob-pipe each line of the piped data is a path or a glob, used together with the ones given as arguments
	if (config.globPipe) {
		if (config.replacementPipe || config.pipe) {
			panic(
				'--glob-pipe can not be used with --replacement-pipe or --pipe, as the piped data can only be one thing'
			);
		}
		config.pipedDataUsed = true;
		const lines = (config.pipedData ?? '').split(config.nullIn ? '\0' : /\r?\n/);
		config.includeGlob = config.includeGlob.concat(lines.filter(line => '' !== line));
	}

	config.pattern = getFinalPattern(config.pattern, config) || '';

	config.replacement = getFinalReplacement(config.replacement, config) || '';

	config.replacementOri = config.replacement;

	// The most specific delimiter wins. Without one there is a line break after each item, unless it already ends with one.
	const delimiter = config.delimiter ?? (config.nullOut ? '\0' : null);
	config.nameDelimiter = config.nameDelimiter ?? delimiter;
	config.contentDelimiter = config.contentDelimiter ?? delimiter;

	// --output-match wins over --output
	config.output = config.output && !config.outputMatch;

	config.regex = getFinalRegex(config.pattern, config) || '';

	// What the regex engine is asked to do. With --replacement-js and --output-match it gets a function.
	if (config.statusInfo.engine) {
		config.statusInfo.engine.execution = {
			search: config.regex.source,
			flags: config.regex.flags,
			replacement: config.replacementJs || config.outputMatch ? null : config.replacement,
			replacementSrc: config.replacementJs && !config.outputMatch ? config.replacementOri : null,
		};
	}

	const piped = handlePipedData(config);

	if (null !== config.pipedData) {
		config.statusInfo.pipe = {
			bytes: Buffer.byteLength(config.pipedData, config.encoding),
			type: pipeType(config, piped),
			updated: false,
		};
	}

	// The more specific tail wins. Piped data that is printed is left as it came in, but matches are matches, from a file or a pipe.
	config.nameDelimiterTail = config.nameDelimiterTail ?? config.tail ?? true;
	config.contentDelimiterTail =
		config.contentDelimiterTail ?? config.tail ?? !(piped && config.output);

	if (config.rename && piped) {
		panic('--rename needs files, as piped data has no name to change');
	}

	if (piped) {
		return doReplacement('Piped data', config, config.pipedData);
	}

	config.files = getFilePaths(config);

	// Nothing to do is not an error, so a glob or a pipe that gives no files does not stop a script
	if (!config.files.length) {
		return warn('0 files found');
	}

	chat(config.files.length + ' files found');

	// One file needs no async flow, and with -o or -m one file at a time gives the output in order
	config.voidAsync =
		config.voidAsync || 1 === config.files.length || config.output || config.outputMatch;

	const files = config.files.filter(filepath =>
		fs.existsSync(filepath) ? true : error('File not found:', filepath)
	);

	if (config.rename) {
		return renameFiles(files, config);
	}

	// A limited number of files are in work at the same time, so the memory and the open files stay within bounds.
	// Each worker takes the next file when it is done with one. Up to 16 files are all handled at once.
	const workers = config.voidAsync
		? 1
		: files.length <= 16
			? files.length
			: Math.max(16, os.availableParallelism() * 2);
	let next = 0;
	const worker = async () => {
		while (next < files.length) {
			await openFile(files[next++], config);
		}
	};

	await Promise.all(Array.from({length: workers}, worker));
}

function openFile(file, config) {
	config.statusInfo.files.searched.push(file);
	if (config.voidAsync) {
		chat('Open sync: ' + file);
		let data;
		try {
			data = fs.readFileSync(file, config.encoding);
		} catch (e) {
			return error(e);
		}
		return doReplacement(file, config, data);
	} else {
		chat('Open async: ' + file);
		return fs.promises
			.readFile(file, config.encoding)
			.then(data => doReplacement(file, config, data), error);
	}
}

// postfix argument names to limit the probabillity of user inputted javascript accidently using same values
function doReplacement(_file_rr: string, _config_rr: any, _data_rr: string) {
	chat('Work on content from: ' + _file_rr);

	// Main regexp of the whole thing. With --output-match the replacement prints the matches, so the code of --replacement-js is not run.
	const result = _data_rr.replace(
		_config_rr.regex,
		_config_rr.replacementJs && !_config_rr.outputMatch
			? dynamicReplacement(_file_rr, _config_rr, _data_rr)
			: _config_rr.replacement
	);

	if (_config_rr.output || _config_rr.outputMatch) {
		// With --output-match the matches are printed by the replacement
		if (_config_rr.output) {
			chat('Output result from: ' + _file_rr);
			print(result, _config_rr.contentDelimiter, _config_rr.contentDelimiterTail);
		}
		// The file is not changed, but it is still named if its content would change
		if (_config_rr.dataIsPiped) {
			_config_rr.statusInfo.pipe.updated = result !== _data_rr;
		} else if (result !== _data_rr) {
			updated(_file_rr, _config_rr);
		} else if (_config_rr.nameAll) {
			info(_file_rr);
		}
		return;
	}

	// Nothing replaced = no need for writing file again
	if (result === _data_rr) {
		chat('Nothing changed in: ' + _file_rr);
		if (_config_rr.nameAll) {
			info(_file_rr);
		}
		return;
	}

	// --simulate does everything but write, so the file is named as if it was changed
	if (_config_rr.simulate) {
		return updated(_file_rr, _config_rr);
	}

	// Release the memory while storing files
	_data_rr = '';

	chat('Write new content to: ' + _file_rr);

	// Write directly to the same file (if the process is killed all new and old data is lost)
	if (_config_rr.voidBackup) {
		return fs.promises
			.writeFile(_file_rr, result, _config_rr.encoding)
			.then(() => updated(_file_rr, _config_rr), error);
	}

	//Make sure data is always on disk
	const oriFile = path.resolve(_file_rr);
	const salt = new Date().toISOString().replace(re.colon, '_').replace('Z', '');
	const backupFile = oriFile + '.' + salt + '.backup';

	if (_config_rr.voidAsync) {
		try {
			fs.renameSync(oriFile, backupFile);
			fs.writeFileSync(oriFile, result, _config_rr.encoding);
			if (!_config_rr.keepBackup) {
				fs.unlinkSync(backupFile);
			}
		} catch (e) {
			return error(e);
		}
		return updated(_file_rr, _config_rr);
	}

	return fs.promises
		.rename(oriFile, backupFile)
		.then(() => fs.promises.writeFile(oriFile, result, _config_rr.encoding))
		.then(() => _config_rr.keepBackup || fs.promises.unlink(backupFile))
		.then(() => updated(_file_rr, _config_rr), error);
}

// The content of the file was changed, or would be with --output and --output-match, so it is named
function updated(file, config) {
	config.statusInfo.files.updated.push(file);
	info(file);
}

// --rename: the path of each file is the content that is searched and replaced, and the file is renamed to the result
function renameFiles(files, config) {
	const plan = files.map(file => {
		config.statusInfo.files.searched.push(file);
		chat('Work on the path of: ' + file);
		const replacement =
			config.replacementJs && !config.outputMatch
				? dynamicReplacement(file, config, file)
				: config.replacement;
		return {old: file, new: file.replace(config.regex, replacement)};
	});
	const renames = plan.filter(item => item.new !== item.old);
	config.statusInfo.renames.push(...renames);

	// With --output-match the matches are printed by the replacement, and the names go to stderr
	if (config.outputMatch) {
		return plan.forEach(item =>
			item.new !== item.old ? updated(item.old, config) : config.nameAll && info(item.old)
		);
	}

	findClashes(renames, config);

	plan.forEach(item => {
		if (item.new === item.old) {
			chat('Same name: ' + item.old);
			return config.nameAll && nameRename(item, config);
		}
		// --simulate and --output do everything but rename
		if (config.simulate || config.output) {
			config.statusInfo.files.updated.push(item.old);
			return nameRename(item, config);
		}
		renameFile(item, config);
	});
}

// With --simulate and --output the old name goes to stderr and the new one to stdout, so they come in pairs in a terminal
function nameRename(item, config) {
	if (config.simulate || config.output) {
		info(item.old, process.stderr);
	}
	info(item.new, process.stdout);
}

// If planned renames clash the process is halted and no change is applied to any file.
// The paths are compared as absolute paths, as two relative paths can lead to the same file.
function findClashes(renames, config) {
	const byTarget = new Map();
	renames.forEach(item => {
		const target = path.resolve(item.new);
		byTarget.set(target, (byTarget.get(target) || []).concat(item));
	});
	const sources = new Set(renames.map(item => path.resolve(item.old)));
	const targets = new Set(byTarget.keys());
	const ontoRenamed = targets.intersection(sources);
	const ontoOthers = targets.difference(sources);

	const clashes = [];
	byTarget.forEach((items, target) => {
		const [item] = items;
		if (1 < items.length) {
			clashes.push(
				items.map(each => each.old).join(' and ') +
					(2 === items.length ? ' would both' : ' would all') +
					' be renamed to ' +
					item.new
			);
		} else if (ontoRenamed.has(target)) {
			clashes.push(item.old + ' would be renamed to ' + item.new + ', which is also renamed');
		} else if (ontoOthers.has(target) && !config.renameForce && isOtherFile(item.old, target)) {
			clashes.push(item.old + ' would be renamed to ' + item.new + ', which is there already');
		}
	});

	if (clashes.length) {
		clashes.forEach(clash => error(clash));
		panic('Planned renames clash, so no change is applied to any file');
	}
}

// On a file system that is case-insensitive, `A.md` is the same file as `a.md`, so a rename of only the case is not a clash
function isOtherFile(file, target) {
	const stats = fs.statSync(target, {throwIfNoEntry: false});
	if (!stats) {
		return false;
	}
	const own = fs.statSync(file);
	return own.dev !== stats.dev || own.ino !== stats.ino;
}

function renameFile(item, config) {
	const target = path.resolve(item.new);
	try {
		const folder = path.dirname(target);
		if (!fs.existsSync(folder)) {
			chat('Make folder: ' + path.dirname(item.new));
			fs.mkdirSync(folder, {recursive: true});
		}
		// Checked again, as the files can have changed since the clashes were found
		if (isOtherFile(item.old, target)) {
			if (!config.renameForce) {
				return error(item.new + ' is there already, so ' + item.old + ' is not renamed');
			}
			chat('Write over: ' + item.new);
		}
		// With --keep-backup the old file is kept, so the file is copied
		if (config.keepBackup) {
			chat('Copy: ' + item.old + ' to ' + item.new);
			fs.copyFileSync(item.old, target);
		} else {
			chat('Rename: ' + item.old + ' to ' + item.new);
			fs.renameSync(item.old, target);
		}
	} catch (e) {
		return error(e);
	}
	config.statusInfo.files.updated.push(item.old);
	info(item.new);
}

// How the piped data was used
function pipeType(config, piped) {
	if (config.globPipe) {
		return 'GLOBS';
	}
	if (piped) {
		return 'CONTENT';
	}
	if (config.replacementJs) {
		return 'JS';
	}
	if (config.replacementPipe) {
		return 'REPLACEMENT';
	}
	return 'UNUSED';
}

function handlePipedData(config) {
	if (config.includeGlob.length) {
		// Empty piped data (or only a line break) is not worth a warning
		if (
			!config.replacementJs &&
			!config.pipedDataUsed &&
			config.pipedData &&
			'\n' !== config.pipedData &&
			'\r\n' !== config.pipedData
		) {
			warn('Data is piped in, but no flag tells what to do with it. It is not used.');
		}

		return false;
	}

	if (null !== config.pipedData && !config.pipedDataUsed) {
		config.dataIsPiped = true;
		// Piped data is printed, unless only the matches are
		config.output = !config.outputMatch;
		return true;
	}

	return false;
}

function getFinalPattern(pattern, conf: any) {
	if (conf.literal) {
		pattern = pattern.replace(re.regexSpecialChars, '\\$&');
	}

	/*if (config.patternFile) {
		pattern = fs.readFileSync(pattern, 'utf8');
		pattern = new Function('return '+pattern)();
	}*/

	return pattern;
}

function getFinalReplacement(replacement, conf: any) {
	/*if(config.replacementFile){
		return oneLinerFromFile(fs.readFileSync(replacement,'utf8'));
	}*/

	if (conf.replacementPipe) {
		conf.pipedDataUsed = true;
		if (null === conf.pipedData) {
			return panic('No data piped into replacement');
		}
		replacement = conf.pipedData;
	}

	if (conf.outputMatch) {
		if (parseInt(process.versions.node) < 6) {
			return panic('outputMatch is only supported in node 6+');
		}

		return function (match, ...rest) {
			// The groups are followed by the offset and the full text, and by the named groups if the pattern has any.
			// Without groups the full match is printed, otherwise the groups are printed together.
			const groups = rest.slice(0, 'object' === typeof rest[rest.length - 1] ? -3 : -2);
			print(
				groups.length ? groups.join('') : match,
				conf.contentDelimiter,
				conf.contentDelimiterTail
			);
			return '';
		};
	}

	// If captured groups then run dynamicly
	//console.log(process);
	if (
		conf.replacementJs &&
		re.capturedGroupRef.test(conf.replacement) &&
		parseInt(process.versions.node) < 6
	) {
		return panic('Captured groups for javascript replacement is only supported in node 6+');
	}

	return replacement;
}

/*function oneLinerFromFile(str){
	let lines = str.split("\n");
	if(lines.length===1){
		return str;
	}
	return lines.map(function (line) {
		return line.trim();
	}).join(' ');
}*/

function getFinalRegex(pattern, config) {
	const engine = 'default' === config.engine ? runtimeEngine : config.engine;

	let regex;

	let flags = getFlags(config);

	switch (engine) {
		case runtimeEngine:
			try {
				regex = new RegExp(pattern, flags);
			} catch (e) {
				panic(e.message);
			}
			break;
		case 'V8':
		case 'JSC':
			panic(
				`When running via the ${runtime} runtime you can only use default or ${runtimeEngine} as engine`
			);
			break;
		case 'RE2':
			try {
				//const RE2 = require('re2');
				//regex = new RE2(pattern, flags);
				regex = new RegExp(pattern, flags);
			} catch (e) {
				panic(e.message);
			}
			break;
		default:
			panic(`Engine ${config.engine} not supported`);
	}

	return regex;
}

function getFlags(config) {
	let flags = '';

	if (!config.voidGlobal) {
		flags += 'g';
	}

	if (!config.voidIgnoreCase) {
		flags += 'i';
	}

	if (!config.voidMultiline) {
		flags += 'm';
	}

	if (config.dotAll) {
		flags += 's';
	}

	if (config.unicode) {
		flags += 'u';
	}

	return flags;
}

function readableSize(size) {
	if (1 === size) {
		return '1 Byte';
	}
	// 0 has no logarithm, so it is counted in bytes
	const i = size ? Math.floor(Math.log(size) / Math.log(1024)) : 0;
	return (
		(size / Math.pow(1024, i)).toFixed(!!i ? 1 : 0) + ' ' + ['Bytes', 'KB', 'MB', 'GB', 'TB'][i]
	);
}

function dynamicReplacement(_file_rr, _config_rr, _data_rr) {
	const _time_obj = now;
	const _time = localTimeString(_time_obj);
	const _pipe = _config_rr.pipedData,
		_text = _data_rr,
		_find = _config_rr.pattern,
		code_rr = _config_rr.replacementOri,
		_cwd = process.cwd(),
		_now = _time,
		_ = ' ',
		_nl = '\n';

	// biome-ignore format: one variable on each line
	let _file = '❌',
		_file_rel = '❌',
		_dirpath = '❌',
		_dirpath_rel = '❌',
		_dirname = '❌',
		_filename = '❌',
		_name = '❌',
		_ext = '❌',
		_mtime = '❌',
		_ctime = '❌',
		_mtime_obj = new Date(0),
		_ctime_obj = new Date(0),
		_bytes = -1,
		_size = '❌',
		dynamicContent = new Function(
			'require',
			'fs',
			'globs',
			'path',

			'pipe',
			'pipe_',

			'find',
			'find_',
			'text',
			'text_',

			'file',
			'file_',
			'file_rel',
			'file_rel_',

			'dirpath',
			'dirpath_',
			'dirpath_rel',
			'dirpath_rel_',

			'dirname',
			'dirname_',
			'filename',
			'filename_',
			'name',
			'name_',
			'ext',
			'ext_',
			'cwd',
			'cwd_',

			'now',
			'now_',
			'time_obj',
			'time',
			'time_',
			'mtime_obj',
			'mtime',
			'mtime_',
			'ctime_obj',
			'ctime',
			'ctime_',

			'bytes',
			'bytes_',
			'size',
			'size_',
			'nl',
			'_',
			'__code_rr',
			'var path = require("path");' +
			'var __require_ = require;' +
			'var r = function(file){' +
			'var result = null;' +
			'try{' +
			'result = __require_(file);' +
			'} catch (e){' +
			'var dir = /^[\\\/]/.test(file) ? "" : cwd;' +
			'result = __require_(path.resolve(dir, file));' +
			'};' +
			'return result;' +
			'};' +
			'require = r;' +
			'return eval(__code_rr);'
		);

	const needsByteOrSize = re.byteOrSize.test(_config_rr.replacement);
	const betterToReadfromFile = needsByteOrSize && 50000000 < _text.length; // around 50 Mb will lead to reading filezise from file instead of copying into buffer

	if (!_config_rr.dataIsPiped) {
		_file = path.resolve(_cwd, _file_rr);
		_file_rel = path.relative(_cwd, _file);
		const pathInfo = path.parse(_file);
		_dirpath = pathInfo.dir;
		_dirpath_rel = path.relative(_cwd, _dirpath);
		_dirname = (_file.match(re.folderName) || ' _')[1];
		_filename = pathInfo.base;
		_name = pathInfo.name;
		_ext = pathInfo.ext;

		if (betterToReadfromFile || re.mctime.test(_config_rr.replacement)) {
			const fileStats = fs.statSync(_file);
			_bytes = fileStats.size;
			_size = readableSize(_bytes);
			_mtime_obj = fileStats.mtime;
			_ctime_obj = fileStats.ctime;
			_mtime = localTimeString(_mtime_obj);
			_ctime = localTimeString(_ctime_obj);

			//console.log('filesize: ', fileStats.size);
			//console.log('dataSize: ', _bytes);
		}
	}

	if (needsByteOrSize && -1 === _bytes) {
		// The size in the encoding of the file, not of the text as utf8
		_bytes = Buffer.byteLength(_text, _config_rr.encoding);
		_size = readableSize(_bytes);
	}

	// Run only once if no captured groups (replacement cant change).
	// The result is given back from a function, so `$&` and `$$` in it are inserted as they are and not expanded.
	if (!/\$\d/.test(_config_rr.replacement)) {
		const result = dynamicContent(
			require,
			fs,
			globs,
			path,
			_pipe,
			// Without piped data `pipe` is null, while `pipe_` is `❌ ` like the file variables
			(_pipe ?? '❌') + _,
			_find,
			_find + _,
			_text,
			_text + _,
			_file,
			_file + _,
			_file_rel,
			_file_rel + _,
			_dirpath,
			_dirpath + _,
			_dirpath_rel,
			_dirpath_rel + _,
			_dirname,
			_dirname + _,
			_filename,
			_filename + _,
			_name,
			_name + _,
			_ext,
			_ext + _,
			_cwd,
			_cwd + _,
			_now,
			_now + _,
			_time_obj,
			_time,
			_time + _,
			_mtime_obj,
			_mtime,
			_mtime + _,
			_ctime_obj,
			_ctime,
			_ctime + _,
			_bytes,
			_bytes + _,
			_size,
			_size + _,
			_nl,
			_,
			code_rr
		);
		return () => result;
	}
	// Capture groups used, so need to run once per match
	return function () {
		const __pipe = _pipe,
			__text = _text,
			__find = _find,
			__file = _file,
			__file_rel = _file_rel,
			__dirpath = _dirpath,
			__dirpath_rel = _dirpath_rel,
			__dirname = _dirname,
			__filename = _filename,
			__name = _name,
			__ext = _ext,
			__cwd = _cwd,
			__now = _now,
			__time_obj = _time_obj,
			__time = _time,
			__mtime_obj = _mtime_obj,
			__mtime = _mtime,
			__ctime_obj = _ctime_obj,
			__ctime = _ctime,
			__bytes = _bytes,
			__size = _size,
			__nl = _nl,
			__ = _,
			__code_rr = code_rr;

		var capturedGroups = '';
		for (var i = 0; i < arguments.length - 2; i++) {
			capturedGroups += 'var $' + i + '=' + JSON.stringify(arguments[i]) + '; ';
		}

		return dynamicContent(
			require,
			fs,
			globs,
			path,

			__pipe,
			(__pipe ?? '❌') + __,

			__find,
			__find + __,
			__text,
			__text + __,

			__file,
			__file + __,
			__file_rel,
			__file_rel + __,

			__dirpath,
			__dirpath + __,
			__dirpath_rel,
			__dirpath_rel + __,

			__dirname,
			__dirname + __,
			__filename,
			__filename + __,
			__name,
			__name + __,
			__ext,
			__ext + __,
			__cwd,
			__cwd + __,

			__now,
			__now + _,
			__time_obj,
			__time,
			__time + _,
			__mtime_obj,
			__mtime,
			__mtime + _,
			__ctime_obj,
			__ctime,
			__ctime + _,

			__bytes,
			__bytes + __,
			__size,
			__size + __,
			__nl,
			__,
			capturedGroups + __code_rr
		);
	};
}

function localTimeString(dateObj = new Date()) {
	return `${dateObj.getFullYear()}-${('0' + (dateObj.getMonth() + 1)).slice(-2)}-${(
		'0' + dateObj.getDate()
	).slice(-2)} ${('0' + dateObj.getHours()).slice(-2)}:${('0' + dateObj.getMinutes()).slice(-2)}:${(
		'0' + dateObj.getSeconds()
	).slice(-2)}.${('00' + dateObj.getMilliseconds()).slice(-3)}`;
}

function getFilePaths(conf) {
	const {includeGlob, excludeGlob, excludeRe} = conf;

	// All globs follow the search: case-insensitive, unless --void-ignore-case
	const globOptions = {caseSensitiveMatch: Boolean(conf.voidIgnoreCase)};

	let files = findFiles(includeGlob, globOptions);

	// With --full-path each file is known by its full path from here on. That is what --exclude-re sees, and the name that is printed.
	if (conf.fullPath) {
		files = files.map(file => path.resolve(file));
	}

	// --exclude-glob is always globs, also for the name of a file. They are used together, and the files they find are taken away.
	if (excludeGlob.length) {
		const excluded = new Set(globs.sync(excludeGlob, globOptions).map(file => path.resolve(file)));
		files = files.filter(file => !excluded.has(path.resolve(file)));
	}

	excludeRe
		.map(el => getFinalRegex(getFinalPattern(el, conf), conf))
		.forEach(re => {
			files = files.filter(file => !file.match(re));
		});

	return files.sort();
}

// A path that is a file is used as it is, so a name with glob characters, like `a[1].md` or `my (1).md`, gives only that file.
// The other paths are globbed together, so a pattern that starts with `!` can take files away from the other patterns.
function findFiles(paths, globOptions) {
	const files = [];
	const patterns = [];
	paths.forEach(file => {
		if (fs.statSync(file, {throwIfNoEntry: false})?.isFile()) {
			files.push(file);
		} else {
			patterns.push(file);
		}
	});

	// A file given by its name and also found by a glob is only handled once
	const seen = new Set();
	return files.concat(patterns.length ? globs.sync(patterns, globOptions) : []).filter(file => {
		const fullPath = path.resolve(file);
		if (seen.has(fullPath)) {
			return false;
		}
		seen.add(fullPath);
		return true;
	});
}
