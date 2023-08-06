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
	if (config.output || config.outputMatch)
		return console.error.apply(this, [font.gray(msg), data].filter(Boolean));

	console.log.apply(this, [msg, data].filter(Boolean));
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
	msg && error(' ❌ ' + msg, data);
	kill();
};

export const error = function (msg, data = '') {
	if (!config.quiet && !config.quietTotal) {
		console.error.apply(this, [font.red(msg), data].filter(Boolean));
	}
	if (config.halt) {
		kill(msg);
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

function kill(error = 1, msg = '') {
	msg && console.error(+msg);
	process.exit(error);
}
