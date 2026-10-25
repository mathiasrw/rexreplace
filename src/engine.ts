const fs = require('fs');

const os = require('os');

const path = require('path');

const globs = require('fast-glob');

import {print, printDone, printName} from './output.ts';
import {statusConfig, verbose, warn, error, panic, checkExpectations} from './status.ts';

const re = {
	mctime: /[mc]time/,
	colon: /:/g,
	capturedGroupRef: /\$\d/,
	startsWithVowel: /^[aeiou]/i,
	// A path that is not welcome in --rename, also when the pattern would not change it
	controlChar: /[\x00-\x1f\x7f]/,
	slash: /[\\/]/,
	// Like an empty name, . or .., which are folders. Windows does not allow a space or a dot at the end.
	onlyDotsOrEndsWithDot: /^[. ]*$|[. ]$/,
	absolutePath: /^(\/|[A-Za-z]:[\\/])/,
	// A line of a stack trace without a function name has the location right after at, like `at /dir/a (copy)/anon.js:1:59`.
	// With a name the location is in parentheses at the end, like `at fn (/path/file.js:2:15)`.
	stackLineWithoutName: /^\s*at (?:file:\/\/)?((?:\/|[A-Za-z]:[\\/]).*?)(:\d+:\d+)\s*$/,
	stackLineWithName: /^\s*at .*? \((?:file:\/\/)?(.+?)(:\d+:\d+)\)\s*$/,
	subroutineSyntax: /\\g<|\(\?\(DEFINE\)/,
	// The code uses the rr object, like rr.year or rr[1], so it can reach a group in a way a search can not see
	usesRr: /(^|[^\p{ID_Continue}$])rr[.[]/u,
	// v is a native flag too, but only Regex+ knows x and n
	regexPlusOnlyFlags: /[xn]/,
	regexFlagNames: /[dgimsuvyxn]/g,
	// The flags Regex+ takes as options, and not as flags
	regexPlusFlags: /[uvxn]/g,
	replacementToken: /\$(\$|&|`|'|<[^>]*>|(\d)(\d?))/g,
	// Only the chars with a meaning outside a character class. Unicode mode does not allow to escape the others (#686).
	regexSpecialChars: /[\[\]{}()*+?.\/\\^$|]/g,
	byteOrSize: /bytes|size/,
	folderName: /[\\\/]+([^\\\/]+)[\\\/]+[^\\\/]+$/,
	// A path that is not clear as it is printed: a space at the start or the end, or a char that can not be seen,
	// like a line break from echo or a zero-width space
	unclearPath: /^\s|\s$|[\x00-\x1f\x7f-\x9f\u200b-\u200f\u2028-\u202e\u2060-\u2064\ufeff]/,
	// The chars of unclearPath that JSON.stringify does not escape
	invisibleChars: /[\x7f-\x9f\u200b-\u200f\u2028-\u202e\u2060-\u2064\ufeff]/g,
	// The end of the message of a failed file call, like `, open 'nope.txt'`
	fileCallInMessage: /, \w+( '.*')?$/s,
};

// Only the version ends up in the bundle
import {version} from '../package.json';

// Regex+ by Steven Levithan, copied into src/libs until it exports the subroutines (see src/libs/README.md)
import {atomic, possessive, subroutines} from './libs/regex/internals.js';
import {rewrite} from './libs/regex/regex.js';
export {version};

// The regex engine comes with the runtime: Node has V8 and Bun has JSC (JavaScriptCore)
const runtime = process.versions.bun ? 'Bun' : 'Node';
const runtimeEngine = process.versions.bun ? 'JSC' : 'V8';
// Node 18 has no v flag, and then Regex+ uses u
const supportsFlagV = (() => {
	try {
		return Boolean(new RegExp('', 'v'));
	} catch (e) {
		return false;
	}
})();

// Resolves with the status of the run when all files are done.
// When the run can not go on, a panic is thrown with the status so far.
export async function engine(config: any = {engine: 'rr'}) {
	config.statusInfo = newStatus(config);
	// A new run has had no panic yet, has read no replacement file, and has its own time, also when the same config is used again
	config.plzStop = false;
	config.replacementFiles = new Map();
	config.unreadableFiles = new Set();
	config.startTime = new Date();
	statusConfig(config);
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

// Flags that can not go together
function checkFlags(config) {
	if (!Buffer.isEncoding(config.encoding ?? 'utf8')) {
		panic('Unknown encoding', config.encoding);
	}
	if (config.expectZeroDiff && (config.expectDiff || config.expectDiffAll)) {
		panic('--expect-zero-diff can not be used with --expect-diff or --expect-diff-all');
	}
	if (config.globPipe && (config.replacementPipe || config.pipe)) {
		panic(
			'--glob-pipe can not be used with --replacement-pipe or --js-pipe, as the piped data can only be one thing'
		);
	}
	if (config.rename && config.renamePath) {
		panic('--rename can not be used with --rename-path');
	}
	if (config.renameForce && !config.rename && !config.renamePath) {
		panic('--rename-force needs --rename or --rename-path');
	}
}

// The config the run works with, made from the flags
function unpackConfig(config) {
	// For the numbers of --js: the files with a match, the files changed and the matches so far
	config.numbers = {matched: 0, changed: 0, matches: 0};

	if (config.replacementJs && config.outputMatch) {
		warn('The code is not run with --output-match, as only the matches are printed.');
	}

	// With --glob-pipe each line of the piped data is a path or a glob, used together with the ones given as arguments
	if (config.globPipe) {
		config.pipedDataUsed = true;
		const lines = (config.pipedData ?? '').split(config.nullIn ? '\0' : /\r?\n/);
		config.includeGlob = config.includeGlob.concat(lines.filter(line => '' !== line));
	}

	config.pattern = regexPattern(config.pattern, config);

	config.replacement = readReplacement(config) || '';
	config.replacementOri = config.replacement;
	if (config.outputMatch) {
		config.replacement = matchPrinter(config);
	}

	// The most specific delimiter wins. Without one there is a line break after each item, unless it already ends with one.
	const delimiter = config.delimiter ?? (config.nullOut ? '\0' : null);
	config.nameDelimiter = config.nameDelimiter ?? delimiter;
	config.contentDelimiter = config.contentDelimiter ?? delimiter;

	// --output-match wins over --output
	config.output = config.output && !config.outputMatch;

	const {regex, hiddenCaptures, namedOnly} = compileRegex(config.pattern, config);
	config.regex = regex;
	config.hiddenCaptures = hiddenCaptures;
	// With the flag n of Regex+ only named groups capture, so --js gets no $1 and on
	config.namedOnly = namedOnly;
	// The replacement text still reads $1 as the first named group, which can be on purpose
	if (
		namedOnly &&
		'string' === typeof config.replacement &&
		!config.replacementJs &&
		!config.outputMatch &&
		!config.literalReplacement &&
		[...config.replacement.matchAll(re.replacementToken)].some(
			([, , first, second]) => 0 < Number(first + second)
		)
	) {
		warn(
			'With the flag n the groups have no numbers, but $1 in the replacement is the first named group. Use $<name>.'
		);
	}

	// The user does not know the groups Regex+ adds for atomic groups and possessive quantifiers
	if (
		hiddenCaptures.length &&
		'string' === typeof config.replacement &&
		!config.replacementJs &&
		!config.outputMatch &&
		!config.literalReplacement
	) {
		config.replacement = visibleGroupNumbers(
			config.replacement,
			hiddenCaptures,
			emptyMatch(regex).length - 1
		);
	}

	config.codeUses = config.replacementJs ? codeUses(config.replacementOri, config.regex) : null;

	// What the regex engine is asked to do. With --replacement-js and --output-match it gets a function.
	if (config.statusInfo.engine) {
		config.statusInfo.engine.execution = {
			engine: engineName(config.engine),
			hiddenCaptures,
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

	usePipeAsContent(config);

	if (null !== config.pipedData) {
		config.statusInfo.pipe = {
			bytes: Buffer.byteLength(config.pipedData, config.encoding),
			type: pipeType(config),
			updated: false,
		};
	}

	// The more specific tail wins. Piped data that is printed is left as it came in, but matches are matches, from a file or a pipe.
	config.nameDelimiterTail = config.nameDelimiterTail ?? config.tail ?? true;
	config.contentDelimiterTail =
		config.contentDelimiterTail ?? config.tail ?? !(config.dataIsPiped && config.output);
}

async function run(config) {
	checkFlags(config);
	unpackConfig(config);

	if (config.dataIsPiped) {
		if (config.rename || config.renamePath) {
			panic('--rename and --rename-path need files, as piped data has no name to change');
		}
		return doReplacement('Piped data', config, config.pipedData, 1, 1);
	}

	config.files = getFilePaths(config);

	// Nothing to do is not an error, so a glob or a pipe that gives no files does not stop a script
	if (!config.files.length) {
		return warn('0 files found');
	}

	verbose(config.files.length + ' files found');

	// One file needs no async flow, and with -o, -m or --sort one file at a time gives the output in order
	config.voidAsync =
		config.voidAsync ||
		1 === config.files.length ||
		config.output ||
		config.outputMatch ||
		null != config.sort ||
		config.sortReverse ||
		// The numbers that count what came before are only the same on every run when the files come in order
		config.codeUses?.countsBefore;

	const files = config.files.filter(filepath =>
		fs.existsSync(filepath) ? true : error('File not found', filepath)
	);

	if (config.rename || config.renamePath) {
		return renameFiles(files, config);
	}
	return processFiles(files, config);
}

// A limited number of files are in work at the same time, so the memory and the open files stay within bounds.
// Each worker takes the next file when it is done with one. Up to 16 files are all handled at once.
async function processFiles(files, config) {
	const workers = config.voidAsync
		? 1
		: files.length <= 16
			? files.length
			: Math.max(16, os.availableParallelism() * 2);
	let next = 0;
	// After a panic no worker starts a new file. A file that is already in work is finished.
	const worker = async () => {
		while (next < files.length && !config.plzStop) {
			const index = next++;
			try {
				await openFile(files[index], config, index + 1, files.length);
			} catch (e) {
				config.plzStop = true;
				throw e;
			}
		}
	};

	// Wait for every file in work before the first error is thrown, so no file is cut off halfway and left only as a backup
	const results = await Promise.allSettled(Array.from({length: workers}, worker));
	const failed = results.find(result => 'rejected' === result.status);
	if (failed) {
		throw failed.reason;
	}
}

function openFile(file, config, number, total) {
	config.statusInfo.files.searched.push(file);
	if (config.voidAsync) {
		verbose('Open sync: ' + file);
		let data;
		try {
			data = fs.readFileSync(file, config.encoding);
		} catch (e) {
			return error(e);
		}
		return doReplacement(file, config, data, number, total);
	} else {
		verbose('Open async: ' + file);
		return fs.promises
			.readFile(file, config.encoding)
			.then(data => doReplacement(file, config, data, number, total), error);
	}
}

function doReplacement(file: string, config: any, data: string, number: number, total: number) {
	verbose('Work on content from: ' + file);

	// Main regexp of the whole thing. With --output-match the replacement prints the matches, so the code of --replacement-js is not run.
	const result = data.replace(
		config.regex,
		config.replacementJs && !config.outputMatch
			? codeReplacement(file, config, data, fileNumbers(config, number, total))
			: config.replacement
	);
	countFile(config, data, result);

	if (config.output || config.outputMatch) {
		// With --output-match the matches are printed by the replacement
		if (config.output) {
			verbose('Output result from: ' + file);
			print(result, config.contentDelimiter, config.contentDelimiterTail);
		}
		// The file is not changed, but it is still named if its content would change
		if (config.dataIsPiped) {
			config.statusInfo.pipe.updated = result !== data;
		} else if (result !== data) {
			markFileChanged(file, config);
		} else if (config.nameAll) {
			printName(file);
		}
		return;
	}

	// Nothing replaced = no need for writing file again
	if (result === data) {
		verbose('Nothing changed in: ' + file);
		if (config.nameAll) {
			printName(file);
		}
		return;
	}

	// --simulate does everything but write, so the file is named as if it was changed
	if (config.simulate) {
		return markFileChanged(file, config);
	}

	// Release the memory while storing files
	data = '';

	verbose('Write new content to: ' + file);

	// Write directly to the same file (if the process is killed all new and old data is lost)
	if (config.voidBackup) {
		return fs.promises
			.writeFile(file, result, config.encoding)
			.then(() => markFileChanged(file, config), error);
	}

	//Make sure data is always on disk
	const oriFile = path.resolve(file);
	const salt = new Date().toISOString().replace(re.colon, '_').replace('Z', '');
	const backupFile = oriFile + '.' + salt + '.backup';

	if (config.voidAsync) {
		try {
			fs.renameSync(oriFile, backupFile);
			fs.writeFileSync(oriFile, result, config.encoding);
			if (!config.keepBackup) {
				fs.unlinkSync(backupFile);
			}
		} catch (e) {
			return error(e);
		}
		return markFileChanged(file, config);
	}

	return fs.promises
		.rename(oriFile, backupFile)
		.then(() => fs.promises.writeFile(oriFile, result, config.encoding))
		.then(() => config.keepBackup || fs.promises.unlink(backupFile))
		.then(() => markFileChanged(file, config), error);
}

// The content of the file was changed, or would be with --simulate, --output and --output-match, so it is named
function markFileChanged(file, config) {
	config.statusInfo.files.updated.push(file);
	printName(file);
}

// --rename: the name of each file is the text that is searched and replaced, and the file is renamed to the result.
// --rename-path: the same with the whole path, so the file can be moved.
function renameFiles(files, config) {
	const {plan, newNames} = planRenames(files, config);

	// With --output-match the matches are printed by the replacement, and the names go to stderr.
	// The replacement is not used, so nothing would be renamed: no clash check and no renames in the status.
	if (config.outputMatch) {
		return plan.forEach(item =>
			item.new !== item.old
				? markFileChanged(item.old, config)
				: config.nameAll && printName(item.old)
		);
	}

	checkNameClash(plan, checkNameInvalid(plan, newNames, config), config);

	plan.forEach(item => {
		if (item.new === item.old) {
			verbose('Same name: ' + item.old);
			return config.nameAll && nameRename(item, config);
		}
		// --simulate and --output do everything but rename
		if (config.simulate || config.output) {
			return renamed(item, config);
		}
		renameFile(item, config);
	});
}

// The old and the new path of each file. The new name is also kept from before it is joined with its folder,
// as an empty name would join to the folder itself.
function planRenames(files, config) {
	const newNames = new Map();
	const plan = files.map((file, index) => {
		config.statusInfo.files.searched.push(file);
		const text = config.renamePath ? file : path.basename(file);
		verbose('Work on the ' + (config.renamePath ? 'path' : 'name') + ' of: ' + file);
		const replacement =
			config.replacementJs && !config.outputMatch
				? codeReplacement(file, config, text, fileNumbers(config, index + 1, files.length))
				: config.replacement;
		const result = text.replace(config.regex, replacement);
		countFile(config, text, result);
		if (result === text) {
			return {old: file, new: file};
		}
		const item = {
			old: file,
			new: config.renamePath ? result : path.join(path.dirname(file), result),
		};
		newNames.set(item, config.renamePath ? path.basename(result) : result);
		return item;
	});
	return {plan, newNames};
}

// The names that can not be made, each with the reason. Each one is a clash of its own, and is left out of the other checks.
function checkNameInvalid(plan, newNames, config) {
	const invalid = [];
	plan.forEach(item => {
		if (re.controlChar.test(item.old + item.new)) {
			invalid.push([
				'Names can not have control characters, like a line break or a tab.' +
					(config.replacementFile
						? ' Use --trim-file for the line break at the end of a file.'
						: ''),
				item,
			]);
		} else if (item.new === item.old) {
			return;
		} else if (re.onlyDotsOrEndsWithDot.test(newNames.get(item))) {
			invalid.push([
				'A name must have more than dots and spaces, and can not end with a space or a dot.',
				item,
			]);
		} else if (!config.renamePath && re.slash.test(newNames.get(item))) {
			// With --rename a / in the new name would move the file
			invalid.push(['"/" is not allowed in names. Use --rename-path to move files.', item]);
		}
	});
	return invalid;
}

// The file was renamed, or would be with --simulate and --output
function renamed(item, config) {
	config.statusInfo.files.updated.push(item.old);
	config.statusInfo.renames.push(item);
	nameRename(item, config);
}

// With --simulate and --output the old name goes to stderr and the new one to stdout, so they come in pairs in a terminal
function nameRename(item, config) {
	if (config.simulate || config.output) {
		printName(item.old, process.stderr);
	}
	printName(item.new, process.stdout);
}

// If planned renames clash the process is halted and no change is applied to any file.
// The paths are compared as absolute paths, as two relative paths can lead to the same file,
// and the case is ignored, as `A.md` and `a.md` are the same file on a file system that is case-insensitive.
const pathKey = file => path.resolve(file).toLowerCase();

function checkNameClash(plan, invalid, config) {
	const byTarget = new Map();
	const invalidItems = new Set(invalid.map(([, item]) => item));
	plan.forEach(item => {
		if (item.new === item.old || invalidItems.has(item)) {
			return;
		}
		const target = pathKey(item.new);
		byTarget.set(target, (byTarget.get(target) || []).concat(item));
	});
	// All files in the run, also the ones that keep their name
	const inRun = new Set(plan.map(item => pathKey(item.old)));
	const inRunExact = new Set(plan.map(item => path.resolve(item.old)));

	// Each path on its own line, so long paths can be read
	const clash = (title, items) =>
		title + items.map(item => '\n    From: ' + item.old).join('') + '\n    To:   ' + items[0].new;

	const clashes = invalid.map(([title, item]) => clash(title, [item]));
	byTarget.forEach((items, target) => {
		const [item] = items;
		// The new path is another file, also when it differs from the old one only in case (on a file system that is case-sensitive)
		const other = isOtherFile(item.old, item.new);
		const self = pathKey(item.old) === target;
		if (1 < items.length) {
			clashes.push(clash('Renames to the same path are not allowed.', items));
		} else if (inRun.has(target) && (!self || (other && inRunExact.has(path.resolve(item.new))))) {
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
			verbose('Make folder: ' + path.dirname(item.new));
			fs.mkdirSync(folder, {recursive: true});
		}
		// Checked again, as the files can have changed since the clashes were found
		if (isOtherFile(item.old, target)) {
			if (!config.renameForce) {
				return error(item.new + ' is there already, so ' + item.old + ' is not renamed');
			}
			verbose('Write over: ' + item.new);
		}
		// With --keep-backup the old file is kept, so the file is copied
		if (config.keepBackup) {
			verbose('Copy: ' + item.old + ' to ' + item.new);
			fs.copyFileSync(item.old, target);
		} else {
			verbose('Rename: ' + item.old + ' to ' + item.new);
			fs.renameSync(item.old, target);
		}
	} catch (e) {
		return error(e);
	}
	renamed(item, config);
}

// How the piped data was used
function pipeType(config) {
	if (config.globPipe) {
		return 'GLOBS';
	}
	if (config.dataIsPiped) {
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

// Piped data is the content to search when no files are given and no flag uses it for something else
function usePipeAsContent(config) {
	config.dataIsPiped =
		!config.includeGlob.length && null !== config.pipedData && !config.pipedDataUsed;
	if (config.dataIsPiped) {
		// Piped data is printed, unless only the matches are
		config.output = !config.outputMatch;
	}
}

function regexPattern(pattern, conf: any) {
	if (conf.literal) {
		pattern = pattern.replace(re.regexSpecialChars, '\\$&');
	}

	return pattern;
}

// The replacement as text: from the pipe, from --replacement-file, or as it was typed
function readReplacement(config) {
	let replacement = config.replacement;
	if (config.replacementPipe) {
		config.pipedDataUsed = true;
		if (null === config.pipedData) {
			return panic('No data piped into replacement');
		}
		replacement = config.pipedData;
	}

	// --replacement-file: the replacement is the path to the file with the replacement.
	// With --js the code gives the path, so the file is read when the code has run. With --output-match it is not used.
	if (config.replacementFile && !config.replacementJs && !config.outputMatch) {
		try {
			return readReplacementFile(replacement, config);
		} catch (e) {
			return panic('The replacement file can not be read', pathAndReason(replacement, e));
		}
	}

	return replacement;
}

// --output-match prints each match: the full match, or the groups together when the pattern has groups
function matchPrinter(config) {
	if (config.replacementFile) {
		warn('The replacement file is not read with --output-match, as only the matches are printed.');
	}
	return (...args) => {
		const [match, ...groups] = splitMatch(args, config.hiddenCaptures).groups;
		print(
			groups.length ? groups.join('') : match,
			config.contentDelimiter,
			config.contentDelimiterTail
		);
		return '';
	};
}

// The path and why it can not be read, like `nope.txt (ENOENT: no such file or directory)`.
// A path that is not clear as it is printed is shown as JSON, with each char that can not be seen escaped.
function pathAndReason(filepath, e) {
	let shownPath = filepath;
	if (re.unclearPath.test(filepath)) {
		shownPath = JSON.stringify(filepath).replace(
			re.invisibleChars,
			char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0')
		);
	}
	// The call and the path at the end of the message are told already
	return shownPath + ' (' + e.message.replace(re.fileCallInMessage, '') + ')';
}

// Each replacement file is read once, also when the code of --js gives the same path for many matches
function readReplacementFile(filepath, conf) {
	if (!conf.replacementFiles.has(filepath)) {
		verbose('Read the replacement file: ' + filepath);
		const content = fs.readFileSync(filepath, conf.encoding);
		conf.replacementFiles.set(filepath, conf.trimFile ? content.trim() : content);
	}
	return conf.replacementFiles.get(filepath);
}

// The code of --js. With --replacement-file its value is the path to the file with the replacement.
function codeReplacement(file, config, text, numbers) {
	const code = dynamicReplacement(file, config, text, numbers);
	if (!config.replacementFile) {
		return code;
	}
	// A path that can not be read is an error once in the run, and its matches are left as they are
	return (...args) => {
		const filepath = String(code(...args));
		if (!config.unreadableFiles.has(filepath)) {
			try {
				return readReplacementFile(filepath, config);
			} catch (e) {
				config.unreadableFiles.add(filepath);
				error('The replacement file can not be read', pathAndReason(filepath, e));
			}
		}
		return args[0];
	};
}

const engineNames = {default: 'rr', V: 'regex+'};
const engineName = name => engineNames[name] ?? name ?? 'rr';

// -u is needless with regex+, as it has v
function regexFlags(config, regexPlus) {
	if (null != config.flags) {
		// The runtime does not always say which flag it does not know, so it is told here
		const unknown = String(config.flags).replace(re.regexFlagNames, '');
		if (unknown) {
			panic('Unknown flags in --flags', unknown);
		}
		return String(config.flags);
	}
	return (
		(config.voidGlobal ? '' : 'g') +
		(config.voidIgnoreCase ? '' : 'i') +
		(config.voidMultiline ? '' : 'm') +
		(config.dotAll ? 's' : '') +
		(regexPlus ? 'vxn' : config.unicode ? 'u' : '')
	);
}

function compileRegex(pattern, config) {
	const engine = engineName(config.engine);
	if (!['rr', 'regex+', 'V8', 'JSC', 'runtime'].includes(engine)) {
		panic(`Engine ${config.engine} not supported`);
	}
	if (('V8' === engine || 'JSC' === engine) && engine !== runtimeEngine) {
		panic(
			`When running via the ${runtime} runtime the native engine is ${runtimeEngine}, not ${engine}`
		);
	}
	const regexPlus = 'regex+' === engine;
	const flags = regexFlags(config, regexPlus);
	if (!regexPlus && re.regexPlusOnlyFlags.test(flags)) {
		panic('The flags x and n need -E regex+', flags);
	}
	// Regex+ takes v, u, x and n as options, and gives an error when they come as flags
	const nativeFlags = regexPlus ? flags.replace(re.regexPlusFlags, '') : flags;
	const unicode = !flags.includes('u') && supportsFlagV ? 'v' : 'u';
	try {
		if (config.literal) {
			// The text as it is, without the free spacing of Regex+
			return {
				regex: new RegExp(pattern, nativeFlags + (regexPlus ? unicode : '')),
				hiddenCaptures: [],
				namedOnly: false,
			};
		}
		if (regexPlus) {
			const disable = {v: flags.includes('u'), x: !flags.includes('x'), n: !flags.includes('n')};
			const result = rewrite(pattern, {flags: nativeFlags, disable});
			return {
				regex: new RegExp(result.pattern, result.flags),
				hiddenCaptures: result.hiddenCaptures,
				namedOnly: flags.includes('n'),
			};
		}
		if ('rr' === engine) {
			return {...compileRr(pattern, flags), namedOnly: false};
		}
		return {regex: new RegExp(pattern, flags), hiddenCaptures: [], namedOnly: false};
	} catch (e) {
		return panic(e.message);
	}
}

// Only the transforms of Regex+ run, in its own order, and not its flags, so a pattern that works natively gives the same regex
function compileRr(pattern, flags) {
	let hiddenCaptures = [];
	const transform = plugin => {
		const result = plugin(pattern, {flags, hiddenCaptures});
		pattern = result.pattern;
		hiddenCaptures = result.hiddenCaptures ?? hiddenCaptures;
	};
	// The subroutines do not return early by themselves when the pattern has none
	if (re.subroutineSyntax.test(pattern)) {
		transform(subroutines);
	}
	transform(possessive);
	transform(atomic);
	return {regex: new RegExp(pattern, flags), hiddenCaptures};
}

// Always two digits, so a digit after it is not read as part of the number. A number that is no group of the user stays text, as in javascript.
function visibleGroupNumbers(replacement, hiddenCaptures, total) {
	const real = [0];
	for (let group = 1; group <= total; group++) {
		if (!hiddenCaptures.includes(group)) {
			real.push(group);
		}
	}
	const visible = real.length - 1;
	return replacement.replace(re.replacementToken, (token, kind, first, second) => {
		if (undefined === first) {
			return token;
		}
		const two = '' !== second ? Number(first + second) : 0;
		if (1 <= two && two <= visible) {
			return '$' + String(real[two]).padStart(2, '0');
		}
		const one = Number(first);
		if (1 <= one && one <= visible) {
			return '$' + String(real[one]).padStart(2, '0') + second;
		}
		return '$$' + first + second;
	});
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

// The numbers of this file for --js: $n of $t files, and $i and $c, the files with a match and the files changed so far
function fileNumbers(config, number, total) {
	return {n: number, t: total, i: config.numbers.matched + 1, c: config.numbers.changed + 1};
}

// When a file is done, it counts for $c if it was changed. It counts for $i when the code of --js runs for a match in it.
function countFile(config, text, result) {
	if (result !== text) {
		config.numbers.changed++;
	}
}

// What the code of --js names, found once with a plain text search
function codeUses(code, regex) {
	const named = name => new RegExp('\\$' + name + '(?![A-Za-z])').test(code);
	const groups = namedGroups(regex);
	const usesGroup = name =>
		new RegExp(
			'(^|[^\\p{ID_Continue}$])\\$' + name.replace(/\$/g, '\\$') + '_?(?![\\p{ID_Continue}$])',
			'u'
		).test(code);
	const matchNumbers = named('m') || named('M');
	const rr = re.usesRr.test(code);
	return {
		groups,
		// Making rr costs time at each match, so it is only made when the code uses it
		rr,
		// $i, $c, $m and $M count what came before, so the files are done in order
		countsBefore: matchNumbers || named('i') || named('c'),
		// The groups, the named groups, $m, $M and rr are about the match, so the code runs once per match
		perMatch: matchNumbers || re.capturedGroupRef.test(code) || groups.some(usesGroup) || rr,
		stat: re.mctime.test(code),
		size: re.byteOrSize.test(code),
	};
}

// With | at the end the regex matches an empty text, and the match has all the groups
function emptyMatch(regex) {
	return new RegExp(regex.source + '|', regex.flags.replace(/[gy]/g, '')).exec('');
}

// The names of the named groups of a regex, like year for (?<year>…). A name can have any letter, like año.
// They come from the regex itself, so text that only looks like a group, like \(?<a> or [(?<a>], is not one.
function namedGroups(regex) {
	return Object.keys(emptyMatch(regex)?.groups ?? {});
}

// The numbers of --js and their cousins: $n0 is $n with zeros in front to 2 digits, $n00 to 3 and so on to 10,
// and the ones with _ at the end have a space at the end. They are all given to the code as values, so they cost no time to compile.
const widths = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const numberNames = ['n', 't', 'i', 'c', 'm', 'M'].flatMap(name =>
	[name, ...widths.map(width => name + '0'.repeat(width - 1))].flatMap(cousin => [
		'$' + cousin,
		'$' + cousin + '_',
	])
);

const perFileNumbers = (numberNames.length / 6) * 4;

// The values in the order of numberNames, from {n, t, i, c, m, M}
function numberValues(numbers) {
	return Object.values(numbers).flatMap(value => {
		const padded = widths.map(width => String(value).padStart(width, '0'));
		return [value, ...padded].flatMap(cousin => [cousin, cousin + ' ']);
	});
}

// The stack trace of an error lists the calls that led to it, one line each, like `at fn (/path/file.js:2:15)` or `at /path/file.js:2:15`.
// These are the locations in it. The location is at the end of the line, so a path with parentheses is read as a whole.
function stackTraceLocations(stackTrace) {
	return String(stackTrace)
		.split('\n')
		.map(line => line.match(re.stackLineWithoutName) || line.match(re.stackLineWithName))
		.filter(Boolean)
		.map(([, file, position]) => ({file, position}));
}

// The folder of RexReplace itself, from the first location in a stack trace made here
const ownFolder = (() => {
	const [own] = stackTraceLocations(new Error().stack);
	return own ? path.dirname(own.file) + path.sep : null;
})();

// The first location in the stack trace of an error that is in a file of the user, like `helper.js:2:15`.
// Only the locations above the code of RexReplace are from the code of the user, so the search stops there.
// Locations in Node itself, in eval and in node_modules are skipped. Reading the stack trace can throw, so it is tried.
function userCodeLocation(thrown) {
	try {
		for (const {file, position} of stackTraceLocations(thrown?.stack ?? '')) {
			if (ownFolder && file.startsWith(ownFolder)) {
				return '';
			}
			// A file is an absolute path, so the frames of code run with eval are skipped too
			if (re.absolutePath.test(file) && !file.includes('node_modules')) {
				return path.relative(process.cwd(), file) + position;
			}
		}
	} catch (e) {}
	return '';
}

// Reading a value from the code of the user can throw, so it is tried
function tryOr(read, fallback = '') {
	try {
		return read() ?? fallback;
	} catch (e) {
		return fallback;
	}
}

// What the code threw, as text, like `Error: x` or `a Foo was thrown: {"a":1}`. Code can throw anything.
function thrownText(thrown) {
	const text = tryOr(() => String(thrown));
	if (text && '[object Object]' !== text) {
		return text;
	}
	// Any other value that is not an object gives text
	if ('' === thrown) {
		return 'an empty string was thrown';
	}
	// The class, like a class of the user, or an Error whose message can not be read
	const name = tryOr(() => String(thrown.constructor.name));
	const what = name && 'Object' !== name ? name : 'object';
	const json = tryOr(() => JSON.stringify(thrown));
	const article = re.startsWithVowel.test(what) ? 'an' : 'a';
	return cut(`${article} ${what} was thrown` + (json && '{}' !== json ? ': ' + json : ''));
}

// The thrown value can hold a whole file, so only the start is told. It is cut by characters, so an emoji is not split.
function cut(text, length = 300) {
	const chars = Array.from(text);
	return chars.length > length ? chars.slice(0, length).join('') + '…' : text;
}

// The arguments of a replace function: the match and the groups, then the offset and the text, and the named groups if the pattern has any.
// The groups the engine added are left out, so $1 is the first group of the user.
function splitMatch(args, hiddenCaptures) {
	const named = args[args.length - 1];
	const hasNamed = 'object' === typeof named && null !== named;
	const groups = args.slice(0, hasNamed ? -3 : -2);
	return {
		groups: hiddenCaptures.length
			? groups.filter((_, group) => !hiddenCaptures.includes(group))
			: groups,
		named: hasNamed ? named : {},
	};
}

// The function that runs the code of --js. It is made once, as the names are the same for every file.
let codeFunction = null;

function dynamicReplacement(file, config, text, numbers = {n: 1, t: 1, i: 1, c: 1}) {
	const cwd = process.cwd();
	const time = localTimeString(config.startTime);
	// biome-ignore format: one variable on each line
	const values = {
		pipe: config.pipedData,
		find: config.pattern,
		text,
		file: '❌',
		file_rel: '❌',
		file_path: '❌',
		file_path_rel: '❌',
		dirpath: '❌',
		dirpath_rel: '❌',
		dirname: '❌',
		filename: '❌',
		name: '❌',
		ext: '❌',
		cwd,
		now: time,
		time,
		mtime: '❌',
		ctime: '❌',
		bytes: -1,
		size: '❌',
	};
	let mtime_obj = new Date(0);
	let ctime_obj = new Date(0);

	if (!config.dataIsPiped) {
		const full = path.resolve(cwd, file);
		const {dir, base, name, ext} = path.parse(full);
		Object.assign(values, {
			file: full,
			file_rel: path.relative(cwd, full),
			file_path: full,
			file_path_rel: path.relative(cwd, full),
			dirpath: dir,
			dirpath_rel: path.relative(cwd, dir),
			dirname: (full.match(re.folderName) || ' _')[1],
			filename: base,
			name,
			ext,
		});
		// From around 50 MB the size is read from the file instead of counted in the text
		if (config.codeUses.stat || (config.codeUses.size && 50000000 < text.length)) {
			const stats = fs.statSync(full);
			mtime_obj = stats.mtime;
			ctime_obj = stats.ctime;
			values.bytes = stats.size;
			values.mtime = localTimeString(mtime_obj);
			values.ctime = localTimeString(ctime_obj);
		}
	}
	if (config.codeUses.size && -1 === values.bytes) {
		// The size in the encoding of the file, not of the text as utf8
		values.bytes = Buffer.byteLength(text, config.encoding);
	}
	if (-1 !== values.bytes) {
		values.size = readableSize(values.bytes);
	}

	// require, and r for short, also find a file from the cwd when the path does not start with ./
	const r = module => {
		try {
			return require(module);
		} catch (e) {
			return require(path.resolve(cwd, module));
		}
	};
	// Each value but the modules, the date objects, nl and _ has a cousin with _ at the end, with a space at the end.
	// Without piped data `pipe` is null, while `pipe_` is `❌ ` like the file variables.
	const params = {
		require: r,
		r,
		fs,
		globs,
		path,
		time_obj: config.startTime,
		mtime_obj,
		ctime_obj,
		nl: '\n',
		_: ' ',
		pad: (value, width = 3, char = '0') => String(value).padStart(width, char),
	};
	for (const [name, value] of Object.entries(values)) {
		params[name] = value;
		params[name + '_'] = (value ?? '❌') + ' ';
	}
	codeFunction ??= new Function(
		...Object.keys(params),
		'rr',
		...numberNames,
		'__code_rr',
		'return eval(__code_rr);'
	);
	const args = Object.values(params);

	// The values of RexReplace with long names, so code in a .js file can be read without the short ones
	const fileInfo = {
		filePath: values.file,
		filePathRel: values.file_rel,
		dirPath: values.dirpath,
		dirPathRel: values.dirpath_rel,
		dirName: values.dirname,
		fileName: values.filename,
		name: values.name,
		ext: values.ext,
		bytes: values.bytes,
		size: values.size,
		mtime: values.mtime,
		ctime: values.ctime,
		mtimeObj: mtime_obj,
		ctimeObj: ctime_obj,
	};
	const own = {text, find: values.find, pipe: values.pipe, cwd, time, timeObj: config.startTime};

	// A new object for each match costs time, so the values of the file are made once, and each match builds on them.
	// The groups come last, so a group overwrites a name it shares, also _.
	let rrOfFile = null;
	const rrObject = (allNumbers, shortNumbers, groups, named) => {
		if (!rrOfFile) {
			rrOfFile = {
				stdin: values.pipe,
				// The code of the user asks for it, so it is printed also with --quiet-total
				print: value => print(String(value), null, true, process.stdout),
				printErr: value => print(String(value), null, true, process.stderr),
			};
			// $n, $t, $i and $c are the same in the whole file
			for (let i = 0; i < perFileNumbers; i++) {
				rrOfFile[numberNames[i].slice(1)] = shortNumbers[i];
			}
		}
		const object = Object.create(rrOfFile);
		for (let i = perFileNumbers; i < numberNames.length; i++) {
			object[numberNames[i].slice(1)] = shortNumbers[i];
		}
		object._ = {
			...own,
			fileInfo,
			count: {
				fileNumber: allNumbers.n,
				filesTotal: allNumbers.t,
				matchedFileNumber: allNumbers.i,
				changedFileNumber: allNumbers.c,
				matchThisFile: allNumbers.m,
				matchUntilNow: allNumbers.M,
			},
		};
		groups.forEach((value, i) => {
			object[i] = value;
		});
		for (const [name, value] of Object.entries(named)) {
			object[name] = value;
			object[name + '_'] = value + ' ';
		}
		return object;
	};

	// The code of the user is in a block of its own, so it can declare the same names with let and const.
	// The value of the block is the value of its last statement, like before. The line break ends a comment at the end.
	const code = '{' + config.replacementOri + '\n}';

	// When the code fails, only the message is told, and not the stack trace with all the code put in front of the code of the user
	const runCode = (matchNumbers, variables, groups = [], named = {}) => {
		const allNumbers = {...numbers, ...matchNumbers};
		const shortNumbers = numberValues(allNumbers);
		try {
			return codeFunction(
				...args,
				config.codeUses.rr ? rrObject(allNumbers, shortNumbers, groups, named) : undefined,
				...shortNumbers,
				variables + code
			);
		} catch (e) {
			const where = config.dataIsPiped ? 'the piped data' : file;
			// With --verbose it also tells where the code failed, when that is in a file of the user, like a module loaded with r()
			const at = config.verbose ? userCodeLocation(e) : '';
			return panic(
				'The code of --js failed for ' + where,
				thrownText(e) + (at ? '\n    at ' + at : '')
			);
		}
	};

	// The file counts for $i once the code runs for a match in it
	let found = false;
	const foundMatch = () => {
		if (!found) {
			found = true;
			config.numbers.matched++;
		}
	};

	// The value is given back from a function, so `$&` and `$$` in it are inserted as they are and not expanded
	if (!config.codeUses.perMatch) {
		// At the first match, so a file without a match does not run the code
		let result;
		return () => {
			if (!found) {
				result = runCode({m: 1, M: config.numbers.matches + 1}, '');
			}
			foundMatch();
			return result;
		};
	}
	let match = 0;
	return (...matchArgs) => {
		foundMatch();
		match++;
		config.numbers.matches++;
		const {groups, named} = splitMatch(matchArgs, config.hiddenCaptures);
		let variables = '';
		// $0 is the match. With the flag n the groups have no numbers, only names.
		const numbered = config.namedOnly ? groups.slice(0, 1) : groups;
		numbered.forEach((value, i) => {
			variables += 'var $' + i + '=' + JSON.stringify(value) + '; ';
		});
		// After the numbers, so a group named like a number, like n, wins over $n
		for (const [name, value] of Object.entries(named)) {
			variables += `var $${name} = ${JSON.stringify(value)}, $${name}_ = $${name} + ' '; `;
		}
		return runCode({m: match, M: config.numbers.matches}, variables, numbered, named);
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

	const sort = sortName(conf.sort);

	let files = findFiles(includeGlob, globOptions, sort);

	// With --full-path each file is known by its full path from here on. That is what --exclude-re sees, and the name that is printed.
	if (conf.fullPath) {
		files = files.map(file => path.resolve(file));
	}

	// --exclude-glob is always globs, also for the name of a file. They are used together, and the files they find are taken away.
	if (excludeGlob.length) {
		const excluded = new Set(glob(excludeGlob, globOptions, true).map(file => path.resolve(file)));
		files = files.filter(file => !excluded.has(path.resolve(file)));
	}

	excludeRe
		.map(pattern => compileRegex(regexPattern(pattern, conf), conf).regex)
		.forEach(exclude => {
			files = files.filter(file => !file.match(exclude));
		});

	files = sortFiles(files, sort);
	return conf.sortReverse ? files.reverse() : files;
}

const sorts = ['natural', 'ascii', 'modified', 'created', 'size', 'none'];

// The value of --sort in any case, where `true` and `yes` are `natural`. Without --sort it is `natural`.
function sortName(value) {
	if (undefined === value || null === value) {
		return 'natural';
	}
	const name = String(value).toLowerCase();
	if ('true' === name || 'yes' === name) {
		return 'natural';
	}
	if (!sorts.includes(name)) {
		panic('--sort must be one of ' + sorts.join(', '), String(value));
	}
	return name;
}

// The same order everywhere: a fixed locale, as Node follows the locale of the user and Bun does not,
// and ascii for the names natural sees as the same, like file1 and file01, so the order of the glob does not decide
const collator = new Intl.Collator('en', {numeric: true, sensitivity: 'base'}).compare;
const natural = (a, b) => collator(a, b) || ascii(a, b);
const ascii = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function sortFiles(files, sort) {
	// One file has no order, so it is not sorted, and needs no stat
	if (files.length < 2 || 'none' === sort) {
		return files;
	}
	if ('natural' === sort) {
		return files.sort(natural);
	}
	if ('ascii' === sort) {
		return files.sort(ascii);
	}

	// By a number from each file, and when two are the same, by ascii.
	// A file deleted since it was found is sorted last, and is told about as not found when it is opened.
	// A file that can not be looked at for another reason is an error with that reason, and is left out.
	const stats = new Map();
	files = files.filter(file => {
		try {
			stats.set(file, fs.statSync(file));
		} catch (e) {
			if ('ENOENT' !== e.code) {
				return error(e.message);
			}
			stats.set(file, null);
		}
		return true;
	});
	let key = {
		modified: stat => stat.mtimeMs,
		created: stat => stat.birthtimeMs,
		size: stat => stat.size,
	}[sort];

	// Not all file systems keep the time a file was made. Then Node gives 0.
	if ('created' === sort && [...stats.values()].some(stat => stat && !stat.birthtimeMs)) {
		warn(
			'This file system does not know when files were created. Sorting via modified time instead.'
		);
		key = stat => stat.mtimeMs;
	}

	const value = file => (stats.get(file) ? key(stats.get(file)) : Infinity);
	return files.sort((a, b) => value(a) - value(b) || ascii(a, b));
}

// Is the path a file, something to glob, or a path that can not be looked at (null, with an error)?
// A path that is not there, or has a file where a folder should be, is globbed like before. So is a glob,
// like a long brace glob that is too long as a name. A plain path that can not be looked at, like a name
// that is too long or a symlink loop, is an error, so it is not hidden as 0 files found.
function pathKind(file) {
	try {
		return fs.statSync(file, {throwIfNoEntry: false})?.isFile() ? 'file' : 'glob';
	} catch (e) {
		if ('ENOENT' === e.code || 'ENOTDIR' === e.code || globs.isDynamicPattern(file)) {
			return 'glob';
		}
		error(e.message);
		return null;
	}
}

// A glob that finds files and meets a folder that can not be read, like one with no access, is an error,
// and the run goes on with the files that can be found. A glob of --exclude-glob that fails is a panic,
// as the files it should take away can not be known, and they must not be changed.
function glob(patterns, globOptions, exclude = false) {
	try {
		return globs.sync(patterns, globOptions);
	} catch (e) {
		if (exclude) {
			return panic('The files to exclude can not be found', e.message);
		}
		error('Not all paths could be accessed', e.message);
		return globs.sync(patterns, {...globOptions, suppressErrors: true});
	}
}

// A path that is a file is used as it is, so a name with glob characters, like `a[1].md` or `my (1).md`, gives only that file.
// The other paths are globbed together, so a pattern that starts with `!` can take files away from the other patterns.
function findFiles(paths, globOptions, sort) {
	const files = [];
	const patterns = [];
	paths.forEach(file => {
		const kind = pathKind(file);
		if ('file' === kind) {
			files.push(file);
		} else if ('glob' === kind) {
			patterns.push(file);
		}
	});

	// A file given by its name and also found by a glob is only handled once
	const seen = new Set();
	// A glob has no order of its own, so with --sort none its files come after the paths, sorted with natural
	const found = patterns.length ? glob(patterns, globOptions) : [];
	return files.concat('none' === sort ? found.sort(natural) : found).filter(file => {
		const fullPath = path.resolve(file);
		if (seen.has(fullPath)) {
			return false;
		}
		seen.add(fullPath);
		return true;
	});
}
