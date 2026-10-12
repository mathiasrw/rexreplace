let font: any = {};
font.red = font.green = font.gray = (str) => str;
// check for node version supporting chalk - if so overwrite `font`
//const font = import('chalk');

let config: any = null;

// Same path must not be reported twice (e.g. overlapping globs)
const reported = new Set();

export const outputConfig = function (_config) {
	config = _config;
	reported.clear();
	if (config) {
		config.changedNames = [];
	}
};

// Names of files changed in place go to stdout (like grep -l / gofmt -l / prettier --write).
// config.nameDelimiter is '\n' by default, '\0' with --null, or the custom --name-delimiter.
// A custom delimiter is joined between names only (no trailing delimiter); see flushChangedNames.
export const info = function (msg, data = '') {
	if (config.quiet || config.quietTotal) {
		return;
	}

	const name =
		'' === data || undefined === data || null === data ? String(msg) : String(msg) + data;
	if (reported.has(name)) {
		return;
	}
	reported.add(name);

	if (config.nameDelimiterBetween) {
		config.changedNames.push(name);
		return;
	}

	process.stdout.write(name + config.nameDelimiter);
};

// Write custom --name-delimiter names in one go (no delimiter after the last name)
export const flushChangedNames = function () {
	if (config.quiet || config.quietTotal || !config.nameDelimiterBetween) {
		return;
	}
	if (config.changedNames && config.changedNames.length) {
		process.stdout.write(config.changedNames.join(config.nameDelimiter));
	}
};

// Verbose chatter stays on stderr (errors, --verbose, --debug)
export const chat = function (msg, data = '') {
	if (config.verbose) {
		if (!(config.quiet || config.quietTotal)) {
			console.error(font.gray(msg), data);
		}
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
