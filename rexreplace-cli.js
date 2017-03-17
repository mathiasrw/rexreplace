#!/usr/bin/env node

const version = `2.0.0`;
const fs = require('fs');
const path = require('path'); 
const font = require('chalk');
const globs = require('globs');

let yargs = require('yargs')
	.strict()

	.usage('RexReplace '+version+': Regexp search and replace for files using lookahead and backreference to matching groups in the replacement. Defaults to global multiline case-insensitive search.\n\n> rexreplace searchFor replaceWith filename')

	.example("> rexreplace '(f?(o))o(.*)' '$3$1$2' myfile.md", "'foobar' in myfile.md will become 'barfoo'")
		.example('')
		.example("> rexreplace -I 'Foo' 'xxx' myfile.md", "'foobar' in myfile.md will remain 'foobar'")
		.example('')
		.example(`> rexreplace '^#' '##' *.md`, `All markdown files in this dir got all headlines moved one level deeper`)
		
	.version('v', 'Echo rexreplace version', version)
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

	.describe('e', 'Encoding of files.')
		.alias('e', 'encoding')
		.default('e', 'utf8')

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


	/* // Ideas

	.boolean('n')
		.describe('n', "Do replacement on file names instead of file content (rename the files)")
		.alias('n', 'name')



	.boolean('v')
		.describe('v', "More chatty output")
		.alias('v', 'verbose')

	.boolean('p')
		.describe('p', "Pattern will be piped in. Note that replacement must then be first argument. Other elements like -P and -€ will be applyed afterwards.")
		.alias('p', 'pattern-pipe')

	.boolean('r')
		.describe('r', "Replacement will be piped in. Note that filename/globs must then be second argument")
		.alias('r', 'replacement-pipe')


	.boolean('P')
		.describe('P', "Pattern is a filename from where the pattern will be generated. Pattern will be defined by each line trimmed and having newlines removed followed by other other rules (like -€).)")
		.alias('P', 'pattern-file')

	.boolean('R')
		.describe('R', "Replacement is a filename from where the replacement will be generated. Replacement will be defined by each line trimmed and having newlines removed followed by other other rules (like -€).")
		.alias('R', 'replacement-file')


	.boolean('G')
		.describe('G', "filename/globas are filename(s) for files containing one filename/globs on each line to be search/replaced")
		.alias('G', 'globs-file')

	.boolean('g')
		.describe('g', "filename/globs will be piped in. If any filename/globs are given in command the piped data will be prepened")
		.alias('g', 'glob-pipe')


	.boolean('j')
		.describe('j', "Pattern is javascript source that will return a string giving the pattern to use")
		.alias('j', 'pattern-js')


	.boolean('J')
		.describe('J', "Replacement is javascript source that will return a string giving the replacement to use to use")
		.alias('j', 'replacement-js')


	.boolean('glob-js')
		.describe('glob-js', "filename/globs are javascript source that will return a string with newline seperating each glob to work on")


	*/

	.help('h')
		.alias('h', 'help')

	.epilog('What "sed" should have been...')
	
;

const args = yargs.argv;

debug(args);	

if(args._.length<3){
	die('Need more than 2 arguments',args._.length+' was found',true);
}

if(!args['€']){
	args._[0] = args._[0].replace('€','$');
	args._[1] = args._[1].replace('€','$');
}

let flags = 'g';
if(!args['void-ignore-case']){
	flags += 'i';
}
if(!args['void-multiline']){
	flags += 'm';
}
if(args.unicode){
	flags += 'u';
}

debug(flags);

// Get regex pattern
let regex = args._.shift();
try{
	regex = new RegExp(regex,flags);
} catch (err){
	die('Wrong formatted regexp', regex);
}

// Get replacement
const replace = args._.shift();

// The rest are files
const files = globs.sync(args._);

files
	// Correct filepath
	.map(filepath=>path.normalize(process.cwd()+'/'+filepath))
	
	// Find out if any filepaths are invalid
	.filter(filepath=>fs.existsSync(filepath)?true:error('File not found:',filepath))

	// Do the replacement 
	.forEach(filepath=>replaceInFile(filepath,regex,replace,args.encoding))
;


function replaceInFile(file,regex,replace,encoding){
	fs.readFile(file, encoding, function (err,data) {
		if (err) {
			return error(err);
		}
		debug('About to replace in: '+file);
		const result = data.replace(regex, replace);

		if(args.output){
			debug('Outputting result from: '+file);
			return process.stdout.write(result);
		}

		// Nothing replaced = no need for writing file again 
		if(result === data){
			debug('Nothing changed in: '+file);
			return;
		}

		debug('About to write to: '+file);
		fs.writeFile(file, result, encoding, function (err) {
			if (err){
				return error(err);
			}
			info(file);
		});
	});
}

function info(msg, data=''){
	if(args.quiet || args['quiet-total']){
		return;
	}
	console.log(font.green(msg), data);	
}

function die(msg, data='', displayHelp=false){
	if(displayHelp){
		yargs.showHelp();
	}
	error(msg, data);
	kill();
}

function error(msg, data=''){
	if(!args.quiet && !args['quiet-total']){
		console.error(font.red(msg), data);
	}
	if(args.halt){
		kill();
	}
	return false;
}

function debug(data){
	if(args.debug){
		console.log(font.gray(JSON.stringify(data, null,4)));
	}
}

function kill(error=1){
	setTimeout(()=>process.exit(error),10); // give stdout a bit of time to finish	
}


