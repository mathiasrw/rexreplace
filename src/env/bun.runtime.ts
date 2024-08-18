#!/usr/bin/env bun

/// <reference types="bun-types" />

import fs from 'graceful-fs';

// @ts-ignore
import Bun from 'bun';

let encoding_ = 'utf8';
let isUTF8 = true;

const runtime: Runtime = {
	fileReadSync: path => {
		return fs.readFileSync(path, {encoding_});
	},

	fileReadAsync: async path => {
		if (isUTF8) return Bun.file(path).text();

		const file = Bun.file(path);
		const buffer = await file.arrayBuffer();
		const uint8Array = new Uint8Array(buffer);
		const latin1Decoder = new TextDecoder(encoding_);
		return latin1Decoder.decode(uint8Array);
	},

	fileWriteSync: (path, data) => fs.writeFileSync(path, data, {encoding_}),

	fileWriteAsync: (path, data) => {
		if (isUTF8) return Bun.write(path, data);
		return fs.writeFile(path, data, {encoding_});
	},

	fileDeleteSync: path => fs.unlinkSync(path),

	fileDeleteAsync: path => fs.unlink(path),

	fileCopySync: (from, to) => fs.copyFileSync(from, to),

	fileCopyAsync: (from, to) => {
		return Bun.write(Bun.file(to), Bun.file(from));
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

async function globs(includeGlobs, excludeGlobs, caseSensitive = true) {
	const megaGlob = `{${[...includeGlobs, ...excludeGlobs.map(e => `!${e}`)].join(',')}}`;

	const glob = new Bun.Glob(megaGlob);

	const files = glob.scanSync({
		dot: true, // Match files that begin with a period (.)
		absolute: false, // Return absolute paths
		followSymlinks: false, // Follow symbolic links
		throwErrorOnBrokenSymlink: false, // Throw error if symlink is broken
		onlyFiles: true, // Return only files
	});

	return Array.from(files);
}
