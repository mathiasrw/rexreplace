#!/usr/bin/env node
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var version = '2.1.0';
var fs = require('fs');
var path = require('path');
var font = require('chalk');
var globs = require('globs');

var pattern = void 0,
    replacement = void 0;
var helpAndDie = false;
if (process.argv.length < 4) {
	helpAndDie = true;
} else {
	var _process$argv$splice = process.argv.splice(2, 2);

	var _process$argv$splice2 = _slicedToArray(_process$argv$splice, 2);

	pattern = _process$argv$splice2[0];
	replacement = _process$argv$splice2[1];
}

var yargs = require('yargs').strict().usage('RexReplace ' + version + ': Regexp search and replace for files using lookahead and backreference to matching groups in the replacement. Defaults to global multiline case-insensitive search.\n\n> rexreplace searchFor replaceWith filename').example("> rexreplace '(f?(o))o(.*)' '$3$1$2' myfile.md", "'foobar' in myfile.md will become 'barfoo'").example('').example("> rexreplace -I 'Foo' 'xxx' myfile.md", "'foobar' in myfile.md will remain 'foobar'").example('').example('> rexreplace \'^#\' \'##\' *.md', 'All markdown files in this dir got all headlines moved one level deeper').version('v', 'Echo rexreplace version', version).alias('v', 'version').boolean('I').describe('I', 'Void case insensitive search pattern.').alias('I', 'void-ignore-case').boolean('M').describe('M', 'Void multiline search pattern. Makes ^ and $ match start/end of whole content rather than each line.').alias('M', 'void-multiline').boolean('u').describe('u', 'Treat pattern as a sequence of unicode code points.').alias('u', 'unicode').describe('e', 'Encoding of files.').alias('e', 'encoding').default('e', 'utf8').boolean('o').describe('o', 'Output the result instead of saving to file. Will also output content even if no replacement have taken place.').alias('o', 'output')
//.conflicts('o', 'd')

.boolean('q').describe('q', "Only display erros (no other info)").alias('q', 'quiet').boolean('Q').describe('Q', "Never display erros or info").alias('Q', 'quiet-total').boolean('H').describe('H', "Halt on first error").alias('H', 'halt').default('H', false).boolean('d').describe('d', "Print debug info").alias('d', 'debug').boolean('€').describe('€', "Void having '€' as alias for '$' in pattern and replacement").alias('€', 'void-euro')

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

.help('h').alias('h', 'help').epilog('What "sed" should have been...');

var args = yargs.argv;

debug(args);

if (helpAndDie) {
	die('Need both pattern and replacement as arguments', true);
}

if (!args['€']) {
	pattern = pattern.replace('€', '$');
	replacement = replacement.replace('€', '$');
}

var flags = 'g';
if (!args['void-ignore-case']) {
	flags += 'i';
}
if (!args['void-multiline']) {
	flags += 'm';
}
if (args.unicode) {
	flags += 'u';
}

debug(flags);

// Get regex pattern

var regex = void 0;
try {
	regex = new RegExp(pattern, flags);
} catch (err) {
	die('Wrong formatted regexp', err);
}

// The rest are files
var files = globs.sync(args._);

files
// Correct filepath
.map(function (filepath) {
	return path.normalize(process.cwd() + '/' + filepath);
})

// Find out if any filepaths are invalid
.filter(function (filepath) {
	return fs.existsSync(filepath) ? true : error('File not found:', filepath);
})

// Do the replacement 
.forEach(function (filepath) {
	return replaceInFile(filepath, regex, replacement, args.encoding);
});

function replaceInFile(file, regex, replace, encoding) {
	fs.readFile(file, encoding, function (err, data) {
		if (err) {
			return error(err);
		}
		debug('About to replace in: ' + file);
		var result = data.replace(regex, replace);

		if (args.output) {
			debug('Outputting result from: ' + file);
			return process.stdout.write(result);
		}

		// Nothing replaced = no need for writing file again 
		if (result === data) {
			debug('Nothing changed in: ' + file);
			return;
		}

		debug('About to write to: ' + file);
		fs.writeFile(file, result, encoding, function (err) {
			if (err) {
				return error(err);
			}
			info(file);
		});
	});
}

function info(msg) {
	var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

	if (args.quiet || args['quiet-total']) {
		return;
	}
	console.log(font.green(msg), data);
}

function die(msg) {
	var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
	var displayHelp = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

	if (displayHelp) {
		yargs.showHelp();
	}
	error(msg, data);
	kill();
}

function error(msg) {
	var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

	if (!args.quiet && !args['quiet-total']) {
		console.error(font.red(msg), data);
	}
	if (args.halt) {
		kill();
	}
	return false;
}

function debug(data) {
	if (args.debug) {
		console.log(font.gray(JSON.stringify(data, null, 4)));
	}
}

function kill() {
	var error = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;

	setTimeout(function () {
		return process.exit(error);
	}, 10); // give stdout a bit of time to finish	
}