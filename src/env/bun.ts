#!/usr/bin/env bun

/// <reference types="bun-types" />

import {cli2conf, executeReplacement} from '../cli.js';

import fs from 'fs-extra';

// @ts-ignore
import Bun from 'bun';

export const runtime: Runtime = {
	fileReadSync: (path, encoding = 'utf8') => fs.readFileSync(path, {encoding}),

	fileReadAsync: async (path, encoding = 'utf8') => {
		return Bun.file(path).text();
	},

	fileWriteSync: (path, data, encoding = 'utf8') => fs.writeFileSync(path, data, {encoding}),

	fileWriteAsync: (path, data, encoding = 'utf8') => {
		return Bun.write(path, data);
	},

	fileDeleteSync: path => fs.unlinkSync(path),

	fileDeleteAsync: path => fs.unlink(path),

	fileCopySync: (originalPath, destinationPath) => fs.copyFileSync(originalPath, destinationPath),

	fileCopyAsync: (originalPath, destinationPath) => {
		const input = Bun.file(originalPath);
		const output = Bun.file(destinationPath);
		return Bun.write(output, input);
	},
	exit: process.exit,

	isFileSync: filepath => fs.statSync(filepath).isFile(),
	logInfo: console.log,
	logWarn: console.warn,
	logErr: console.error,
};

(() => {
	let conf = cli2conf(runtime, process.argv.slice(2));

	if (Boolean(process.stdin.isTTY)) return executeReplacement(runtime, conf);

	process.stdin.setEncoding(conf.encoding);

	let pipeData = null;
	process.stdin.on('readable', () => {
		let chunk = process.stdin.read();

		if (null !== chunk) {
			pipeData = chunk;
			while ((chunk = process.stdin.read())) {
				pipeData += chunk;
			}
		}
	});

	process.stdin.on('end', () => {
		return executeReplacement(runtime, conf, pipeData);
	});
})();
