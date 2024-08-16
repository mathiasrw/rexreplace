#!/usr/bin/env node

/// <reference types="node" />

import {text} from 'node:stream/consumers';

import {cli2conf, executeReplacement} from '../cli.ts';
import fs from 'fs-extra';

export const runtime: Runtime = {
	fileReadSync: (path, encoding = 'utf8') => fs.readFileSync(path, {encoding}),
	fileReadAsync: (path, encoding = 'utf8') => fs.readFile(path, {encoding}),

	fileWriteSync: (path, data, encoding = 'utf8') => fs.writeFileSync(path, data, {encoding}),
	fileWriteAsync: (path, data, encoding = 'utf8') => fs.writeFile(path, data, {encoding}),

	fileDeleteSync: path => fs.unlinkSync(path),
	fileDeleteAsync: path => fs.unlink(path),
	fileCopySync: (originalPath, destinationPath) => {
		fs.copySync(originalPath, destinationPath);
	},
	fileCopyAsync: async (originalPath, destinationPath) => {
		return fs.copy(originalPath, destinationPath);
	},
	exit: process.exit,
	isFileSync: filepath => fs.statSync(filepath).isFile(),
	logInfo: console.log,
	logWarn: console.warn,
	logErr: console.error,
};

(async () => {
	let conf = cli2conf(runtime, process.argv.slice(2));

	if (Boolean(process.stdin.isTTY)) return executeReplacement(runtime, conf);

	process.stdin.setEncoding(conf.encoding);

	const pipeData = await text(process.stdin);

	return executeReplacement(runtime, conf, pipeData);
})();
