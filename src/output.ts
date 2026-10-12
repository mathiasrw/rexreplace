let font: any = {};
font.red = font.green = font.gray = (str) => str;
// check for node version supporting chalk - if so overwrite `font`
//const font = import('chalk');

let config: any = null;

// Tracks whether a changed-file name has already been written, so --name-delimiter
// can separate names without a trailing delimiter after the last one.
let namePrinted = false;

export const outputConfig = function (_config) {
	config = _config;
	namePrinted = false;
};

// Verbose / informational messages stay on stderr (errors, --verbose, --debug).
export const info = function (msg, data = '') {
	if (config.quiet || config.quietTotal) {
		return;
	}
	console.error(font.gray(msg), data);
};

// Names of files changed in place go to stdout (like grep -l / gofmt -l / prettier --write).
// Not used together with --output, --output-match or piped data (those paths never call this).
export const printChangedName = function (name) {
	if (config.quiet || config.quietTotal) {
		return;
	}

	if (config.null) {
		process.stdout.write(name + '\0');
		return;
	}

	if (undefined !== config.nameDelimiter && null !== config.nameDelimiter) {
		if (namePrinted) {
			process.stdout.write(config.nameDelimiter);
		}
		process.stdout.write(name);
		namePrinted = true;
		return;
	}

	process.stdout.write(name + '\n');
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
