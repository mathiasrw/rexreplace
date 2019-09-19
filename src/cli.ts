#!/usr/bin/env node

// CLI interface for rexreplace
import * as rexreplace from './engine';
import cli from './miriam';

const font = {
	red: (x) => `\x1b[31m${x}\x1b[39m`,
	green: (x) => `\x1b[32m${x}\x1b[39m`,
	gray: (x) => `\x1b[90m${x}\x1b[39m`,
};

let pattern, replacement;

// To avoid problems with patterns or replacements starting with '-' the two first arguments can not contain flags and are removed before yargs does it magic - but we still need to handle -version and -help
let needHelp = null;

if (process.argv.length < 4) {
	if (/^-?(v|version)$/.test(process.argv[process.argv.length - 1])) {
		console.log(rexreplace.version);
		process.exit(0);
	}

	if (/^--?(h|help)$/.test(process.argv[process.argv.length - 1])) {
		needHelp = 'help';
		console.error(234);
	} else {
		needHelp = 'Please provide parameters for both a seach-pattern and replacement';
		console.error(23423443);
	}
} else {
	[pattern, replacement] = process.argv.splice(2, 2);
}

const config = getCLIcommands();

config.printHelp = () => console.error(cli.getHelp());

function backOut(needHelp) {
	if ('' === needHelp) {
		config.printHelp();
		process.exit(36);
	} else {
		console.error('');
		console.error('  ⚠️   ' + font.red(needHelp));
		console.error('');
		console.error(
			'      ' +
				font.gray('See instructions with: ') +
				font.green(process.argv[1].match(/[\\\/]([^\\\/]+)[\\\/]?$/)[1] + ' --help')
		);
		console.error('');
		process.exit(48);
	}
	process.exitCode = 1;
	return null;
}

function unescapeString(str) {
	return new Function("return '" + str.replace(/'/g, "\\'") + "'")();
}

(function() {
	const inputIsPiped = !Boolean(process.stdin.isTTY);
	const outputIsPiped = !Boolean(process.stdout.isTTY);

	if (null !== needHelp) {
		return backOut(needHelp);
	}

	// All options into one big config object for the rexreplace core

	// Use only camelCase full lenght version of settings so we make sure the core can be documented propperly
	// Todo: check if this is needed at all.

	/*if (config.debug) {
		console.log(config); return;
		Object.keys(config.argv).forEach((key) => {
			if (1 < key.length && key.indexOf('-') < 0) {
				config[key] = config.argv[key];
			}
		});
	}*/

	const RE_EURO = /€/g;
	// CLI interface default has € as alias for $
	if (!config.voidEuro) {
		pattern = pattern.replace(RE_EURO, '$');
		replacement = replacement.replace(RE_EURO, '$');
	}

	config.maxMatchLen = Number(config.maxMatchLen);

	if (!(0 < config.maxMatchLen)) {
		return backOut('Please provide a positive number as argument to --max-match-len');
	}

	config.pattern = pattern;

	//todo: remove hardcode!

	config.exclude = 'node_module';

	console.error('Hardcoded exclude:', config.exclude);

	if (config.replacementJs) {
		config.replacement = replacement;
	} else {
		config.replacement = unescapeString(replacement);
	}

	if (config.globs.lenght && outputIsPiped) {
		if (config.voidAutoOutput) {
			console.error(
				font.gray('Looks like you are piping data, but will replace data in files anyway.')
			);
		} else {
			config.output = true;
		}
	}

	if (!inputIsPiped) {
		if (config.replacementPipe) {
			return backOut('You asked to let piped data be the replacement - but no data was piped.');
		}
		return rexreplace.engine(config);
	}

	if (!config.replacementPipe) {
		rexreplace.engine(config, process.stdin);
	} else {
		let content = '';
		process.stdin.resume();
		process.stdin.setEncoding(config.encoding);

		process.stdin.on('data', function(buf) {
			content += buf.toString();
		});
		process.stdin.on('end', function() {
			if (config.argv.trimPipe) {
				content = content.trim();
			}
			config.replacement = content;
			rexreplace.engine(config);
		});
	}
})();

function getCLIcommands() {
	cli
		.strict()

		.intro('Rexreplace 4.1.1')
		.intro(
			'Regex search and replace for files using lookahead and backreference to matching groups in the replacement. Defaults to global multiline case-insensitive search.'
		);
	cli

		.usage('> rexreplace pattern replacement [fileGlob|option]+')

		.example(`> rexreplace 'Foo' 'xxx' myfile.md`, `'foobar' in myfile.md will become 'xxxbar'`)
		.example('')
		.example(`> rr Foo xxx myfile.md`, `The alias 'rr' can be used instead of 'rexreplace'`)
		.example('')
		.example(
			`> rexreplace '(f?(o))o(.*)' '$3$1€2' myfile.md`,
			`'foobar' in myfile.md will become 'barfoo'`
		)
		.example('')
		.example(
			`> rexreplace '^#' '##' *.md`,
			`All markdown files in this dir got all headlines moved one level deeper`
		);
	cli

		.version('v', 'Print rexreplace version (can be given as only argument)', rexreplace.version)
		.alias('v', 'version');
	cli

		.default('e', 'utf8')
		.alias('e', 'encoding')
		.describe('e', 'Encoding of files/piped data.');
	cli

		.boolean('I')
		.describe('I', 'Void case insensitive search pattern.')
		.alias('I', 'void-ignore-case');
	cli

		.boolean('M')
		.describe(
			'M',
			'Void multiline search pattern. Makes ^ and $ match start/end of whole content rather than each line.'
		)
		.alias('M', 'void-multiline')

		.boolean('G')
		.describe('G', 'Void global search (stop looking after the first match).')
		.alias('G', 'void-global')

		.boolean('u')
		.describe('u', 'Treat pattern as a sequence of unicode code points.')
		.alias('u', 'unicode')

		.boolean('€')
		.describe('€', "Void having '€' as alias for '$' in pattern and replacement parameters")
		.alias('€', 'void-euro')

		.boolean('q')
		.describe('q', 'Only display errors (no other info)')
		.alias('q', 'quiet')

		.boolean('Q')
		.describe('Q', 'Never display errors or info')
		.alias('Q', 'quiet-total')

		.boolean('V')
		.describe('V', 'More chatty output')
		.alias('V', 'verbose')
		.conflicts('V', ['q', 'Q'])

		.boolean('d')
		.describe('d', 'Print debug info')
		.alias('d', 'debug')

		.boolean('H')
		.describe('H', 'Halt on first error')
		.alias('H', 'halt')
		.default('H', false)

		.boolean('A')
		.alias('A', 'void-async')
		.describe(
			'A',
			`Handle files in a synchronous flow. Good to limit memory usage when handling large files. Is always consideres set when dealing with more than 1023 files.` +
				''
		)

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

		.alias('E', 'engine')
		.describe('E', 'What regex engine to use:')
		.choices('E', ['V8', 'RE2' /*'sd', 'stream'*/])
		.default('E', 'V8')

		.string('max-match-len')
		.describe(
			'max-match-len',
			'Number of characters to in the largest expected match when data is piped in. Can be scientific notation. Please mesure performance overhead if changing the value. Defaults to ~2 Mb.'
		)
		.default('max-match-len', '2e5')
		/*.requiresArg('max-match-len')
	.coerce('max-match-len', function(val) {
		return Number(val) || (needHelp = 'Please provide a number as argument to --max-match-len');
	})*/

		.boolean('j')
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
\`r\` as an alias for \`require\` with both commands expanded to understand a relative path even if it is not starting with \`./\`, 
\`fs\` from node, 
\`path\` from node, 
\`globs\` from npm, 
\`text\`: If the '--js-full-text' flag is set this will contain the full text being searched i.e. file content or piped data (the haystack), 
\`find\`: pattern searched for (the needle), 
\`bytes\`: total size of the haystack in bytes, 
\`size\`: human-friendly representation of the total size of the haystack, 
\`time\`: String representing the local time when the command was invoked (same for each file),
\`time_obj\`: date object representing \`time\`,
\`now\`: String representing the local current time (might be different for each file),
\`now_obj\`: date object representing \`now\`,
\`cwd\`: current process working dir, 
\`nl\`: a new-line char,
\`_\`: a single space char (for easy string concatenation).

The following values are available if haystack originate from a file:
\`file\`: contains the full path of the active file being searched (including full filename), 
\`file_rel\`: contains \`file\` relative to current process working dir, 
\`dirpath\`: contains the full path without filename of the active file being searched, 
\`dirpath_rel\`: contains \`dirpath\` relative to current process working dir, 
\`filename\`: is the full filename of the active file being searched without path, 
\`name\`: filename of the active file being searched with no extension, 
\`ext\`: extension of the filename including leading dot, 
\`mtime\`: ISO inspired representation of the last local modification time of the current file, 
\`mtime_obj\`: date object representing \`mtime\`, 
\`ctime\`: ISO representation of the local creation time of the current file. 
\`ctime_obj\`: date object representing \`ctime\`. 

All variables, except from modules, date objects, \´text\` \´nl\` and \`_\`, has a corresponding variable name followed by \`_\` where the content has an extra space at the end (for easy concatenation). 
`
		)

		.boolean('js-full-text')
		.describe(
			'js-full-text',
			'Exposes the full text being searched as `text` when the replacement is generated from javascript. Please note performance overhead with many or large files. Will force piped data to be hold in memory instead of streamed.'
		)
		.implies('js-full-text', 'j')

		.boolean('B')
		.describe(
			'B',
			'Avoid temporary backing up file. Works async (independent of -A flag) and will speed up things but at one point data lives only in memory, and you will lose the content if the process is abrupted.'
		)
		.alias('B', 'void-backup')

		.boolean('b')
		.describe('b', 'Keep a backup file of the original content.')
		.alias('b', 'keep-backup')

		.boolean('o')
		.describe(
			'o',
			'Output the final result instead of saving to file. Will also output content even if no replacement has taken place. Will automaticly be set if its detected that data is being piped further.'
		)
		.alias('o', 'output')

		.boolean('O')
		.describe(
			'O',
			'Will disable the check setting the --output flag if data is being piped further.'
		)
		.alias('O', 'void-auto-output')

		.boolean('m')
		.describe(
			'm',
			`Output each match on a new line. ` +
				`Will not replace any content but you still need to provide a dummy value (like \`_\`) as replacement parameter. ` +
				`If search pattern does not contain matching groups the full match will be outputted. ` +
				`If search pattern does contain matching groups only matching groups will be outputted (same line with no delimiter). ` +
				``
		)
		.alias('m', 'output-match')

		.boolean('L')
		.describe(
			'L',
			'literally search for the string provided as pattern (regex flags for global search/case insensitive still applied).'
		)
		.alias('L', 'literal-search')

		.string('exclude')
		.describe(
			'exclude',
			'Exclude any files where the absolute path matches such case insensetive regex. Defaults to "node_modules"'
		)
		.default('exclude', 'node_modules')

		/*
		// like trimming the last nl. Think its about the "echo" thing
        .boolean('N')
        .alias('N', 'void-newline')
        .describe('N',    
            `Avoid having newline when printing or piping data. `+
            `Normally . `+
               ''
        )
	
	
	-A (Expect there to be no match and return exit 1 if found)
	-a (Expect there to be a match and return exit 1 if not found)
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

    .boolean('n')
        .describe('n', "Do replacement on file names instead of file content (rename the files)")
        .alias('n', 'name')

    // https://github.com/eugeneware/replacestream
  
	.integer('M')
        .describe('M', "Maximum length of match. Set this value only if any single file of your ")
        .alias('M', 'max-match-len')
        .default('M', false)


   
    .boolean('G')
        .describe('G', "filename/globas are filename(s) for files containing one filename/globs on each line to be search/replaced")
        .alias('G', 'globs-file')

    .boolean('g')
        .describe('g', "filename/globs will be piped in. If any filename/globs are given in command the piped data will be prepened")
        .alias('g', 'glob-pipe')


    .boolean('j')
        .describe('j', "Pattern is javascript source that will return a string giving the pattern to use")
        .alias('j', 'pattern-js')


    .boolean('glob-js')
        .describe('glob-js', "filename/globs are javascript source that will return a string with newline seperating each glob to work on")


    */

		.help('h')
		.describe('h', 'Display help.')
		.alias('h', 'help')

		.epilog(`Inspiration: .oO(What should 'sed' have been by now?)`);

	return cli.bucket('globs').run();
}
