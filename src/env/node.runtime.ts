#!/usr/bin/env node

/// <reference types="node" />

import fs from 'graceful-fs';
import {globSync} from 'glob';

let encoding_ = 'utf8';
let isUTF8 = true;

const runtime: Runtime = {
	fileReadSync: path => fs.readFileSync(path, {encoding_}),
	fileReadAsync: path => fs.readFile(path, {encoding_}),

	fileWriteSync: (path, data) => fs.writeFileSync(path, data, {encoding_}),
	fileWriteAsync: (path, data) => fs.writeFile(path, data, {encoding_}),

	fileDeleteSync: path => fs.unlinkSync(path),
	fileDeleteAsync: path => fs.unlink(path),
	fileCopySync: (from, to) => {
		fs.copySync(from, to);
	},
	fileCopyAsync: (from, to) => {
		return fs.copy(from, to);
	},
	exit: process.exit,
	isFileSync: filepath => fs.statSync(filepath).isFile(),
	logInfo: console.log,
	logWarn: console.warn,
	logErr: console.error,

	setEncoding: (encoding: BufferEncoding = 'utf8') => {
		if (encoding) {
			encoding_ = encoding.toLowerCase();
			process.stdin.setDefaultEncoding(encoding);
			process.stdout.setDefaultEncoding(encoding);
			if ('utf8' !== encoding) isUTF8 = false;
		}
	},

	globFiles: (includeGlobs: string[], excludeGlobs?: string[], caseSensitive = false) => {
		return globSync(includeGlobs, {
			ignore: excludeGlobs,
			nocase: !caseSensitive,
			nodir: true, // Only match files
		});
	},
};

export default runtime;
