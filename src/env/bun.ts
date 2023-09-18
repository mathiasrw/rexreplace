#!/usr/bin/env bun

/// <reference types="bun-types" />

import * as yargs from 'yargs';

export const runtime: Runtime = {
	fileReadSync: async (path, encoding = 'utf8') => {
		const file = Bun.file(path);
		return await file.text();
	},
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

	fileDeleteSync: ioFn_node.fileDeleteSync,
	fileDeleteAsync: ioFn_node.fileDeleteAsync,

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
};

import {executeReplacement, cli2conf} from '../cli.js';
import {Runtime} from '../types.js';

executeReplacement(cli2conf(process.argv.slice(2)), {ioFn, yargs, pipeData});
