const fs = require('fs');

const os = require('os');

const path = require('path');

const globs = require('fast-glob');

const now = new Date();

import {
	outputConfig,
	chat,
	info,
	print,
	printDone,
	warn,
	error,
	panic,
	checkFailed,
} from './output.ts';

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
		checkExpectations(config);
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
	if (config.rename || config.renamePath) {
		status.renames = [];
	}

	// The checks from --expect-* that are not met
	if (config.expectFiles || config.expectDiff || config.expectZeroDiff || config.expectDiffAll) {
		status.checks = [];
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

	if (config.replacementJs && config.outputMatch) {
		warn('The code is not run with --output-match, as only the matches are printed.');
	}

	if (config.expectZeroDiff && (config.expectDiff || config.expectDiffAll)) {
		panic('--expect-zero-diff can not be used with --expect-diff or --expect-diff-all');
	}

	// With --glob-pipe each line of the piped data is a path or a glob, used together with the ones given as arguments
	if (config.globPipe) {
		if (config.replacementPipe || config.pipe) {
			panic(
				'--glob-pipe can not be used with --replacement-pipe or --js-pipe, as the piped data can only be one thing'
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

	// --literal-replacement: the value of a function is used as it is, so `$1` and `$&` are just text.
	// The code of --js is a string here too, but its value is already used as it is.
	if (
		config.literalReplacement &&
		!config.replacementJs &&
		'string' === typeof config.replacement
	) {
		const text = config.replacement;
		config.replacement = () => text;
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

	if (config.rename && config.renamePath) {
		panic('--rename can not be used with --rename-path');
	}

	if (config.renameForce && !config.rename && !config.renamePath) {
		panic('--rename-force needs --rename or --rename-path');
	}

	if ((config.rename || config.renamePath) && piped) {
		panic('--rename and --rename-path need files, as piped data has no name to change');
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

	if (config.rename || config.renamePath) {
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
			? codeReplacement(_file_rr, _config_rr, _data_rr)
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

// --rename: the name of each file is the text that is searched and replaced, and the file is renamed to the result.
// --rename-path: the same with the whole path, so the file can be moved.
function renameFiles(files, config) {
	// With --rename a / in the new name would move the file
	const slashed = [];
	const plan = files.map(file => {
		config.statusInfo.files.searched.push(file);
		const text = config.renamePath ? file : path.basename(file);
		chat('Work on the ' + (config.renamePath ? 'path' : 'name') + ' of: ' + file);
		const replacement =
			config.replacementJs && !config.outputMatch
				? codeReplacement(file, config, text)
				: config.replacement;
		const result = text.replace(config.regex, replacement);
		if (result === text) {
			return {old: file, new: file};
		}
		if (config.renamePath) {
			return {old: file, new: result};
		}
		const item = {old: file, new: path.join(path.dirname(file), result)};
		if (/[\\/]/.test(result)) {
			slashed.push(item);
		}
		return item;
	});
	const renames = plan.filter(item => item.new !== item.old);

	// With --output-match the matches are printed by the replacement, and the names go to stderr.
	// The replacement is not used, so nothing would be renamed: no clash check and no renames in the status.
	if (config.outputMatch) {
		return plan.forEach(item =>
			item.new !== item.old ? updated(item.old, config) : config.nameAll && info(item.old)
		);
	}

	findClashes(plan, renames, slashed, config);

	plan.forEach(item => {
		if (item.new === item.old) {
			chat('Same name: ' + item.old);
			return config.nameAll && nameRename(item, config);
		}
		// --simulate and --output do everything but rename
		if (config.simulate || config.output) {
			config.statusInfo.files.updated.push(item.old);
			config.statusInfo.renames.push(item);
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
// The paths are compared as absolute paths, as two relative paths can lead to the same file,
// and the case is ignored, as `A.md` and `a.md` are the same file on a file system that is case-insensitive.
const pathKey = file => path.resolve(file).toLowerCase();

function findClashes(plan, renames, slashed, config) {
	const byTarget = new Map();
	renames.forEach(item => {
		const target = pathKey(item.new);
		byTarget.set(target, (byTarget.get(target) || []).concat(item));
	});
	// All files in the run, also the ones that keep their name
	const inRun = new Set(plan.map(item => pathKey(item.old)));
	const inRunExact = new Set(plan.map(item => path.resolve(item.old)));
	const ontoRun = new Set(byTarget.keys()).intersection(inRun);

	// Each path on its own line, so long paths can be read
	const clash = (title, items) =>
		title + items.map(item => '\n    From: ' + item.old).join('') + '\n    To:   ' + items[0].new;

	const clashes = slashed.map(item =>
		clash('"/" is not allowed in names. Use --rename-path to move files.', [item])
	);
	byTarget.forEach((items, target) => {
		const [item] = items;
		// The new path is another file, also when it differs from the old one only in case (on a file system that is case-sensitive)
		const other = isOtherFile(item.old, item.new);
		const self = pathKey(item.old) === target;
		if (1 < items.length) {
			clashes.push(clash('Renames to the same path are not allowed.', items));
		} else if (
			ontoRun.has(target) &&
			(!self || (other && inRunExact.has(path.resolve(item.new))))
		) {
			// Not even --rename-force writes over a file in the run. A file can still change the case of its own name.
			clashes.push(clash('Renames clashing with other files in this run are not allowed.', items));
		} else if (other && !config.renameForce) {
			clashes.push(
				clash(
					'Renames clashing with files that are there already are not allowed without --rename-force.',
					items
				)
			);
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
	config.statusInfo.renames.push(item);
	info(item.new);
}

// The checks from --expect-* are done when the run is done. Piped data counts as one file.
function checkExpectations(config) {
	const status = config.statusInfo;
	if (!status.checks) {
		return;
	}
	const piped = Boolean(config.dataIsPiped);
	const found = piped ? 1 : status.files.searched.length;
	const changed = piped ? Number(status.pipe.updated) : status.files.updated.length;
	// Nothing is written with --simulate, --output and --output-match
	const would = !piped && (config.simulate || config.output || config.outputMatch);
	const files = count => (piped ? 'the piped data' : count + (1 === count ? ' file' : ' files'));
	const change = count =>
		would ? 'would change' : 1 === count || piped ? 'was changed' : 'were changed';

	if (config.expectFiles && !found) {
		checkFailed('Expected files, but 0 files found');
	}
	if ((config.expectDiff || config.expectDiffAll) && !changed) {
		checkFailed('Expected a diff, but nothing ' + (would ? 'would change' : 'was changed'));
	} else if (config.expectDiffAll && changed < found) {
		const unchanged = found - changed;
		checkFailed(
			'Expected all files to change, but ' +
				files(unchanged) +
				(would ? ' would not change' : 1 === unchanged ? ' was not changed' : ' were not changed')
		);
	}
	if (config.expectZeroDiff && changed) {
		checkFailed('Expected no diff, but ' + files(changed) + ' ' + change(changed));
	}
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
	// With files the piped data is only read when a flag asks for it, and then the flag uses it
	if (config.includeGlob.length) {
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
	if (conf.replacementPipe) {
		conf.pipedDataUsed = true;
		if (null === conf.pipedData) {
			return panic('No data piped into replacement');
		}
		replacement = conf.pipedData;
	}

	if (conf.outputMatch) {
		if (conf.replacementFile) {
			warn(
				'The replacement file is not read with --output-match, as only the matches are printed.'
			);
		}
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

	// --replacement-file: the replacement is the path to the file with the replacement.
	// With --js the code gives the path, so the file is read when the code has run.
	if (conf.replacementFile && !conf.replacementJs) {
		try {
			return readReplacementFile(replacement, conf);
		} catch (e) {
			return panic('The replacement file can not be read:', replacement);
		}
	}

	return replacement;
}

// Each replacement file is read once, also when the code of --js gives the same path for many matches
function readReplacementFile(filepath, conf) {
	conf.replacementFiles ??= new Map();
	if (!conf.replacementFiles.has(filepath)) {
		chat('Read the replacement file: ' + filepath);
		const content = fs.readFileSync(filepath, conf.encoding);
		conf.replacementFiles.set(filepath, conf.trimFile ? content.trim() : content);
	}
	return conf.replacementFiles.get(filepath);
}

// The code of --js. With --replacement-file its value is the path to the file with the replacement.
function codeReplacement(file, config, text) {
	const code = dynamicReplacement(file, config, text);
	if (!config.replacementFile) {
		return code;
	}
	// A path that can not be read is an error once, and its matches are left as they are
	const failed = new Set();
	return (...args) => {
		const filepath = String(code(...args));
		if (!failed.has(filepath)) {
			try {
				return readReplacementFile(filepath, config);
			} catch (e) {
				failed.add(filepath);
				error('The replacement file can not be read:', filepath);
			}
		}
		return args[0];
	};
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
