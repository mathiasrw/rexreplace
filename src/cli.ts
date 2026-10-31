// CLI interface for rexreplace

import * as rexreplace from './engine.ts';
import {writeTo} from './output.ts';
import {statusConfig, panic} from './status.ts';
import {alias} from './alias.ts';
import argMate, {argInfo} from '../../argmate/src/argMate.ts';

// Make it visible when Bun is the runtime (like with rexreplace-bun) as the regex engine is then not the one from Node.
// Added as semver build metadata (`+bun`) as a `-bun` would make it a prerelease.
const version = rexreplace.version + (process.versions.bun ? '+bun' : '');

let pattern, replacement;

// To avoid problems with patterns or replacements starting with '-' the two first arguments can not contain flags and are removed before yargs does it magic - but we still need to handle -version and -help
let needHelp = 0;
if (process.argv.length < 4) {
	if (/^(-v|--?version)$/.test(process.argv[process.argv.length - 1])) {
		console.log(version);
		process.exit(0);
	} else if (/^(-h|--?help)$/.test(process.argv[process.argv.length - 1])) {
		needHelp = 1;
	} else {
		needHelp = 2;
	}
} else {
	[pattern, replacement] = process.argv.splice(2, 2);
}

// The pattern and the replacement are taken out of argv above, so argMate only gets the rest
const argConfig = {
	intro: [
		'RexReplace ' +
			version +
			': Regexp search and replace for files using lookahead and backreference to matching groups in the replacement. Defaults to global multiline case-insensitive search.',
		['Usage', '> rexreplace pattern replacement [fileGlob|option]+'],
		[
			'Examples',
			["> rexreplace 'Foo' 'xxx' myfile.md", "'foobar' in myfile.md will become 'xxxbar'"],
			'',
			['> rr xxx Foo myfile.md', "The alias 'rr' can be used instead of 'rexreplace'"],
			'',
			[
				"> rexreplace '(f?(o))o(.*)' '$3$1€2' myfile.md",
				"'foobar' in myfile.md will become 'barfoo'",
			],
			'',
			[
				"> rexreplace '^#' '##' *.md",
				'All markdown files in this dir got all headlines moved one level deeper',
			],
			'',
			[
				"> rexreplace 'a' 'b' 'myfile.md' 'src/**/*.*' ",
				'Provide multiple files or glob if needed',
			],
		],
	],
	outro: "Inspiration: .oO(What should 'sed' have been by now?)",
	version: {
		type: 'boolean',
		alias: ['v'],
		description: 'Print rexreplace version (can be given as only argument)',
	},
	verbose: {type: 'boolean', alias: ['V'], description: 'More chatty output'},
	literal: {
		type: 'boolean',
		alias: ['L'],
		description: 'Literal string search (no regex used when searching)',
	},
	literalReplacement: {
		type: 'boolean',
		alias: ['l'],
		description:
			'No "smart" values in the replacement, so you can have text like `$1` and `$&` without escaping them.',
	},
	replacementFile: {
		type: 'boolean',
		description:
			'The replacement is the path to a file, and the content of the file is used as the replacement. With --js the code gives the path.',
	},
	trimFile: {type: 'boolean', description: 'Trim the content of the replacement file.'},
	trim: {type: 'boolean', description: 'Shorthand for --trim-pipe and --trim-file.'},
	voidIgnoreCase: {
		type: 'boolean',
		alias: ['I'],
		description: 'Void case insensitive search. Applies to the pattern and to all globs.',
	},
	voidGlobal: {
		type: 'boolean',
		alias: ['G'],
		description: 'Void global search (stop looking after the first match).',
	},
	dotAll: {type: 'boolean', alias: ['s'], description: 'Have `.` also match newline.'},
	voidMultiline: {
		type: 'boolean',
		alias: ['M'],
		description:
			'Void multiline search pattern. Makes ^ and $ match start/end of whole content rather than each line.',
	},
	unicode: {
		type: 'boolean',
		alias: ['u'],
		description:
			'Treat patterns as a sequence of unicode code points. For the default engine it is on by default. For the regex+ engine (`-E regex+`) it swaps from v mode to u mode.',
	},
	voidUnicode: {
		type: 'boolean',
		alias: ['U'],
		description:
			'Void unicode. For the default engine it means reading the pattern as UTF-16 parts (escapes of chars that need no escaping are allowed). For the regex+ engine it has no impact, as it defaults to v mode.',
	},
	flags: {
		type: 'string',
		description:
			'The flags of the regex, like `gimsv`, in place of the defaults: `gimu`, or `gimvxn` with `-E regex+`. `x` and `n` need `-E regex+`. Not with -G, -I, -M, -s, -u or -U.',
		conflict: ['I', 'G', 'M', 's', 'u', 'U'],
	},
	encoding: {
		default: 'utf8',
		alias: ['e'],
		description: 'Encoding of files/piped data.',
		type: 'string',
		validate: value => Buffer.isEncoding(value) || `Unknown encoding: ${value}`,
	},
	excludeRe: {
		type: 'string[]',
		alias: ['x'],
		description:
			'Files with a path that matches this regular expression will be excluded from processing. It uses the same engine and flags as the pattern. Can be provided multiple times.',
	},
	excludeGlob: {
		type: 'string[]',
		alias: ['X'],
		description:
			'Files found with this glob will be excluded from being processed. Can be provided multiple times and will act as one group of globs, meaning you can use ! notation to negate.',
	},
	engine: {
		valid: [['rr', 'default'], 'regex+', 'runtime'],
		alias: ['E'],
		description:
			'The regex engine. `rr` (also `default`) reads patterns like the native engine and adds the extended syntax of Regex+: atomic groups `(?>…)`, possessive quantifiers like `a++`, and subroutines `\\g<name>`. `regex+` is Regex+ with the flags v, x and n. `runtime` is the native engine of the runtime: V8 in Node and JavaScriptCore in Bun.',
	},
	quiet: {
		type: 'boolean',
		alias: ['q'],
		description:
			'Hide file names and warnings. Errors are still shown, and output from flags like --output and --output-match is still shown.',
	},
	quietTotal: {type: 'boolean', alias: ['Q'], description: 'Never display errors or info'},
	fullPath: {
		type: 'boolean',
		alias: ['f'],
		description: 'Print the full path of the named files instead of the relative path.',
	},
	nameAll: {
		type: 'boolean',
		description:
			'Print the names of all files found by the globs, also the ones where nothing was changed.',
	},
	nameDelimiter: {
		type: 'string',
		description:
			'String printed between the names of the files. Default is a line break, unless the name already ends with one.',
	},
	contentDelimiter: {
		type: 'string',
		description:
			'String printed between the content of each file for --output, or between the matches for --output-match. Default is a line break, unless the content already ends with one.',
	},
	delimiter: {
		type: 'string',
		description:
			'Sets --name-delimiter and --content-delimiter to the same value. Supports escape sequences like `\\t`, `\\n` and the `€` and `§` aliases.',
	},
	nullOut: {
		type: 'boolean',
		alias: ['null'],
		description:
			"Shorthand for --delimiter '\\0'. Useful for piping content with spaces or line breaks (like for `xargs -0`). The specific delimiter values win over --delimiter, and --delimiter wins over --null-out.",
	},
	nameDelimiterTail: {
		type: 'boolean',
		description:
			'Print the name delimiter after the last name. Defaults to true. Use --no-name-delimiter-tail or --name-delimiter-tail=false to not print the delimiter after the last name.',
	},
	contentDelimiterTail: {
		type: 'boolean',
		description:
			'Print the content delimiter after the last content. Defaults to true, but to false when piped data is printed, so it is left as it came in. Matches from --output-match always get it, from a file or a pipe.',
	},
	tail: {
		type: 'boolean',
		description:
			'Shorthand for setting both --name-delimiter-tail and --content-delimiter-tail. Use --no-tail to not print the delimiter after the last name and the last content. The specific tail flags win over --tail.',
	},
	nl: {
		type: 'boolean',
		description:
			'Let what is printed to stdout and stderr (the names, or the content from -o, -m or piped data) always end with a new line. No extra new line if it already ends with a new line, or if nothing was printed.',
	},
	halt: {type: 'boolean', default: false, alias: ['H', 'bail'], description: 'Halt on first error'},
	voidEuro: {
		type: 'boolean',
		alias: ['€'],
		description:
			"Void having '€' as alias for '$'. The alias is used in all inputs, but never in globs, file names or piped data.",
	},
	voidSection: {
		type: 'boolean',
		alias: ['§'],
		description:
			"Void having '§' as alias for '\\'. The alias is used in all inputs, but never in globs, file names or piped data.",
	},
	output: {
		type: 'boolean',
		alias: ['o'],
		description:
			'Output the final result instead of saving to file. Will also output content even if no replacement has taken place.',
	},
	voidAsync: {
		type: 'boolean',
		alias: ['A'],
		description:
			'Handle files in a synchronous flow. Good to limit memory usage when handling large files. ',
	},
	voidBackup: {
		type: 'boolean',
		alias: ['B'],
		description:
			'Avoid temporary backing up file. Works async (independent of -A flag) and will speed up things but at one point data lives only in memory, and you will lose the content if the process is interrupted.',
	},
	keepBackup: {
		type: 'boolean',
		alias: ['b'],
		description: 'Keep a backup file of the original content. With --rename the old file is kept.',
	},
	simulate: {
		type: 'boolean',
		alias: ['S'],
		description:
			'Execute everything during a run except changes RexReplace would normally make to the file system. Code from --js still runs, and can change data even with --simulate.',
	},
	sort: {
		type: 'string',
		valid: ['natural', 'ascii', 'modified', 'created', 'size', 'none'],
		description:
			'Process files sync in a sorted order chosen from 6 values: `natural` (numbers compared as numbers and case insensitive), `ascii` (by char code, so `B` comes before `a`), `modified`, `created`, `size`, or `none` (the order of the input: files first, then files found by globs). Files sorted the same (like the same size) are ordered by ascii sort. Without --sort files are processed asynchronously, so output order is not guaranteed, but the processing starts in natural order.',
		transform: value => String(value).toLowerCase(),
	},
	sortReverse: {type: 'boolean', description: 'Turn the order of the files around.'},
	expectFiles: {
		type: 'boolean',
		alias: ['F'],
		description: 'Check that at least one file is found. The exit code is 1 if not.',
	},
	expectDiff: {
		type: 'boolean',
		alias: ['z'],
		description: 'Check that at least one file is changed. The exit code is 1 if not.',
	},
	expectZeroDiff: {
		type: 'boolean',
		alias: ['Z'],
		description: 'Check that no file is changed. The exit code is 1 if one is.',
		conflict: ['z', 'expect-diff-all'],
	},
	expectDiffAll: {
		type: 'boolean',
		description: 'Check that all files found are changed. The exit code is 1 if not.',
	},
	rename: {
		type: 'boolean',
		alias: ['r'],
		description:
			'Search and replace in the name of each file, and rename the file to the result. The folder and the content are not touched. If planned renames clash the process is halted and no change is applied to any file. The process will halt before renaming begins if old or new names contain ASCII control characters, end on a space or a dot, or consist only of spaces and dots.',
		conflict: ['rename-path'],
	},
	renamePath: {
		type: 'boolean',
		description:
			'Like --rename, but on the whole path of each file, so a / in the replacement moves the file. Folders that are not there are made.',
	},
	renameForce: {
		type: 'boolean',
		description: 'With --rename or --rename-path, write over a file that is there already.',
	},
	outputMatch: {
		type: 'boolean',
		alias: ['m'],
		description:
			'Output each match on a new line. Will not replace any content but you still need to provide a dummy value (like `_`) as replacement parameter. The replacement is not used, so --js code is not run. If search pattern does not contain matching groups the full match will be outputted. If search pattern does contain matching groups only matching groups will be outputted (same line with no delimiter). ',
	},
	trimPipe: {
		type: 'boolean',
		alias: ['T'],
		description:
			'Trim piped data before processing. If piped data only consists of chars that can be trimmed (new line, space, tabs...) it will become an empty string. ',
	},
	replacementPipe: {
		type: 'boolean',
		alias: ['R'],
		description:
			'Replacement will be piped in. You still need to provide a dummy value (like `_`) as replacement parameter.',
	},
	jsPipe: {
		type: 'boolean',
		description: 'Treat the replacement as javascript, and give the code the piped data as `pipe`.',
	},
	globPipe: {
		type: 'boolean',
		alias: ['g'],
		description:
			'Each line of the piped data is a path or a glob of the files to work on. They are used together with the ones given as arguments.',
		conflict: ['R', 'js-pipe'],
	},
	nullIn: {
		type: 'boolean',
		description:
			'The piped paths and globs of --glob-pipe are separated by null bytes, like from `find -print0` or --null-out.',
		demand: ['glob-pipe'],
	},
	replacementJs: {
		type: 'boolean',
		alias: ['j', 'js'],
		description:
			"Treat replacement as javascript source code. \nThe statement from the last expression will become the replacement string. \nPurposefully implemented the most insecure way possible to remove _any_ incentive to consider running code from an untrusted part. \nThe full match will be available as a javascript variable named $0 while each captured group will be available as $1, $2, $3, ... and so on. \nAt some point, the $ char _will_ give you a headache when used from the command line, so use €0, €1, €2, €3... instead. \n\nThe code has access to the following variables: \n`r` as an alias for `require` with both expanded to understand a relative path even if it is not starting with `./`, \n`fs` from node, \n`path` from node, \n`globs` from npm, \n`pipe`: the data piped into the command with --js-pipe (null if no piped data, and `pipe_` is `❌ `), \n`find`: pattern searched for (the needle), \n`text`: full text being searched i.e. file content or piped data (the haystack), \n`bytes`: total size of the haystack in bytes, \n`size`: human-friendly representation of the total size of the haystack, \n`time`: String representing the local time when the command was invoked,\n`time_obj`: date object representing `time`,\n`now`: alias for `time`,\n`cwd`: current process working dir, \n`nl`: a new-line char,\n`_`: a single space char (for easy string concatenation).\n\nThe following values defaults to `❌` if haystack does not originate from a file:\n`file`: contains the full path of the active file being searched (including full filename), \n`file_rel`: contains `file` relative to current process working dir, \n`file_path` and `file_path_rel`: the same as `file` and `file_rel`, \n`dirpath`: contains the full path without filename of the active file being searched, \n`dirpath_rel`: contains `dirpath` relative to current process working dir, \n`filename`: is the full filename of the active file being searched without path, \n`name`: filename of the active file being searched with no extension, \n`ext`: extension of the filename including leading dot, \n`mtime`: ISO inspired representation of the last local modification time of the current file, \n`ctime`: ISO representation of the local creation time of the current file. \n`mtime_obj`: date object representing `mtime`, \n`ctime_obj`: date object representing `ctime`.\n\nThe numbers: `$n`: the number of the file, `$t`: the number of files, `$i`: the number of the file among the files with a match so far, `$c`: among the files changed so far, `$m`: the number of the match in the file, `$M`: across all files. Each has cousins with zeros in front (`$n0` has 2 digits, `$n00` 3, and so on to 10) and with a space at the end (`$n_`). For speed, the code runs once per file, at its first match, unless it names the match, a group, `$m`, `$M` or `rr`. A file without a match does not run the code.\n\nAccess a named group as `$` and the name: `(?<year>...)` gives you `$year`. A group named like a number, like `n`, wins over the number. With the flag `n` of `-E regex+` only named groups capture, so the code has no `$1`, while a replacement text still reads `$1` as the first named group, as in javascript. \n\n`rr` has the values with long names: `filePath`, `filePathRel`, `dirPath`, `dirPathRel`, `dirName`, `fileName`, `name`, `ext`, `bytes`, `size`, `mtime`, `ctime`, `mtimeObj`, `ctimeObj`, `fileNumber`, `filesTotal`, `matchedFileNumber`, `changedFileNumber`, `matchThisFile`, `matchUntilNow`, `text`, `find`, `stdin`, `cwd`, `time` and `timeObj`, and the groups, like `rr[1]` and `rr.year`, which overwrite a name they share. Code that names `rr`, also in a string or a comment, runs once per match. `print()` and `printErr()`, also on `rr`, print to stdout and stderr, also with --quiet-total. `pad(value, width = 3, char = '0')` pads a value, like `pad($1)` for `007`.\n\nAll variables, except from module, date objects, functions, `nl` and `_`, has a corresponding variable name followed by `_` where the content has an extra space at the end (for easy concatenation). \n",
	},
	statusCompact: {
		type: 'boolean',
		alias: ['c'],
		description:
			'As the last thing before ending any execution a status report will be printed as one line of JSON. Will print even in combination with `--quiet-total`. Will incude extra info about the inner workings of the engine in combination with the `--verbose` flag.',
	},
	status: {
		type: 'boolean',
		description:
			'Same as `--status-compact`, but always starting with a `\\n` followed by pretty printed JSON.',
	},
	debug: {
		type: 'boolean',
		alias: ['d'],
		description:
			'Print only the status report, with what went into the engine and what it did. Does not block the output of --output and --output-match.',
	},
	help: {type: 'boolean', alias: ['h'], description: 'Display help.'},
};

// The engine resolves with the status of the run, or throws a panic when the run can not go on.
// The CLI is the only part that acts on the process.
function printStatus(config, status) {
	if (config.status) {
		writeTo(process.stdout, '\n' + JSON.stringify(status, null, 2) + '\n');
	} else if (config.statusCompact) {
		writeTo(process.stdout, JSON.stringify(status) + '\n');
	}
}

function exitOnPanic(config, e) {
	if (!e?.panic) {
		throw e;
	}
	// A panic from the CLI itself comes before the engine has a status
	if (e.status) {
		printStatus(config, e.status);
	}
	process.exit(3);
}

// Help that was asked for goes to stdout, and the help with an error to stderr
function backOut(exitcode = 1) {
	(0 === exitcode ? console.log : console.error)(argInfo({}, argConfig));
	process.exit(exitcode);
}

const lineBreakEscapes = {'\n': '\\n', '\r': '\\r', '\u2028': '\\u2028', '\u2029': '\\u2029'};

// Let javascript interpret escape sequences (like `\n` or `\x41`) by evaluating the replacement as the content of a single quoted string.
// Anything that would end the string or break the source must be neutralised first: unescaped single quotes, real line breaks and a lone backslash at the end.
function unescapeString(str = '') {
	const source = str.replace(/\\(?:\r\n|[\s\S])?|['\n\r\u2028\u2029]/g, match => {
		if ('\\' === match) {
			return '\\\\';
		}
		// Escape sequences are left for javascript - including a backslash in front of a real line break (a line continuation, so both are removed)
		if ('\\' === match[0]) {
			return match;
		}
		return "'" === match ? "\\'" : lineBreakEscapes[match];
	});
	return new Function(`return '${source}'`)();
}

// Help that was asked for is not an error. Too few arguments are wrong flags, so a panic.
if (0 < needHelp) {
	backOut(1 === needHelp ? 0 : 3);
}

// Wrong flags are a panic, so the exit code is 3. The help and the message go to stderr.
const argv = argMate(process.argv.slice(2), argConfig, {
	allowUnknown: false,
	// A file can be named with only digits, like `2024`, so each glob is kept as the string that was given
	allowAutoNumbers: false,
	error: e => {
		console.error(argInfo());
		console.error(e.message);
		process.exit(3);
	},
});

// All options into one big config object for the rexreplace core
const config: any = {};

// Use only camelCase full length version of settings so we make sure the core can be documented properly
Object.assign(config, argv);
delete config._;

if (config.help) {
	backOut(0);
}

if (config.version) {
	console.log(version);
	process.exit(0);
}

if (config.trim) {
	config.trimPipe = config.trimFile = true;
}

if (config.jsPipe) {
	config.replacementJs = config.pipe = true;
}

if (config.debug) {
	config.status = config.verbose = config.quietTotal = true;
}

statusConfig(config);

config.pipedData = null;

config.pattern = pattern;

config.includeGlob = argv._;

config.excludeGlob = argv.excludeGlob ?? [];

config.excludeRe = argv.excludeRe ?? [];

config.replacement = replacement;

// The aliases come before the escape sequences are interpreted, so `§n` gives a line break just like `\n`
const typed = {...config};
alias(config);

// The error shows the value as it was typed
const unescape = (key, name) => {
	try {
		config[key] = unescapeString(config[key]);
	} catch (e) {
		// The engine is not running yet, so the panic is caught here
		try {
			panic('Invalid escape sequence in ' + name, typed[key]);
		} catch (e) {
			exitOnPanic(config, e);
		}
	}
};

// The path of --replacement-file is the name of a file, so it has no escapes
if (!config.replacementJs && !config.replacementFile) {
	unescape('replacement', 'replacement');
}

if (config.delimiter) {
	unescape('delimiter', '--delimiter');
}
if (config.nameDelimiter) {
	unescape('nameDelimiter', '--name-delimiter');
}
if (config.contentDelimiter) {
	unescape('contentDelimiter', '--content-delimiter');
}

// The exit code is only set, so the process ends by itself when all output is written.
// 0: done, 1: a check that was not met, 2: an error in a file and the run went on, 3: a panic (the run stopped)
const run = () =>
	rexreplace.engine(config).then(
		status => {
			printStatus(config, status);
			// The failed checks are errors too, so 1 is when they are the only errors
			const checks = status.checks?.length ?? 0;
			if (status.errors.length > checks) {
				process.exitCode = 2;
			} else if (checks) {
				process.exitCode = 1;
			}
		},
		e => exitOnPanic(config, e)
	);

// Like grep, stdin is only read when piped data is expected. An open pipe that nobody writes to would make the run wait forever.
const pipeDataExpected =
	!config.includeGlob.length || config.replacementPipe || config.pipe || config.globPipe;

if (!pipeDataExpected || Boolean(process.stdin.isTTY)) {
	run();
} else {
	// Stays null when nothing comes through the pipe
	let pipeData = null;

	// With --glob-pipe the piped data is paths, and they are UTF-8 and not in the encoding of the files
	process.stdin.setEncoding(config.globPipe ? 'utf8' : config.encoding);

	process.stdin.on('data', chunk => {
		pipeData = (pipeData ?? '') + chunk;
	});

	process.stdin.on('end', () => {
		if (null !== pipeData && config.trimPipe) {
			pipeData = pipeData.trim();
		}
		config.pipedData = pipeData;
		run();
	});
}
