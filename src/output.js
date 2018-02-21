
// let font = {};
// font.red = font.green = font.gray = str=>str;
// check for node version supporting chalk - if so overwrite `font` 
const font = require('chalk');

module.exports = function(config){

	let me = {};

	me.info = function(msg, data=''){
		if(config.quiet || config.quietTotal){
			return;
		}
		console.error(font.gray(msg), data);	
	};

	me.chat = function(msg, data=''){
		if(config.verbose){
			me.info(msg, data);
		} else {
			me.debug(msg+' '+data);
		}
	};

	me.die = function(msg, data='', displayHelp=false){
		if(displayHelp && !config.quietTotal){
			config.showHelp();
		}
		me.error(msg, data);
		me.kill();
	};

	me.error = function(msg, data=''){
		if(!config.quiet && !config.quietTotal){
			console.error(font.red(msg), data);
		}
		if(config.halt){
			me.kill();
		}
		return false;
	};

	me.debug = function(data){
		if(config.debug){
			console.error(font.gray(JSON.stringify(data, null,4)));
		}
	};

	me.step = function(data){
		if(config.verbose){
			me.debug(data);
		}
	};

	me.kill = function(error=1){
		process.exitCode = error;
	};

	return me;
};

