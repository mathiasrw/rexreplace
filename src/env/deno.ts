#!/usr/bin/env deno

import runtime from './deno.runtime.ts';

import {cli2conf, executeReplacement} from '../cli.ts';

let conf = cli2conf(runtime, Deno.args);

if (Deno.isatty(Deno.stdin.rid)) {
	executeReplacement(runtime, conf);
} else {
	const stdinContent = await Deno.readAll(Deno.stdin);
	const pipeData = new TextDecoder().decode(stdinContent);
	executeReplacement(runtime, conf, pipeData);
}
