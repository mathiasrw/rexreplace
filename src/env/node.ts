#!/usr/bin/env node

/// <reference types="node" />

import {text} from 'node:stream/consumers';

import {cli2conf, executeReplacement} from '../cli.ts';
import fs from 'fs-extra';

import runtime from './node.runtime.ts';

(async () => {
	let conf = cli2conf(runtime, process.argv.slice(2));

	if (Boolean(process.stdin.isTTY)) return executeReplacement(runtime, conf);

	process.stdin.setEncoding(conf.encoding);

	const pipeData = await text(process.stdin);

	return executeReplacement(runtime, conf, pipeData);
})();
