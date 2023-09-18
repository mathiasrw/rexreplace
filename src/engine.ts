const fs = require('fs-extra');

const path = require('path');

const fGlob = require('fast-glob');
const globs = require('globs');

const now = new Date();

import {outputConfig, step, debug, chat, info, error, die} from './output';

const re = {
	euro: /€/g,
	section: /§/g,
	mctime: /[mc]time/,
	colon: /:/g,
	capturedGroupRef: /\$\d/,
	regexSpecialChars: /[-\[\]{}()*+?.,\/\\^$|#\s]/g,
	byteOrSize: /bytes|size/,
	folderName: /[\\\/]+([^\\\/]+)[\\\/]+[^\\\/]+$/,
};

export const version = 'PACKAGE_VERSION';

export function engine(runtime: Runtime, conf: any = {engine: 'V8'}) {
	outputConfig(conf);

	step('Displaying steps for:');
	step(conf);

	conf.pattern = getPattern(conf.pattern, conf) || '';

	conf.replacement = getReplacement(conf.replacement, conf) || '';

	conf.replacementOri = conf.replacement;

	conf.regex = getRegex(conf.pattern, conf) || '';

	step(conf);

	conf.files = getFilePaths(conf);

	if (!conf.files.length) {
		if (conf.contentWasPiped) {
			return doReplacement('[pipe-data]', conf, conf.pipeData);
		}

		return error(conf.files.length + ' files found');
	}

	chat(conf.files.length + ' files found');

	step(conf);

	conf.files
		// Find out if any filepaths are invalid
		.filter((filepath) => (fs.statSync(filepath).isFile() ? true : error('Not a file:', filepath)))

		// Do the replacement
		.forEach((filepath) => openFile(filepath, conf));
}

function openFile(file, conf) {
	if (conf.voidAsync) {
		chat('Open sync: ' + file);
		var data = fs.readFileSync(file, conf.encoding);
		return doReplacement(file, conf, data);
	} else {
		chat('Open async: ' + file);
		fs.readFile(file, conf.encoding, function (err, data) {
			if (err) {
				return error(err);
			}
			return doReplacement(file, conf, data);
		});
	}
}

// postfix argument names to limit the probabillity of user inputted javascript accidently using same values
function doReplacement(filePath: string, conf: any, content: string) {
	debug('Work on content from: ' + filePath);

	// Variables to be accessible from js.
	if (conf.replacementJs) {
		conf.replacement = dynamicReplacement(filePath, conf, content);
	}

	// Main regexp of the whole thing
	const result = content.replace(conf.regex, conf.replacement);

	// The output of matched strings is done from the replacement, so no need to continue
	if (conf.outputMatch) {
		return;
	}

	if (conf.output) {
		debug('Output result from: ' + filePath);

		return process.stdout.write(result);
	}

	// Nothing replaced = no need for writing file again
	if (result === content) {
		debug('Nothing changed in: ' + filePath);
		return;
	}

	// Release the memory while storing files
	content = '';

	debug('Write udpated content to: ' + filePath);

	if (conf.simulate) return info(filePath);

	// Write directly to the same file (if the process is killed all new and old data is lost)
	if (conf.voidBackup) {
		return fs.writeFile(filePath, result, conf.encoding, function (err) {
			if (err) {
				return error(err);
			}
			info(filePath);
		});
	}

	//Make sure data is always on disk
	const oriFile = path.normalize(path.join(process.cwd(), filePath));
	const salt = new Date().toISOString().replace(re.colon, '_').replace('Z', '');
	const backupFile = oriFile + '.' + salt + '.backup';

	if (conf.voidAsync) {
		try {
			fs.renameSync(oriFile, backupFile);
			fs.writeFileSync(oriFile, result, conf.encoding);
			if (!conf.keepBackup) {
				fs.unlinkSync(backupFile);
			}
		} catch (e) {
			return error(e);
		}
		return info(filePath);
	}

	// Let me know when fs gets promise'fied
	fs.rename(oriFile, backupFile, (err) => {
		if (err) {
			return error(err);
		}

		fs.writeFile(oriFile, result, conf.encoding, (err) => {
			if (err) {
				return error(err);
			}

			if (!conf.keepBackup) {
				fs.unlink(backupFile, (err) => {
					if (err) {
						return error(err);
					}
					info(filePath);
				});
			} else {
				info(filePath);
			}
		});
	});
}

function getPattern(pattern, conf: any) {
	step('Get final pattern');
	pattern = replacePlaceholders(pattern, conf);

	if (conf.literal) {
		pattern = pattern.replace(re.regexSpecialChars, '\\$&');
	}

	/*if (config.patternFile) {
		pattern = fs.readFileSync(pattern, 'utf8');
		pattern = new Function('return '+pattern)(); // js code?!?
	}*/

	step(pattern);
	return pattern;
}

function getReplacement(replacement, conf: any) {
	step('Get final replacement');
	/*if(config.replacementFile){
		return oneLinerFromFile(fs.readFileSync(replacement,'utf8'));
	}*/

	replacement = replacePlaceholders(replacement, conf);

	if (conf.outputMatch) {
		step('Output match');

		if (parseInt(process.versions.node) < 6) {
			return die('outputMatch is only supported in node 6+');
		}

		return function () {
			step(arguments);

			if (arguments.length === 3) {
				step('Printing full match');
				process.stdout.write(arguments[0] + '\n');
				return '';
			}

			for (var i = 1; i < arguments.length - 2; i++) {
				process.stdout.write(arguments[i]);
			}
			process.stdout.write('\n');
			return '';
		};
	}

	// If captured groups then run dynamicly
	if (
		conf.replacementJs &&
		re.capturedGroupRef.test(conf.replacement) &&
		parseInt(process.versions.node) < 6
	) {
		return die('Captured groups for javascript replacement is only supported in node 6+');
	}

	step(replacement);

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

function getRegex(pattern, conf) {
	step('Get final regex with engine: ' + conf.engine);

	let regex;

	let flags = getFlags(conf);

	switch (conf.engine) {
		case 'V8':
			try {
				regex = new RegExp(pattern, flags);
			} catch (e) {
				if (conf.debug) throw new Error(e);
				die(e.message);
			}
			break;
		case 'RE2':
			try {
				const RE2 = require('re2');
				regex = new RE2(pattern, flags);
			} catch (e) {
				if (conf.debug) throw new Error(e);
				die(e.message);
			}
			break;
		default:
			die(`Engine ${conf.engine} not supported`);
	}

	step(regex);

	return regex;
}

function getFlags(conf) {
	step('Get flags');

	let flags = '';

	if (!conf.voidGlobal) {
		flags += 'g';
	}

	if (!conf.voidIgnoreCase) {
		flags += 'i';
	}

	if (!conf.voidMultiline) {
		flags += 'm';
	}

	if (conf.dotAll) {
		flags += 's';
	}

	if (conf.unicode) {
		flags += 'u';
	}

	step(flags);

	return flags;
}

function readableSize(size) {
	if (1 === size) {
		return '1 Byte';
	}
	const i = Math.floor(Math.log(size) / Math.log(1024));
	return (
		(size / Math.pow(1024, i)).toFixed(!!i ? 1 : 0) + ' ' + ['Bytes', 'KB', 'MB', 'GB', 'TB'][i]
	);
}

function dynamicReplacement(_file_rr, _config_rr, _data_rr) {
	const _time_obj = now;
	const _time = localTimeString(_time_obj);
	const _pipe = _config_rr.pipeData,
		_text = _data_rr,
		_find = _config_rr.pattern,
		code_rr = _config_rr.replacementOri,
		_cwd = process.cwd(),
		_now = _time,
		_ = ' ',
		_nl = '\n';

	// prettier-ignore
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

	if (!_config_rr.contentWasPiped) {
		_file = path.normalize(path.join(_cwd, _file_rr));
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
		}
	}

	if (needsByteOrSize && -1 === _bytes) {
		_bytes = Buffer.from(_text).length;
		_size = readableSize(_bytes);
	}

	const glob = (a, b) =>
		fGlob.sync(a, {
			unique: true,
			caseSensitiveMatch: !_config_rr.voidIgnoreCase,
			dot: true,
			...b,
		});

	// Run only once if no captured groups (replacement cant change)
	if (!/\$\d/.test(_config_rr.replacement)) {
		return dynamicContent(
			require,
			fs,
			glob,
			path,
			_pipe,
			_pipe + _,
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
	}
	// Capture groups used, so need to run once per match
	return function () {
		step(arguments);

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
			glob,
			path,

			__pipe,
			__pipe + __,

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

function replacePlaceholders(str = '', conf: any) {
	if (!conf.voidEuro) {
		str = str.replace(re.euro, '$');
	}

	if (!conf.voidSection) {
		str = str.replace(re.section, '\\');
	}

	return str;
}

function getFilePaths(conf) {
	const {includeGlob, excludeGlob, excludeRe, voidIgnoreCase} = conf;

	let filesToInclude: string[] = fGlob.sync(includeGlob, {
		ignore: excludeGlob,
		onlyFiles: true,
		unique: true,
		caseSensitiveMatch: !voidIgnoreCase,
		dot: true,
	});

	if (excludeRe.length) {
		excludeRe
			.map((el) => getRegex(getPattern(el, conf), conf))
			.forEach((re) => {
				filesToInclude = filesToInclude.filter((el) => !el.match(re));
			});
	}

	return filesToInclude;
}
