#!/usr/bin/env bun

/// <reference types="bun-types" />

import { cli2conf, executeReplacement } from '../cli.js';

import fs from 'fs-extra';

export const runtime: Runtime = {
	fileReadSync: (path, encoding = 'utf8') => fs.readFileSync(path, { encoding }),

	fileReadAsync: async (path, encoding = 'utf8') => {
		const file = Bun.file(path);
		return file.text();
	},

	fileWriteSync: async (path, data, encoding = 'utf8') => {
		await Bun.write(path, data);
	},
	fileWriteAsync: (path, data, encoding = 'utf8') => {
		return Bun.write(path, data);
	},

	fileDeleteSync: (path) => fs.unlinkSync(path),
	fileDeleteAsync: (path) => fs.unlink(path),

	fileCopySync: async (originalPath, destinationPath) => {
		const input = Bun.file(originalPath);
		const output = Bun.file(destinationPath);
		await Bun.write(output, input);
	},
	fileCopyAsync: (originalPath, destinationPath) => {
		const input = Bun.file(originalPath);
		const output = Bun.file(destinationPath);
		return Bun.write(output, input);
	},
	exit: process.exit,
};

(() => {
	let conf = cli2conf(runtime, process.argv.slice(2));

	if (Boolean(process.stdin.isTTY)) return executeReplacement(runtime, conf);

	process.stdin.setEncoding(conf.encoding);

	let pipeData = '';
	process.stdin.on('readable', () => {
		let chunk = process.stdin.read();

		if (null !== chunk) {
			pipeData += chunk;
			while ((chunk = process.stdin.read())) {
				pipeData += chunk;
			}
		}
	});

	process.stdin.on('end', () => {
		return executeReplacement(runtime, conf, pipeData);
	});
})();
