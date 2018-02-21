
const fs = require('fs');
const path = require('path'); 
const globs = require('globs');

const version = '2.6.0';

module.exports = function(config){

	let {step, debug, chat, info, error, die, kill} = require('./output')(config);

	config.pattern = getFinalPattern(config)||'';

	config.replacement = getFinalReplacement(config)||'';	

	config.regex = getFinalRegex(config)||'';

	// data is piped in and will always be printed - but must be ignored if files are also given
	if(null !== config.pipedData && !config.replacementPipe){		
		if(config.files.length){
			chat('Ignoring piped data as file/glob was also given.');
		} else {
			debug('Outputting result from piped data');
			return process.stdout.write(config.pipedData.replace(config.regex, config.replacement));			
		}
	
	}

	config.files = globs.sync(config.files);

	debug(config.files.length+' files found');

	config.files
		// Correct filepath
		//.map(filepath=>path.normalize(process.cwd()+'/'+filepath))	
		// Find out if any filepaths are invalid
		.filter(filepath=>fs.existsSync(filepath)?true:error('File not found:',filepath))

		// Do the replacement 
		.forEach(filepath=>treatFile(filepath,config))
	;


	function treatFile(file,config){
		fs.readFile(file, config.encoding, function (err,data) {
			if (err) {
				return error(err);
			}
			debug('About to replace in: '+file);
			const result = data.replace(config.regex, config.replacement);

			if(config.output){
				debug('Outputting result from: '+file);
				return process.stdout.write(result);
			}

			// Nothing replaced = no need for writing file again 
			if(result === data){
				debug('Nothing changed in: '+file);
				return;
			}

			debug('About to write to: '+file);
			fs.writeFile(file, result, config.encoding, function (err) {
				if (err){
					return error(err);
				}
				info(file);
			});
		});
	}

	/*function evalJs(jsString, explode=false){
		let result, source = 
				`function(){


				}`

	}*/




	function getFinalPattern(config){
		let pattern = config.pattern;

		if(config.patternFile){
			pattern = fs.readFileSync(pattern,'utf8');
			pattern = oneLinerFromFile(pattern);
		}

		return pattern;
	}

	function getFinalReplacement(config){

		/*if(config.replacementFile){
			return oneLinerFromFile(fs.readFileSync(replacement,'utf8'));
		}*/

		let _pipe = config.pipedData;

		if(config.outputMatch){
			if('6'>process.versions.node){
				return die('outputMatch is only supported in node 6+');
			}
			return function(){
								process.stdout.write(arguments[0]+"\n");
								return '';
							}; 
		}

		if(config.replacementJsDynamic && !(/\$\d/.test(config.replacement))){
			config.replacementJsDynamic = false;
			config.replacementJs = true; 
		}

		if(config.replacementJs && /\$\d/.test(config.replacement)){
			info('Use the -J flag to use captured groups dynamically in the replacement'); 
		}

		if(config.replacementJs){
			return eval(config.replacement); // Todo: make a bit more scoped?
		}  

		if(config.replacementJsDynamic){

			if('6'>process.versions.node){
				return die('replacementJsDynamic is only supported in node 6+');
			}

			let code = config.replacement;

			return function(){
								for(var i = 0;i<arguments.length-2;i++){
									eval('var $'+i+'='+JSON.stringify(arguments[i])+';'); // we are already using eval - so wth...
								}
								return eval(code);
							}; 
		} 

		return config.replacement;
	}
/*
	function oneLinerFromFile(str){
		var lines = str.split("\n");
		if(liens.length===1){
			return str;
		}
		return lines.map(function (line) {
			return line.trim();
		}).join(' ');
	}
*/

	function getFinalRegex(config){
		let regex = null;	

		let flags = getFlags(config);
		
		try{
			regex = new RegExp(config.pattern,flags);
		} catch (err){
			die('Wrongly formatted regex pattern', err);
		}

		return regex;

	}

	function getFlags(config){
		let flags = '';

		if(!config.voidGlobal){
			flags += 'g';
		}

		if(!config.voidIgnoreCase){
			flags += 'i';
		}

		if(!config.voidMultiline){
			flags += 'm';
		}

		if(config.unicode){
			flags += 'u';
		}

		step(flags);
		
		return flags;
	}


};

module.exports.version = version;
