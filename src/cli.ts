/// <reference path="../types/rexreplace.d.ts" />

import yargs from 'yargs';

import * as rexreplace from './engine.ts';

import {chat, debug, die, error, info, outputConfig, step} from './output.ts';

const re = {
	nl: /\r?\n/,
};

//executeReplacement(cli2conf(process.argv.slice(2)), null);

export function cli2conf(runtime: Runtime, args: string[]) {
	let pattern, replacement;

	// To avoid problems with patterns or replacements starting with '-' so the two first arguments can not contain flags and are removed before yargs does it magic - but we still need to handle -version and -help
	let needHelp = 0;
	if (args.length < 2) {
		if (/-v|--?version$/i.test(args.slice(-1)[0])) {
			console.log(rexreplace.version);
			runtime.exit(0);
		} else if (/-h|--?help$/i.test(args.slice(-1)[0])) {
			needHelp = 1;
		} else {
			needHelp = 2;
		}
	} else {
		[pattern, replacement] = args.splice(0, 2);
	}

	const argv = yargs(args)
		//.strict()
		/*		.usage(
			'RexReplace v' +
				rexreplace.version +
				'\n\nRegexp search and replace for files using lookahead and backreference to matching groups in the replacement. Defaults to global multiline case-insensitive search.\n\n' +
				'> rexreplace pattern replacement [fileGlob|option]+'
		)

		.usage(`> rexreplace 'Foo' 'xxx' myfile.md`, `'foobar' in myfile.md will become 'xxxbar'`)
		.usage(`> rr xxx Foo myfile.md`, `The alias 'rr' can be used instead of 'rexreplace'`)
		*/
		.example(
			`> rexreplace '(f?(o))o(.*)' '$3$1€2' myfile.md`,
			`'foobar' in myfile.md will become 'barfoo'`
		)
		.example(
			`> rexreplace '^#' '##' *.md`,
			`All markdown files in this dir got all headlines moved one level deeper`
		)
		.example(
			`> rexreplace 'a' 'b' 'myfile.md' 'src/**/*.*' `,
			`Provide multiple files or globs if needed`
		)
		.version('v', 'Print rexreplace version (can be given as only argument)', rexreplace.version)
		.alias('v', 'version')
		.boolean('I')
		.describe('I', 'Void case insensitive search pattern.')
		.alias('I', 'void-ignore-case')
		.boolean('G')
		.describe('G', 'Void global search (stop looking after the first match).')
		.alias('G', 'void-global')
		.boolean('M')
		.describe(
			'M',
			'Void multiline search pattern. Makes ^ and $ match start/end of whole content rather than each line.'
		)
		.alias('M', 'void-multiline')
		.boolean('s')
		.describe('s', 'Have `.` also match newline.')
		.alias('s', 'dot-all')
		.boolean('u')
		.describe('u', 'Treat pattern as a sequence of unicode code points.')
		.alias('u', 'unicode')
		.default('e', 'utf8')
		.alias('e', 'encoding')
		.describe('e', 'Encoding of files/piped data.')
		.alias('E', 'engine')
		.describe('E', 'What regex engine to use:')
		.choices('E', ['V8' /*'RE2' /*'sd', 'stream'*/])
		.default('E', 'V8')
		.boolean('L')
		.describe('L', 'Literal string search (no regex used when searching)')
		.alias('L', 'literal')
		.boolean('€')
		.describe('€', "Void having '€' as alias for '$' in pattern and replacement parameters")
		.alias('€', 'void-euro')
		.boolean('§')
		.describe('§', "Void having '§' as alias for '\\' in pattern and replacement parameters")
		.alias('§', 'void-section')
		.boolean('A')
		.alias('A', 'void-async')
		.describe(
			'A',
			`Handle files in a synchronous flow. Good to limit memory usage when handling large files. `
		)
		.boolean('H')
		.describe('H', 'Halt on first error')
		.alias('H', 'halt')
		.alias('H', 'bail')
		.default('H', false)
		.boolean('q')
		.describe('q', 'Only display errors (no other info)')
		.alias('q', 'quiet')
		.boolean('Q')
		.describe('Q', 'Never display errors or info')
		.alias('Q', 'quiet-total')
		.boolean('B')
		.describe(
			'B',
			'Avoid temporary backing up files. Works async (independent of -A flag) and will speed up things but at one point data lives only in memory, and you might lose data if the process is forced closed.'
		)
		.alias('B', 'void-backup')
		.boolean('b')
		.describe('b', 'Keep the backup file with the original content.')
		.alias('b', 'keep-backup')
		.boolean('o')
		.describe(
			'o',
			'Output the final result instead of saving to file. Will output the full content even if no replacement has taken place.'
		)
		.alias('o', 'output')
		//.conflicts('o','O')

		.boolean('m')
		.describe(
			'm',
			`Output each match on a new line. ` +
				`Will not replace any content but you still need to provide a dummy value (like \`_\`) as replacement parameter. ` +
				`If search pattern does not contain matching groups the full match will be outputted. ` +
				`If search pattern _does_ contain matching groups only matching groups will be outputted (same line with no delimiter). ` +
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
			`Replacement is being piped in. You still need to provide a dummy value (like \`_\`) as replacement parameter.`
		)
		.conflicts('R', 'g')
		.conflicts('R', 'G')
		.boolean('g')
		.describe(
			'g',
			'Filename/globs will be piped in. If filename/globs are provided in command (-X flags are ok) the execution will halt'
		)
		.alias('g', 'glob-pipe')
		.conflicts('g', 'G')
		/*    .boolean('G')
	.describe('G', "filename/globs provided are to files containing one target filename/glob per line")
	.alias('G', 'glob-file')
	.conflicts('G','g')*/

		.boolean('S')
		.describe('S', 'Simulate output without changing any files')
		.alias('S', 'simulate')
		.string('x')
		.describe(
			'x',
			'Exclude files with a path that matches this regular expression. Will follow same regex flags and setup as the main search. Can be used multiple times.'
		)
		.alias('x', 'exclude-re')
		.string('X')
		.describe('X', 'Exclude files found with this glob. Can be used multiple times.')
		.alias('X', 'exclude-glob')
		.boolean('V')
		.describe('V', 'More chatty output')
		.alias('V', 'verbose')
		.boolean('d')
		.describe('d', 'Print debug info')
		.alias('d', 'debug')
		//.conflicts('V', 'q')
		//.conflicts('V', 'Q')

		/*


	-T (Expect no match in any file and return exit 1 if found)
	-t (Expect a match in each file and return exit 1 if not found)


	.boolean('N')
        .alias('N', 'void-newline')
        .describe('N',
            `Avoid having newline when outputting data (or when piping). `+
            `Normally . `+
               ''
        )



	.boolean('p')
        .describe('p', "Pattern is the path to a filename containing the pattern. If more than one line is found in the file the pattern will be defined by each line trimmed and having newlines removed followed by other all rules (like -€).)")
        .alias('p', 'pattern-file')


    .boolean('r')
        .alias('r', 'replacement-file')
        .describe('r',
            `Replacement is the path to a filename containing the replacement`.`Will run before any other rules (like -€)`
        )



    .boolean('n')
        .describe('n', "Do replacement on file path+name instead of file content (rename/move the files)")
        .alias('n', 'name')

    // https://github.com/eugeneware/replacestream
    .integer('M')
        .describe('M', "Maximum length of match. Set this value only if any single file of your ")
        .alias('M', 'max-match-len')
        .default('M', false)





    .boolean('J')
        .describe('J', "Pattern is javascript source that will return a string giving the pattern to use")
        .alias('J', 'pattern-js')


    .boolean('glob-js')
        .describe('glob-js', "filename/globs are javascript source that will return a string with newline seperating each glob to work on")


    */

		.boolean('j')
		.alias('j', 'replacement-js')
		.alias('j', 'js')
		.describe(
			'j',
			`Treat replacement as javascript source code. 
			The statement from the last expression will become the replacement string. 
			Purposefully implemented the most insecure way possible to remove _any_ incentive to consider running code from an untrusted party. 
			The full match will be available as a javascript variable named $0 while each captured group will be available as $1, $2, $3, ... and so on. 
			At some point, the $ char _will_ give you a headache when used from the command line, so use €0, €1, €2, €3... instead. 
			If the javascript source code references to the full match or a captured group the code will run once per match. Otherwise, it will run once per file. 

			The code has access to the following variables: 
			\`r\` as an alias for \`require\` with both expanded to understand a relative path even if it is not starting with \`./\`, 
			\`fs\` from node, 
			\`path\` from node, 
			\`glob\` proxy name for the .sync function of fast-glob from npm, 
			\`pipe\`: the data piped into the command (null if no piped data), 
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
			`.replaceAll(/\s+/g, ' ')
		)
		.help('h')
		.describe('h', 'Display help.')
		.alias('h', 'help')
		.epilog(`Inspiration: .oO(What should 'sed' have been by now?)`)
		.parseSync();

	// All options into one big config object for the rexreplace engine
	let conf: any = {};

	// Use only camelCase full lenght version of settings
	Object.keys(argv).forEach((key) => {
		if (1 < key.length && key.indexOf('-') < 0) {
			conf[key] = argv[key];
		}
	});

	conf.showHelp = yargs.showHelp;
	conf.needHelp = needHelp;
	conf.pattern = pattern;
	conf.replacement = replacement;
	conf.includeGlob = argv._;
	conf.excludeGlob = (
		Array.isArray(argv.excludeGlob) ? argv.excludeGlob : [argv.excludeGlob]
	).filter(Boolean);
	conf.excludeRe = (Array.isArray(argv.excludeRe) ? argv.excludeRe : [argv.excludeRe]).filter(
		Boolean
	);

	if (!conf.replacementJs) {
		conf.replacement = unescapeString(conf.replacement);
	}

	return conf;
}

function unescapeString(str = '') {
	return new Function(`return '${str.replace(/'/g, "\\'")}'`)();
}

export function executeReplacement(runtime: Runtime, conf, pipeData: string = null) {
	if (0 < conf.needHelp) {
		runtime.exit(conf.needHelp - 1);
	}

	if (null === pipeData) return rexreplace.engine(runtime, conf);

	if (conf.trimPipe) {
		pipeData = pipeData.trim();
	}

	if (conf.replacementPipe) {
		step('Replacement from pipe');

		if (null === pipeData) {
			return die('You asked the piped data to be used as replacement - but no data arrived.');
		}

		conf.replacement = pipeData;

		if (conf.replacementJs) conf.pipeData = pipeData;

		return rexreplace.engine(runtime, conf);
	}

	if (conf.globPipe) {
		step('globs from pipe');

		if (null === conf.pipeData) {
			return die(
				'You asked the piped data to be use as files/globs to include - but no data arrived.'
			);
		}

		if (conf.includeGlob.length) {
			return die('Please pipe file/globs to include OR provide them as as parameters. Not both.');
		}

		conf.globs = pipeData.split(/\r?\n/).filter(Boolean);

		if (conf.replacementJs) conf.pipeData = pipeData;

		return rexreplace.engine(runtime, conf);
	}

	if (conf.includeGlob.length) {
		return die(
			'Data is being piped in, but no flag indicating what to use it for. If you want to do replacements in the pipe then avoid having files/globs in the parameters'
		);
	}

	step('Content being piped');
	conf.pipeData = pipeData;
	conf.output = true;
	process.stdout.setDefaultEncoding(conf.encoding);
	return rexreplace.engine(runtime, conf);
}
