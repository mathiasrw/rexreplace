let font: any = {};
font.red = font.green = font.gray = (str) => str;
// check for node version supporting chalk - if so overwrite `font`
//const font = import('chalk');

let config: any = null;

export const outputConfig = function (_config) {
	config = _config;
};

export const info = function (msg, data = '') {
	if (config.quiet || config.quietTotal) {
		return;
	}
	console.error(font.gray(msg), data);
};

export const warn = function (msg) {
	// The line break gives an empty line under the warning
	info(' 🟡 ' + msg, '\n');
};

export const chat = function (msg, data = '') {
	if (config.verbose) {
		info(msg, data);
	} else {
		debug(msg + ' ' + data);
	}
};

export const die = function (msg = '', data = '', displayHelp = false) {
	if (displayHelp && !config.quietTotal) {
		config.showHelp();
	}
	// The line break gives an empty line under the error
	msg && error(' ❌ ' + msg, data + '\n');
	kill();
};

export const error = function (msg, data = '') {
	if (!config.quietTotal) {
		console.error(font.red(msg), data);
	}
	if (config.halt) {
		kill();
	}
	return false;
};

export function debug(data) {
	if (config.debug) {
		console.error(font.gray(JSON.stringify(data, null, 4)));
	}
}

export function step(data) {
	if (config.verbose) {
		debug(data);
	}
}

function kill(exitCode = 1) {
	process.exit(exitCode);
}
