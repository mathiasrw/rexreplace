// CLI interface for rexreplace

import * as rexreplace from './engine.ts';
import {outputConfig, panic} from './output.ts';
import {alias} from './alias.ts';

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

const yargs = require('yargs')
	// A file can be named with only digits, like `2024`, so each glob is kept as the string that was given
	.parserConfiguration({'parse-positional-numbers': false})
	.strict()
	// Wrong flags are a panic, so the exit code is 3. The help and the message go to stderr, as yargs does it.
	.fail((msg, err, yargs) => {
		yargs.showHelp();
		console.error(msg || err.message);
		process.exit(3);
	})

	.usage(
		'RexReplace ' +
			version +
			': Regexp search and replace for files using lookahead and backreference to matching groups in the replacement. Defaults to global multiline case-insensitive search.\n\n' +
			'> rexreplace pattern replacement [fileGlob|option]+'
	)

	.example(`> rexreplace 'Foo' 'xxx' myfile.md`, `'foobar' in myfile.md will become 'xxxbar'`)
	.example('')
	.example(`> rr xxx Foo myfile.md`, `The alias 'rr' can be used instead of 'rexreplace'`)
	.example('')

	.example(
		`> rexreplace '(f?(o))o(.*)' '$3$1€2' myfile.md`,
		`'foobar' in myfile.md will become 'barfoo'`
	)
	.example('')
	.example(
		`> rexreplace '^#' '##' *.md`,
		`All markdown files in this dir got all headlines moved one level deeper`
	)
	.example('')
	.example(
		`> rexreplace 'a' 'b' 'myfile.md' 'src/**/*.*' `,
		`Provide multiple files or glob if needed`
	)
	.version('v', 'Print rexreplace version (can be given as only argument)', version)
	.alias('v', 'version')

	.boolean('V')
	.describe('V', 'More chatty output')
	.alias('V', 'verbose')
	//.conflicts('V', 'q')
	//.conflicts('V', 'Q')

	.boolean('L')
	.describe('L', 'Literal string search (no regex used when searching)')
	.alias('L', 'literal')

	.boolean('l')
	.describe(
		'l',
		'Use the replacement as it is. Without it, `$1`, `$&` and the other `$` signs in the replacement mean the groups and the match, as in javascript.'
	)
	.alias('l', 'literal-replacement')

	.boolean('replacement-file')
	.describe(
		'replacement-file',
		'The replacement is the path to a file, and the content of the file is used as the replacement. With --js the code gives the path.'
	)

	.boolean('trim-file')
	.describe('trim-file', 'Trim the content of the replacement file.')

	.boolean('trim')
	.describe('trim', 'Shorthand for --trim-pipe and --trim-file.')

	.boolean('I')
	.describe('I', 'Void case insensitive search. Applies to the pattern and to all globs.')
	.alias('I', 'void-ignore-case')

	.boolean('G')
	.describe('G', 'Void global search (stop looking after the first match).')
	.alias('G', 'void-global')

	.boolean('s')
	.describe('s', 'Have `.` also match newline.')
	.alias('s', 'dot-all')

	.boolean('M')
	.describe(
		'M',
		'Void multiline search pattern. Makes ^ and $ match start/end of whole content rather than each line.'
	)
	.alias('M', 'void-multiline')

	.boolean('u')
	.describe('u', 'Treat pattern as a sequence of unicode code points.')
	.alias('u', 'unicode')

	.default('e', 'utf8')
	.alias('e', 'encoding')
	.describe('e', 'Encoding of files/piped data.')
	// Not .choices() as node takes the name of an encoding in any case, like `UTF8`
	.check(argv => Buffer.isEncoding(argv.encoding) || `Unknown encoding: ${argv.encoding}`)

	.string('x')
	.describe(
		'x',
		'Files with a path that matches this regular expression will be excluded from processing. Can be provided multiple times.'
	)
	.alias('x', 'exclude-re')

	.string('X')
	.describe(
		'X',
		'Files found with this glob will be excluded from being processed. Can be provided multiple times and will act as one group of globs, meaning you can use ! notation to negate.'
	)
	.alias('X', 'exclude-glob')

	.alias('E', 'engine')
	.describe(
		'E',
		'What regex engine to use. `default` is the default engine of the runtime (`V8` for  Node and `JSC` (JavaScriptCore) for Bun.'
	)
	.choices('E', ['default', 'V8', 'JSC' /*'RE2' /*'sd', 'stream'*/])
	.default('E', 'default')

	.boolean('q')
	.describe('q', 'Only display errors (no other info)')
	.alias('q', 'quiet')

	.boolean('Q')
	.describe('Q', 'Never display errors or info')
	.alias('Q', 'quiet-total')

	.boolean('f')
	.describe('f', 'Print the full path of the named files instead of the relative path.')
	.alias('f', 'full-path')

	.boolean('name-all')
	.describe(
		'name-all',
		'Print the names of all files found by the globs, also the ones where nothing was changed.'
	)

	.string('name-delimiter')
	.describe(
		'name-delimiter',
		'String printed between the names of the files. Default is a line break, unless the name already ends with one.'
	)
	.string('content-delimiter')
	.describe(
		'content-delimiter',
		'String printed between the content of each file for --output, or between the matches for --output-match. Default is a line break, unless the content already ends with one.'
	)

	.string('delimiter')
	.describe(
		'delimiter',
		'Sets --name-delimiter and --content-delimiter to the same value. Supports escape sequences like `\\t`, `\\n` and the `€` and `§` aliases.'
	)

	.boolean('null-out')
	.alias('null-out', 'null')
	.describe(
		'null-out',
		"Shorthand for --delimiter '\\0'. Useful for piping content with spaces or line breaks (like for `xargs -0`). The specific delimiter values win over --delimiter, and --delimiter wins over --null-out."
	)

	.boolean('name-delimiter-tail')
	.describe(
		'name-delimiter-tail',
		'Print the name delimiter after the last name. Defaults to true. Use --no-name-delimiter-tail or --name-delimiter-tail=false to not print the delimiter after the last name.'
	)

	.boolean('content-delimiter-tail')
	.describe(
		'content-delimiter-tail',
		'Print the content delimiter after the last content. Defaults to true, but to false when piped data is printed, so it is left as it came in. Matches from --output-match always get it, from a file or a pipe.'
	)

	.boolean('tail')
	.describe(
		'tail',
		'Shorthand for setting both --name-delimiter-tail and --content-delimiter-tail. Use --no-tail to not print the delimiter after the last name and the last content. The specific tail flags win over --tail.'
	)

	.boolean('nl')
	.describe(
		'nl',
		'Let what is printed to stdout and stderr (the names, or the content from -o, -m or piped data) always end with a new line. No extra new line if it already ends with a new line, or if nothing was printed.'
	)

	.boolean('H')
	.describe('H', 'Halt on first error')
	.alias('H', 'halt')
	.alias('H', 'bail')
	.default('H', false)

	.boolean('€')
	.describe(
		'€',
		"Void having '€' as alias for '$'. The alias is used in all inputs, but never in globs, file names or piped data."
	)
	.alias('€', 'void-euro')

	.boolean('§')
	.describe(
		'§',
		"Void having '§' as alias for '\\'. The alias is used in all inputs, but never in globs, file names or piped data."
	)
	.alias('§', 'void-section')

	.boolean('o')
	.describe(
		'o',
		'Output the final result instead of saving to file. Will also output content even if no replacement has taken place.'
	)
	.alias('o', 'output')
	//.conflicts('o','O')

	.boolean('A')
	.alias('A', 'void-async')
	.describe(
		'A',
		`Handle files in a synchronous flow. Good to limit memory usage when handling large files. ` +
			''
	)

	.boolean('B')
	.describe(
		'B',
		'Avoid temporary backing up file. Works async (independent of -A flag) and will speed up things but at one point data lives only in memory, and you will lose the content if the process is interrupted.'
	)
	.alias('B', 'void-backup')

	.boolean('b')
	.describe('b', 'Keep a backup file of the original content. With --rename the old file is kept.')
	.alias('b', 'keep-backup')

	.boolean('S')
	.describe(
		'S',
		'Do everything but write the files. The names of the files that would be changed are printed as usual, and no backup is made.'
	)
	.alias('S', 'simulate')

	.string('sort')
	.describe(
		'sort',
		'Process the files one at a time, in a sorted order. The order is chosen from 6 values: `natural` (numbers compared as numbers, and case ignored), `ascii` (alphabetic), `modified`, `created`, `size`, or `none` (the order of the input: the files given first, and then the files found by globs). Files that sort the same (like the same size) are ordered by ascii sort. Without --sort the files are processed asynchronously, so the order of the output can not be guaranteed, but the processing is started in natural order.'
	)
	// Any case, and true and yes are natural
	.coerce('sort', value => {
		const name = String(value).toLowerCase();
		return 'true' === name || 'yes' === name ? 'natural' : name;
	})
	.choices('sort', ['natural', 'ascii', 'modified', 'created', 'size', 'none'])

	.boolean('sort-reverse')
	.describe('sort-reverse', 'Turn the order of the files around.')

	// Checks for a CI step. When one is not met, the exit code is 1.
	.boolean('F')
	.describe('F', 'Check that at least one file is found. The exit code is 1 if not.')
	.alias('F', 'expect-files')

	.boolean('z')
	.describe('z', 'Check that at least one file is changed. The exit code is 1 if not.')
	.alias('z', 'expect-diff')

	.boolean('Z')
	.describe('Z', 'Check that no file is changed. The exit code is 1 if one is.')
	.alias('Z', 'expect-zero-diff')

	.boolean('expect-diff-all')
	.describe('expect-diff-all', 'Check that all files found are changed. The exit code is 1 if not.')
	.conflicts('Z', ['z', 'expect-diff-all'])

	.boolean('r')
	.describe(
		'r',
		'Search and replace in the name of each file, and rename the file to the result. The folder and the content are not touched. If planned renames clash the process is halted and no change is applied to any file.'
	)
	.alias('r', 'rename')

	.boolean('rename-path')
	.describe(
		'rename-path',
		'Like --rename, but on the whole path of each file, so a / in the replacement moves the file. Folders that are not there are made.'
	)
	.conflicts('r', 'rename-path')

	.boolean('rename-force')
	.describe(
		'rename-force',
		'With --rename or --rename-path, write over a file that is there already.'
	)

	.boolean('m')
	.describe(
		'm',
		`Output each match on a new line. ` +
			`Will not replace any content but you still need to provide a dummy value (like \`_\`) as replacement parameter. The replacement is not used, so --js code is not run. ` +
			`If search pattern does not contain matching groups the full match will be outputted. ` +
			`If search pattern does contain matching groups only matching groups will be outputted (same line with no delimiter). ` +
			``
	)
	.alias('m', 'output-match')

	.boolean('T')
	.alias('T', 'trim-pipe')
	.describe(
		'T',
		`Trim piped data before processing. ` +
			`If piped data only consists of chars that can be trimmed (new line, space, tabs...) it will become an empty string. ` +
			''
	)

	.boolean('R')
	.alias('R', 'replacement-pipe')
	.describe(
		'R',
		`Replacement will be piped in. You still need to provide a dummy value (like \`_\`) as replacement parameter.` +
			''
	)

	.boolean('js-pipe')
	.describe(
		'js-pipe',
		`Treat the replacement as javascript, and give the code the piped data as \`pipe\`.`
	)

	.boolean('g')
	.alias('g', 'glob-pipe')
	.describe(
		'g',
		'Each line of the piped data is a path or a glob of the files to work on. They are used together with the ones given as arguments.'
	)
	// The piped data can only be one thing
	.conflicts('g', ['R', 'js-pipe'])

	.boolean('null-in')
	.describe(
		'null-in',
		'The piped paths and globs of --glob-pipe are separated by null bytes, like from `find -print0` or --null-out.'
	)
	.implies('null-in', 'glob-pipe')

	.boolean('j')
	.alias('j', 'js')
	.alias('j', 'replacement-js')
	.describe(
		'j',
		`Treat replacement as javascript source code. 
The statement from the last expression will become the replacement string. 
Purposefully implemented the most insecure way possible to remove _any_ incentive to consider running code from an untrusted part. 
The full match will be available as a javascript variable named $0 while each captured group will be available as $1, $2, $3, ... and so on. 
At some point, the $ char _will_ give you a headache when used from the command line, so use €0, €1, €2, €3... instead. 
If the javascript source code references to the full match or a captured group the code will run once per match. Otherwise, it will run once per file. 

The code has access to the following variables: 
\`r\` as an alias for \`require\` with both expanded to understand a relative path even if it is not starting with \`./\`, 
\`fs\` from node, 
\`path\` from node, 
\`globs\` from npm, 
\`pipe\`: the data piped into the command with --js-pipe (null if no piped data, and \`pipe_\` is \`❌ \`), 
\`find\`: pattern searched for (the needle), 
\`text\`: full text being searched i.e. file content or piped data (the haystack), 
\`bytes\`: total size of the haystack in bytes, 
\`size\`: human-friendly representation of the total size of the haystack, 
\`time\`: String representing the local time when the command was invoked,
\`time_obj\`: date object representing \`time\`,
\`now\`: alias for \`time\`,
\`cwd\`: current process working dir, 
\`nl\`: a new-line char,
\`_\`: a single space char (for easy string concatenation).

The following values defaults to \`❌\` if haystack does not originate from a file:
\`file\`: contains the full path of the active file being searched (including full filename), 
\`file_rel\`: contains \`file\` relative to current process working dir, 
\`dirpath\`: contains the full path without filename of the active file being searched, 
\`dirpath_rel\`: contains \`dirpath\` relative to current process working dir, 
\`filename\`: is the full filename of the active file being searched without path, 
\`name\`: filename of the active file being searched with no extension, 
\`ext\`: extension of the filename including leading dot, 
\`mtime\`: ISO inspired representation of the last local modification time of the current file, 
\`ctime\`: ISO representation of the local creation time of the current file. 
\`mtime_obj\`: date object representing \`mtime\`, 
\`ctime_obj\`: date object representing \`ctime\`. 

All variables, except from module, date objects, \`nl\` and \`_\`, has a corresponding variable name followed by \`_\` where the content has an extra space at the end (for easy concatenation). 
`
	)

	/*
        .boolean('N')
        .alias('N', 'void-newline')
        .describe('N',    
            `Avoid having newline when outputting data (or when piping). `+
            `Normally . `+
               ''
        )
*/

	/*    .boolean('P')
        .describe('P', "Pattern is a filename from where the pattern will be generated. If more than one line is found in the file the pattern will be defined by each line trimmed and having newlines removed followed by other all rules (like -€).)")
        .alias('P', 'pattern-file')

    .boolean('R')
        .alias('R', 'replacement-file')
        .describe('R',     
            `Replacement is a filename from where the replacement will be generated. ` +
            `If more than one line is found in the file the final replacement will be defined by each line trimmed and having newlines removed followed by all other rules (like -€).`
        )

    */

	/* // Ideas

    // https://github.com/eugeneware/replacestream
    .integer('M')
        .describe('M', "Maximum length of match. Set this value only if any single file of your ")
        .alias('M', 'max-match-len')
        .default('M', false)


   
    .boolean('G')
        .describe('G', "filename/globas are filename(s) for files containing one filename/globs on each line to be search/replaced")
        .alias('G', 'globs-file')

    .boolean('j')
        .describe('j', "Pattern is javascript source that will return a string giving the pattern to use")
        .alias('j', 'pattern-js')


    .boolean('glob-js')
        .describe('glob-js', "filename/globs are javascript source that will return a string with newline seperating each glob to work on")


		
		-S --stream-size
		
		-l --stream-line





Upper Case Free	Lower Case Free
	a
C	
D	
F	
	g
	i
J	
K	k
N	n
O	
P	
	r
	t
U	
W	w
Y	y
Z	z

		
    */
	.boolean('c')
	.alias('c', 'status-compact')
	.describe(
		'c',
		'As the last thing before ending any execution a status report will be printed as one line of JSON. Will print even in combination with `--quiet-total`. Will incude extra info about the inner workings of the engine in combination with the `--verbose` flag.'
	)

	.boolean('status')
	.describe(
		'status',
		'Same as `--status-compact`, but always starting with a `\n` followed by pretty printed JSON'
	)

	.boolean('d')
	.describe(
		'd',
		'Print only the status report, with what went into the engine and what it did. Does not block the output of --output and --output-match.'
	)
	.alias('d', 'debug')

	.help('h')
	.describe('h', 'Display help.')
	.alias('h', 'help')

	.epilog(`Inspiration: .oO(What should 'sed' have been by now?)`);

// The engine resolves with the status of the run, or throws a panic when the run can not go on.
// The CLI is the only part that acts on the process.
function printStatus(config, status) {
	if (config.status) {
		process.stdout.write('\n' + JSON.stringify(status, null, 2) + '\n');
	} else if (config.statusCompact) {
		process.stdout.write(JSON.stringify(status) + '\n');
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

function backOut(exitcode = 1) {
	yargs.showHelp();
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

// All options into one big config object for the rexreplace core
const config: any = {};

// Use only camelCase full length version of settings so we make sure the core can be documented properly
Object.keys(yargs.argv).forEach(key => {
	if (1 < key.length && key.indexOf('-') < 0) {
		config[key] = yargs.argv[key];
	}
});

if (config.trim) {
	config.trimPipe = config.trimFile = true;
}

if (config.jsPipe) {
	config.replacementJs = config.pipe = true;
}

if (config.debug) {
	config.status = config.verbose = config.quietTotal = true;
}

outputConfig(config);

config.pipedData = null;

config.showHelp = yargs.showHelp;

config.pattern = pattern;

config.includeGlob = yargs.argv._;

config.excludeGlob = [].concat(yargs.argv.excludeGlob).filter(Boolean);

config.excludeRe = [].concat(yargs.argv.excludeRe).filter(Boolean);

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
			panic('Invalid escape sequence in ' + name + ':', typed[key]);
		} catch (e) {
			exitOnPanic(config, e);
		}
	}
};

if (!config.replacementJs) {
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

	process.stdin.setEncoding(config.encoding);

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
