#!/usr/bin/env deno run --allow-write
const {args} = Deno;
import {flags} from './deps.ts';

//import * as rexreplace from './engine.ts';

//let pattern, replacement;


let argv = flags.parse(args)


Deno.exit(0)

/*
// To avoid problems with patterns or replacements starting with '-' the two first arguments can not contain flags and are removed before yargs does it magic - but we still need to handle -version and -help
let needHelp = false;
if (args.length < 4) {
	needHelp = true;
} else {
	[pattern, replacement] = args.splice(0, 2);
}


function unescapeString(str='') {
	return new Function("return '" + str.replace(/'/g, "\\'") + "'")();
}

(function() {

	const RE_EURO = /€/g;
	// CLI interface default has € as alias for $
	if (!yargs.argv.voidEuro) {
		pattern = pattern.replace(RE_EURO, '$');
		replacement = replacement.replace(RE_EURO, '$');
	}

	// All options into one big config object for the rexreplace core
	let config: any = {};

	// Use only camelCase full lenght version of settings so we make sure the core can be documented propperly
	Object.keys(yargs.argv).forEach((key) => {
		if (1 < key.length && key.indexOf('-') < 0) {
			config[key] = yargs.argv[key];
		}
	});

	let pipeInUse = false;
	let pipeData = '';
	config.files = yargs.argv._;
	config.pipedData = null;
	config.showHelp = yargs.showHelp;
	config.pattern = pattern;
	if (config.replacementJs) {
		config.replacement = replacement;
	} else {
		config.replacement = unescapeString(replacement);
	}

	
	rexreplace.engine(config);

	if (0 && Boolean(/*Deno.isTTY().stdin* /)) {
		if (config.replacementPipe) {
			return backOut();
		}
		rexreplace.engine(config);
	} else {
		//Deno.stdin. setEncoding(config.encoding);
/*
		Deno.stdin.read(() => {
			let chunk = Deno.stdin.read();

			if (null !== chunk) {
				pipeInUse = true;
				pipeData += chunk;
				while ((chunk = process.stdin.read())) {
					pipeData += chunk;
				}
			}
		});

		process.stdin.on('end', () => {
			if (pipeInUse) {
				if (yargs.argv.trimPipe) {
					pipeData = pipeData.trim();
				}
				config.pipedData = pipeData;
			}
			rexreplace.engine(config);
		});* /
	}
})();

*/