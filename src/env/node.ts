#!/usr/bin/env node

/// <reference types="node" />

import {executeReplacement, cli2conf} from '../cli.js';
import fs from 'fs-extra';

export const runtime: Runtime = {
	fileReadSync: (path, encoding = 'utf8') => fs.readFileSync(path, {encoding}),
	fileReadAsync: (path, encoding = 'utf8') => fs.readFile(path, {encoding}),

	fileWriteSync: (path, data, encoding = 'utf8') => fs.writeFileSync(path, data, {encoding}),
	fileWriteAsync: (path, data, encoding = 'utf8') => fs.writeFile(path, data, {encoding}),

	fileDeleteSync: (path) => fs.unlinkSync(path),
	fileDeleteAsync: (path) => fs.unlink(path),
	fileCopySync: (originalPath, destinationPath) => {
		fs.copySync(originalPath, destinationPath);
	},
	fileCopyAsync: async (originalPath, destinationPath) => {
		return fs.copy(originalPath, destinationPath);
	},
	exit: process.exit,
};

(() => {
	let conf = cli2conf(runtime, process.argv.slice(2));

	if (Boolean(process.stdin.isTTY)) return executeReplacement(runtime, conf);

	process.stdin.setEncoding(conf.encoding);

	let pipeInUse = false;
	let pipeData = '';
	process.stdin.on('readable', () => {
		let chunk = process.stdin.read();

		if (null !== chunk) {
			pipeInUse = true;
			pipeData += chunk;
			while ((chunk = process.stdin.read())) {
				pipeData += chunk;
			}
		}
	});

	process.stdin.on('end', () => {
		rexreplace.engine(placePipeData(conf));
	});
})();
