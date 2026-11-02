// CLI interface for rexreplace

import * as rexreplace from './engine.ts';
import {writeTo} from './output.ts';
import {statusConfig, panic} from './status.ts';
import {alias} from './alias.ts';
import argMate, {argInfo} from '../../argmate/src/argMate.ts';
import {argConfig, version} from './options.ts';

let pattern, replacement;

// To avoid problems with patterns or replacements starting with '-' the two first arguments can not contain flags and are removed before argMate does its magic - but we still need to handle --version and --help
let needHelp = 0;
if (process.argv.length < 4) {
	if (['-v', '--version'].includes(process.argv[process.argv.length - 1])) {
		console.log(version);
		process.exit(0);
	} else if (['-h', '--help'].includes(process.argv[process.argv.length - 1])) {
		needHelp = 1;
	} else {
		needHelp = 2;
	}
} else {
	[pattern, replacement] = process.argv.splice(2, 2);
}

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
	(0 === exitcode ? console.log : console.error)(argInfo({config: argConfig}));
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

// The pattern and the replacement are taken out of argv above, so argMate only gets the rest.
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
