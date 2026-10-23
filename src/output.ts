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

// A pipe the reader has closed, like `| head`, can not take more. That is fine: nobody reads the rest.
// Bun throws when it is written to, and Node gives an error event, so both are caught.
const closed = new Set();
const whenClosed = stream => e => {
	if ('EPIPE' !== e?.code) {
		throw e;
	}
	closed.add(stream);
};
process.stdout.on?.('error', whenClosed(process.stdout));
process.stderr.on?.('error', whenClosed(process.stderr));

export const writeTo = function (stream, text) {
	if (closed.has(stream)) {
		return;
	}
	try {
		stream.write(text);
	} catch (e) {
		whenClosed(stream)(e);
	}
};

// Everything is printed from here, so the last character of each stream is known
const write = function (text, stream) {
	writeTo(stream, text);
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
export const printName = function (name, stream = null) {
	if (config.quiet || config.quietTotal) {
		return;
	}
	// stdout is taken when the result is printed, so then the names go to stderr
	stream ??= config.output || config.outputMatch ? process.stderr : process.stdout;
	print(name, config.nameDelimiter, config.nameDelimiterTail, stream);
};

export const printWarning = function (msg) {
	if (!config.quiet && !config.quietTotal) {
		// The second line break gives an empty line under the warning
		write(' 🟡 ' + msg + '\n\n', process.stderr);
	}
};

// --verbose was asked for, so --quiet does not hide it. --quiet-total wins and hides it too.
export const printVerbose = function (msg) {
	if (config.verbose && !config.quietTotal) {
		write(msg + '\n', process.stderr);
	}
};

// A panic also says the run stops here
export const printError = function (text, stop) {
	if (!config.quietTotal) {
		// The line break gives an empty line under the error
		write(' ❌ ' + text + (stop ? '\n    No further processing.' : '') + '\n\n', process.stderr);
	}
};
