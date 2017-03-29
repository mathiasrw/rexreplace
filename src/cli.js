let rexreplace = require('./core');

let    pattern, replacement;

// CLI interface for rexreplace

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
        .example(`> rexreplace '(f?(o))o(.*)' '$3$1$2' myfile.md`, `'foobar' in myfile.md will become 'barfoo'`)
        .example('')
        .example(`> rexreplace '^#' '##' *.md`, `All markdown files in this dir got all headlines moved one level deeper`)
        
    .version('v', 'Print rexreplace version (can be given as only argument)', rexreplace.version)
        .alias('v', 'version')

    .boolean('I')
        .describe('I', 'Void case insensitive search pattern.')
        .alias('I', 'void-ignore-case')

    .boolean('M')
        .describe('M', 'Void multiline search pattern. Makes ^ and $ match start/end of whole content rather than each line.')
        .alias('M', 'void-multiline')

    .boolean('u')
        .describe('u', 'Treat pattern as a sequence of unicode code points.')
        .alias('u', 'unicode')

    .default('e', 'utf8')
        .alias('e', 'encoding')
        .describe('e', 'Encoding of files.')

    .boolean('o')
        .describe('o', 'Output the result instead of saving to file. Will also output content even if no replacement have taken place.')
        .alias('o', 'output')
        //.conflicts('o', 'd')

    .boolean('q')
        .describe('q', "Only display erros (no other info)")
        .alias('q', 'quiet')

    .boolean('Q')
        .describe('Q', "Never display erros or info")
        .alias('Q', 'quiet-total')

    .boolean('H')
        .describe('H', "Halt on first error")
        .alias('H', 'halt')
        .default('H', false)

    .boolean('d')
        .describe('d', "Print debug info")
        .alias('d', 'debug')

    .boolean('€')
        .describe('€', "Void having '€' as alias for '$' in pattern and replacement")
        .alias('€', 'void-euro')

    .boolean('J')
        .alias('J', 'replacement-js')
        .describe('J',    
            `Replacement is javascript source code. `+
            `Output from last statement will be used as final replacement. `+
            `Purposefully implemented the most insecure way possible to remove _any_ incentive to consider running code from an untrusted person - that be anyone that is not yourself. `+
        /*    
            `The sources runs once for each file to be searched, so you can make the replacement file specific. `+
            `The code has access to the following predefined values: `+
            `'fs' from node, `+
            `'globs' from npm, `+
            `'_pattern' is the final pattern. `+
            `The following values are also available but if content is being piped they are all set to an empty string: `+
            `'_file' is the full path of the active file being searched (including fiename), `+
            `'_path' is the full path without file name of the active file being searched, `+
            `'_filename' is the filename of the active file being searched, `+
            `'_name' is the filename of the active file being searched with no extension, `+
            `'_ext' is the filename of the active file being searched with no extension, `+
            `'_content' is the full content of the active file being searched or.`+
            */''
        )
    
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

    .boolean('step')
        .describe('step', "Print debug step info")

    .boolean('v')
        .describe('v', "More chatty output")
        .alias('v', 'verbose')

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

    .epilog(`Inspiration: .oO(What shuold 'sed' have been by now?)`)
    
;

if(needHelp){
    yargs.showHelp();
    process.exitCode = 1;
    return;
}

// CLI interface default has € as alias for $
if(!yargs.argv.voidEuro){
    pattern = pattern.replace('€','$');
    replacement = replacement.replace('€','$');
}

// All options into one big config object for the rexreplace core
let config = {};

// Use only camelCase full lenght version of settings so we make sure the core can be documented propperly
Object.keys(yargs.argv).forEach(key=>{
    if(1<key.length && key.indexOf('-')<0){
        config[key] = yargs.argv[key];
    }
});

config.files = yargs.argv._;
config.showHelp = yargs.showHelp;
config.pattern = pattern;
config.replacement = replacement;


rexreplace(config);
