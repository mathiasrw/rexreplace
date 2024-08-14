#!/usr/bin/env deno

/// <reference types="deno" />

import yargs from 'https://deno.land/x/yargs/deno.ts';

import fs from 'fs-extra';

import {cli2conf, executeReplacement} from '../cli.ts';

export const runtime: Runtime = {
	fileReadSync: (path, encoding = 'utf8') => fs.readFileSync(path, {encoding}),

	async fileReadAsync(path, encoding = 'utf8') {
		const data = await fs.readFile(path, {encoding});
		return data;
	},

	fileWriteSync: (path, data, encoding = 'utf8') => fs.writeFileSync(path, data, {encoding}),

	async fileWriteAsync(path, data, encoding = 'utf8') {
		return fs.writeFile(path, data, {encoding});
	},

	fileDeleteSync: (path) => fs.unlinkSync(path),

	async fileDeleteAsync(path) {
		return fs.unlink(path);
	},

	fileCopySync: (originalPath, destinationPath) => fs.copyFileSync(originalPath, destinationPath),

	async fileCopyAsync(originalPath, destinationPath) {
		return fs.copyFile(originalPath, destinationPath);
	},

	exit: (c) => Deno.exit(c),
};

async function getPipeData() {
	const stdinContent = await Deno.readAll(Deno.stdin);
	const text = new TextDecoder().decode(stdinContent);
	return text;
}

let conf = cli2conf(Deno.args, {runtime, yargs});

executeReplacement(conf, {runtime, yargs, pipeData: getPipeData()});
