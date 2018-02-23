
// CLI interface for rexreplace

const rexreplace = require('./core');

let pattern, replacement;


// To avoid problems with patterns or replcements starting with '-' the two first arguments can not contain flags and is removed before yargs does it magic - but we still need to handle -version and -help
let needHelp = false;
if(process.argv.length<4){
    needHelp = true;
} else {
    [pattern, replacement] = process.argv.splice(2,2);
}



const yargs = require('yargs')
    .strict()

    .usage(    'RexReplace '+rexreplace.version+': Regexp search and replace for files using lookahead and backreference to matching groups in the replacement. Defaults to global multiline case-insensitive search.\n\n'+
            '> rexreplace pattern replacement [fileGlob|option]+')

    .example(`> rexreplace 'Foo' 'xxx' myfile.md`, `'foobar' in myfile.md will become 'xxxbar'`)
        .example('')
        .example(`> rr Foo xxx myfile.md`,`The alias 'rr' can be used instead of 'rexreplace'`)
        .example('')
        .example(`> rexreplace '(f?(o))o(.*)' '$3$1€2' myfile.md`, `'foobar' in myfile.md will become 'barfoo'`)
        .example('')
        .example(`> rexreplace '^#' '##' *.md`, `All markdown files in this dir got all headlines moved one level deeper`)
        
    .version('v', 'Print rexreplace version (can be given as only argument)', rexreplace.version)
        .alias('v', 'version')

     .boolean('V')
        .describe('V', "More chatty output")
        .alias('V', 'verbose')
        //.conflicts('V', 'q')
        //.conflicts('V', 'Q')
    

    .boolean('I')
        .describe('I', 'Void case insensitive search pattern.')
        .alias('I', 'void-ignore-case')
    
    .boolean('G')
        .describe('G', 'Void global search (work only with first the match).')
        .alias('G', 'void-global')

    .boolean('M')
        .describe('M', 'Void multiline search pattern. Makes ^ and $ match start/end of whole content rather than each line.')
        .alias('M', 'void-multiline')

    .boolean('u')
        .describe('u', 'Treat pattern as a sequence of unicode code points.')
        .alias('u', 'unicode')

    .default('e', 'utf8')
        .alias('e', 'encoding')
        .describe('e', 'Encoding of files/piped data.')

    .boolean('q')
        .describe('q', "Only display errors (no other info)")
        .alias('q', 'quiet')

    .boolean('Q')
        .describe('Q', "Never display errors or info")
        .alias('Q', 'quiet-total')

    .boolean('H')
        .describe('H', "Halt on first error")
        .alias('H', 'halt')
        .default('H', false)

    .boolean('d')
        .describe('d', "Print debug info")
        .alias('d', 'debug')

    .boolean('€')
        .describe('€', "Void having '€' as alias for '$' in pattern and replacement parameters")
        .alias('€', 'void-euro')

    .boolean('o')
        .describe('o', 'Output the final result instead of saving to file. Will also output content even if no replacement has taken place.')
        .alias('o', 'output')
        //.conflicts('o','O')

    .boolean('A')
        .alias('A', 'void-async')
        .describe('A',    
            `Handle files in a synchronous flow. Good to limit memory usage when handling large files. `+
       		''
        )

    .boolean('B')
        .describe('B', "Avoid temporary backing up file. Works async (independent of -A flag) and will speed up things but at one point data lives only in memory and you will lose the content if the process is abrupted.")
        .alias('B', 'void-backup')


    .boolean('b')
        .describe('b', "Keep a backup file of the original content.")
        .alias('b', 'keep-backup')


    .boolean('m')
        .describe('m', 
        	`Output each match on a new line. `+
            `Will not replace any content but you still need to provide a dummy value (like '_') as replacement parameter. `+
        	`If search pattern does not contain matching groups the full match will be outputted. `+
        	`If search pattern does contain matching groups only matching groups will be outputted (same line with no delimiter). `+
            ``)
        .alias('m', 'output-match')

    .boolean('T')
        .alias('T', 'trim-pipe')
        .describe('T',    
            `Trim piped data before processing. `+
            `If piped data only consists of chars that can be trimmed (new line, space, tabs...) it will be considered an empty string. `+
       		''
        )
    
    .boolean('R')
        .alias('R', 'replacement-pipe')
        .describe('R',    
            `Replacement will be piped in. You still need to provide a dummy value (like '_') as replacement parameter.`+
       		''
        )

    .boolean('j')
        .alias('j', 'replacement-js')
        .describe('j',    
            `Treat replacement as javascript source code. `+
            `The statement from the last expression will become the replacement string. `+
            `Purposefully implemented the most insecure way possible to remove _any_ incentive to consider running code from an untrusted person - that be anyone that is not yourself. `+
            `The full match will be available as a javascript variable named $0 while each captured group will be avaiable as $1, $2, $3, ... and so on. `+
            `At some point the $ char _will_ give you a headache when used from the command line, so use €0, €1, €2 €3 ... instead. `+
            `If the javascript source code references to the full match or a captured group the code will run once per match. Otherwise it will run once per file. `+
            `The code has access to the following variables: `+
          	`'_fs' from node, `+
            `'_globs' from npm, `+
            `'_pipe' is the piped data into the command (null if no piped data), `+
            `'_find' is the final pattern searched for. `+
            `'_text' is the full text being searched (Corresponds to file contents or piped data).`+
            `The following values are also available if working on a file (if data is being piped they are all set to an empty string): `+
            `'_file' is the full path of the active file being searched (including full filename), `+
            `'_path' is the full path without filename of the active file being searched, `+
            `'_filename' is the full filename of the active file being searched, `+
            `'_name' is the filename of the active file being searched with no extension, `+
            `'_ext' is the extension of the filename including leading dot. `+
            ''
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
        .describe('h', "Display help.")
        .alias('h', 'help')

    .epilog(`Inspiration: .oO(What should 'sed' have been by now?)`)
    
;

function backOut(){
	yargs.showHelp();
    process.exitCode = 1;
}

function unescapeString(str){
	return eval("'"+str.replace(/'/g,"\\'")+"'");
}

(function(){
	if(needHelp){
	    return backOut();
	}

	// CLI interface default has € as alias for $
	if(!yargs.argv.voidEuro){
	    pattern 	=     pattern.replace(/€/g,'$');
	    replacement = replacement.replace(/€/g,'$');
	}

	// All options into one big config object for the rexreplace core
	let config = {};

	// Use only camelCase full lenght version of settings so we make sure the core can be documented propperly
	Object.keys(yargs.argv).forEach(key=>{
	    if(1<key.length && key.indexOf('-')<0){
	        config[key] = yargs.argv[key];
	    }
	});

	let pipeInUse = false;
	let pipeData = '';
	config.files = yargs.argv._;
	config.pipedData = null;
	config.showHelp = yargs.showHelp;
	config.pattern = pattern;
	if(config.replacementJs){
		config.replacement = replacement;
	} else {
		config.replacement = unescapeString(replacement);
	}

	/*if(Boolean(process.stdout.isTTY)){
		config.output = true;
	}*/

	if (Boolean(process.stdin.isTTY)) {
		if(config.replacementPipe){
			return backOut();
		}
		rexreplace(config);
	} else {
		process.stdin.setEncoding(config.encoding);

		process.stdin.on('readable', ()=>{
			let chunk = process.stdin.read();
			
			if(null !== chunk){
				pipeInUse = true;
				pipeData += chunk;
				while((chunk = process.stdin.read())){
					pipeData += chunk;
				}
			}
		});

		process.stdin.on('end', ()=>{
			if(pipeInUse){
				if(yargs.argv.trimPipe){
					pipeData = pipeData.trim();
				}
				config.pipedData = pipeData;

			}
			rexreplace(config);
		});

	}
})();
