const font = {
	red: (x) => `\x1b[31m${x}\x1b[39m`,
	green: (x) => `\x1b[32m${x}\x1b[39m`,
	gray: (x) => `\x1b[90m${x}\x1b[39m`,
};

// check for node version supporting chalk - if so overwrite `font`
// font = require('chalk');

let config: any = null;

export const setOutputConfig = function(_config) {
	config = _config;
};

export const info = function(msg, data = '') {
	if (config.quiet || config.quietTotal) {
		return;
	}
	console.error(font.gray(msg), data);
};

export const chat = function(msg, data = '') {
	if (config.verbose) {
		info(msg, data);
	} else {
		debug(msg, data);
	}
};

export const die = function(msg, data = '', displayHelp = false) {
	if (displayHelp && !config.quietTotal) {
		config.showHelp();
	}
	error(msg, data);
	kill(msg);
};

export const error = function(msg, data = '') {
	if (!config.quiet && !config.quietTotal) {
		console.error('');
		console.error('  ⚠️   ' + font.red(msg), data);
		console.error('');
	}
	if (config.halt) {
		kill(msg);
	}
	return false;
};

export function debug(msg, data) {
	if (config.debug) {
		console.error(msg, '\x1b[90m');
		console.error(data);
		console.error('\x1b[39m');
	}
}

export function step(msg: string, data: any = '') {
	if (config.verbose) {
		debug(font.green(msg), data);
	}
}

function kill(msg = '', error = 1) {
	console.error(font.gray('      See instructions with: ') + font.green('rexreplace --help'));
	console.error('\x1b[90m');
	process.exitCode = error;
	throw new Error(msg);
}
