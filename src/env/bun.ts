#!/usr/bin/env bun

/// <reference types="bun-types" />

import {cli2conf, executeReplacement} from '../cli.js';

// @ts-ignore
import runtime from './bun.runtime.ts';

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
