import {outputConfig, printError, printVerbose, printWarning} from './output.ts';

let config: any = null;

// The config of the run, for the status and for what is printed
export const statusConfig = function (_config) {
	config = _config;
	outputConfig(_config);
};

// Thrown when the run can not go on. The engine adds the status so far, and the CLI ends the process.
export class Panic extends Error {
	panic = true;
	status = null;
}

export const warn = function (msg) {
	config.statusInfo?.warnings.push(msg);
	printWarning(msg);
};

// The status report keeps the lines of --verbose in `engine.steps`, so they are there even when they are not printed
export const verbose = function (msg) {
	config.statusInfo?.engine?.steps.push(msg);
	printVerbose(msg);
};

// The run can not go on, so it stops here.
// The files in work are finished, and they can fail too. Only the first panic is told, the rest are only in the status.
export const panic = function (msg = '', data = '') {
	const text = msg + (data ? ' ' + data : '');
	config.statusInfo?.errors.push(text);
	if (!config.plzStop) {
		config.plzStop = true;
		printError(text, true);
	}
	throw new Panic(text);
};

// A check from --expect-* that is not met. It is an error, and is also in `checks`, so the exit code can tell it from the other errors.
const checkFailed = function (text) {
	config.statusInfo?.errors.push(text);
	config.statusInfo?.checks.push(text);
	printError(text, false);
};

// Something failed, and the run goes on. With --halt it is a panic.
export const error = function (msg, data = '') {
	const text = msg + (data ? ' ' + data : '');
	config.statusInfo?.errors.push(text);
	// After a panic only the status is told about the files that are finished
	if (!config.plzStop) {
		printError(text, config.halt);
	}
	if (config.halt) {
		config.plzStop = true;
		throw new Panic(text);
	}
	return false;
};

// The checks from --expect-* are done when the run is done. Piped data counts as one file.
export function checkExpectations(config) {
	const status = config.statusInfo;
	if (!status.checks) {
		return;
	}
	const piped = Boolean(config.dataIsPiped);
	const found = piped ? 1 : status.files.searched.length;
	const changed = piped ? Number(status.pipe.updated) : status.files.updated.length;
	// Nothing is written with --simulate, --output and --output-match
	const would = !piped && (config.simulate || config.output || config.outputMatch);
	const files = count => (piped ? 'the piped data' : count + (1 === count ? ' file' : ' files'));
	const change = count =>
		would ? 'would change' : 1 === count || piped ? 'was changed' : 'were changed';

	if (config.expectFiles && !found) {
		checkFailed('Expected files, but 0 files found');
	}
	if ((config.expectDiff || config.expectDiffAll) && !changed) {
		checkFailed('Expected a diff, but nothing ' + (would ? 'would change' : 'was changed'));
	} else if (config.expectDiffAll && changed < found) {
		const unchanged = found - changed;
		checkFailed(
			'Expected all files to change, but ' +
				files(unchanged) +
				(would ? ' would not change' : 1 === unchanged ? ' was not changed' : ' were not changed')
		);
	}
	if (config.expectZeroDiff && changed) {
		checkFailed('Expected no diff, but ' + files(changed) + ' ' + change(changed));
	}
}
