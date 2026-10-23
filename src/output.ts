// Test of stacked PRs (devops/stack2/b, commit 1). Not to be merged.
let font: any = {};
font.red = font.green = font.gray = (str) => str;
// check for node version supporting chalk - if so overwrite `font`
//const font = import('chalk');

let config: any = null;

// The char code of the last character of the last item printed to each stream (10 is a line break). Names and content never share a stream.
const lastItemChar = new Map();

// The char code of the last character printed to each stream
const lastPrintedChar = new Map();

export const outputConfig = function (_config) {
	config = _config;
	lastItemChar.clear();
	lastPrintedChar.clear();
};

// Thrown when the run can not go on. The engine adds the status so far, and the CLI ends the process.
export class Panic extends Error {
	panic = true;
	status = null;
}

// Everything is printed from here, so the last character of each stream is known
const write = function (text, stream) {
	stream.write(text);
	if (text) {
		lastPrintedChar.set(stream, text.charCodeAt(text.length - 1));
	}
};

// Without a delimiter there is a line break after an item, unless the item already ends with one.
// An empty item has the char code NaN, so it gets a line break too.
const after = function (end, delimiter) {
	return delimiter ?? (10 === end ? '' : '\n');
};

// With a tail the delimiter goes after every item, without one it goes in front of every item but the first
export const print = function (item, delimiter, tail, stream = process.stdout) {
	if (tail) {
		return write(item + after(item.charCodeAt(item.length - 1), delimiter), stream);
	}
	write(
		(lastItemChar.has(stream) ? after(lastItemChar.get(stream), delimiter) : '') + item,
		stream
	);
	lastItemChar.set(stream, item.charCodeAt(item.length - 1));
};

// With --nl what is printed ends with a line break
export const printDone = function () {
	if (!config.nl) {
		return;
	}
	lastPrintedChar.forEach((code, stream) => {
		if (10 !== code) {
			write('\n', stream);
		}
	});
};

// The name of a changed file goes to stdout so the names can be piped
export const info = function (name) {
	if (config.quiet || config.quietTotal) {
		return;
	}
	// stdout is taken when the result is printed, so then the names go to stderr
	const stream = config.output || config.outputMatch ? process.stderr : process.stdout;
	print(name, config.nameDelimiter, config.nameDelimiterTail, stream);
};

const note = function (msg) {
	if (config.quiet || config.quietTotal) {
		return;
	}
	write(font.gray(msg) + '\n', process.stderr);
};

export const warn = function (msg) {
	config.statusInfo?.warnings.push(msg);
	// The line break gives an empty line under the warning
	note(' 🟡 ' + msg + '\n');
};

// --verbose was asked for, so --quiet does not hide it. --quiet-total wins and hides it too.
// The status report keeps the same lines in `engine.steps`, so they are there even when they are not printed.
export const chat = function (msg) {
	config.statusInfo?.engine?.steps.push(msg);
	if (config.verbose && !config.quietTotal) {
		write(font.gray(msg) + '\n', process.stderr);
	}
};

export const die = function (msg = '', data = '', displayHelp = false) {
	if (displayHelp && !config.quietTotal) {
		config.showHelp();
	}
	const text = msg + (data ? ' ' + data : '');
	config.statusInfo?.errors.push(text);
	if (!config.quietTotal) {
		// The line break gives an empty line under the error
		write(font.red(' ❌ ' + text) + '\n\n', process.stderr);
	}
	throw new Panic(text);
};

export const error = function (msg, data = '') {
	const text = msg + (data ? ' ' + data : '');
	config.statusInfo?.errors.push(text);
	if (!config.quietTotal) {
		write(font.red(text) + '\n', process.stderr);
	}
	if (config.halt) {
		throw new Panic(text);
	}
	return false;
};
