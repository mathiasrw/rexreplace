let font: any = {};
font.red = font.green = font.gray = (str) => str;
// check for node version supporting chalk - if so overwrite `font`
//const font = import('chalk');

let conf: any = null;

export const outputConfig = function (_conf) {
	conf = _conf;
};

export const info = function (msg, data = '') {
	if (conf.quiet || conf.quietTotal) {
		return;
	}
	if (conf.output || conf.outputMatch)
		return console.error.apply(this, [font.gray(msg), data].filter(Boolean));

	console.log.apply(this, [msg, data].filter(Boolean));
};

export const chat = function (msg, data = '') {
	if (conf.verbose) {
		info(msg, data);
	} else {
		debug([msg, data].filter(Boolean).join(' '));
	}
};

export const error = function (msg, data = '') {
	if (conf.bail) {
		return die(msg, data);
	}
	if (!conf.quietTotal) {
		console.error.apply(this, [' ❌',font.red(msg), data].filter(Boolean));
	}


	return false;
};

export const die = function (msg = '', data = '', displayHelp = false) {
	if (displayHelp && !conf.quietTotal) {
		conf.showHelp();
	}
	msg && error(' ❌ ' + msg, data);
	kill();
};

export function debug(data) {
	if (conf.debug) {
		console.error(font.gray(JSON.stringify(data, null, 4)));
	}
}

export function step(data) {
	if (conf.verbose) {
		console.error(font.gray(data));
	}
}

function kill(error = 1, msg = '') {
	msg && console.error(+msg);
	process.exit(+error);
}
