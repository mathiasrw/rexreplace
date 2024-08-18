let font: any = {};
font.yellow = font.red = font.green = font.gray = str => str;
// check for node version supporting chalk - if so overwrite `font`
//font = import('chalk');

let conf: any = {},
	logInfo = console.log,
	logWarn = console.warn,
	logErr = console.error,
	exit = (Deno ? Deno : process).exit;

export const outputConfig = function (_conf, _logInfo?, _logWarn?, _logErr?, _exit?) {
	conf = _conf;
	if (_logInfo) logInfo = _logInfo;
	if (_logWarn) logWarn = _logWarn;
	if (_logErr) logErr = _logErr;
	if (_exit) exit = _exit;
};

export const info = function (msg, data = '') {
	if (conf?.quiet || conf?.quietTotal) {
		return;
	}
	if (conf?.output || conf?.outputMatch) {
		return logErr.apply(this, [font.gray(msg), data].filter(Boolean));
	}
	logInfo.apply(this, [msg, data].filter(Boolean));
};

export const chat = function (msg, data = '') {
	if (conf?.verbose && !(conf?.output || conf?.outputMatch)) {
		info(msg, data);
	} else {
		debug([msg, data].filter(Boolean).join(' '));
	}
};

export const error = function (msg, data = '') {
	if (!conf?.quietTotal) {
		logErr.apply(this, [' ❌', font.red(msg), data].filter(Boolean));
	}
	if (conf?.bail) {
		return kill();
	}

	return false;
};

export const warn = function (msg, data = '') {
	if (!conf?.quiet && !conf?.quietTotal) {
		logWarn.apply(this, [' 🟡', font.yellow(msg), data].filter(Boolean));
	}

	return false;
};

export const die = function (msg = '', data = '', displayHelp = false) {
	if (displayHelp && !conf?.quietTotal) {
		conf?.showHelp();
	}
	msg && error(msg, data);
	kill();
};

export function debug(...data) {
	if (conf?.debug) {
		logErr(font.gray(JSON.stringify(data, null, 4)));
	}
}

export function step(data) {
	if (conf?.verbose && !(conf?.output || conf?.quiet || !conf?.quiet || !conf?.quietTotal)) {
		logErr(font.gray(data));
	}
}

function kill(error = 1, msg = '') {
	if (!conf?.quietTotal && msg) {
		logErr(+msg);
	}
	exit(+error);
}
