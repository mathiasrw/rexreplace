import {spawnSync} from 'child_process';

// @ts-ignore
import {beforeEach, afterAll} from 'bun:test';

// @ts-ignore
import {writeFileSync, readFileSync, rmSync} from 'fs';

// Helper function to read file contents
export function cat(filename) {
	return readFileSync(filename, 'utf-8').trim();
}

console.log({target: process.env.RR_TARGET, type: process.env.RR_TYPE});

let targetType = (process.env.RR_TARGET || '') + '_' + (process.env.RR_TYPE || '');

let exeStr = '';
switch (targetType) {
	case 'node_':
	case 'node_src':
		exeStr = 'node  src/env/node.ts';
		break;
	case 'node_bundle':
		exeStr = 'node  bin/rexreplace.cli.js';
		break;
	case 'node_bundle_min':
		exeStr = 'node  bin/rexreplace.node.min.js';
		break;
	case 'deno_':
	case 'deno_src':
		exeStr = 'deno run -A src/cli/deno.ts';
		break;
	case 'deno_bundle':
		exeStr = 'deno run -A bin/rexreplace.deno.js';
		break;
	case 'deno_bundle_min':
		exeStr = 'deno run -A bin/rexreplace.deno.min.js';
		break;
	case '_':
	case 'bun_':
	case 'bun_src':
		exeStr = 'bun run src/cli.ts';
		break;
	case 'bun_bundle':
		exeStr = 'bun run --bun bin/rexreplace.cli.js';
		break;
	case 'bun_bundle_min':
		exeStr = 'bun run --bun bin/rexreplace.bun.min.js';
		break;
	default:
		throw JSON.stringify({
			error: 'Invalid target + type',
			target: process.env.RR_TARGET,
			type: process.env.RR_TYPE,
		});
}

// exeStr = 'rexreplace';

console.log({exeStr});

export function run(cmd) {
	cmd = cmd.replace('rexreplace', exeStr);
	const result = spawnSync(cmd, {shell: true, encoding: 'utf-8'});
	if (result.status !== 0) {
		console.error(result.stderr.trim());
		console.warn('> ', cmd);
		throw 'Test halted';
		throw new Error(`Command failed with exit code ${result.status}: ${result.stderr}`);
	}
	return result.stdout.trim();
}

export const reset = () => {
	writeFileSync('my.file', 'foobar');
	writeFileSync('your.file', 'abc123');
};

export function cleanup() {
	['my.file', 'my_file', 'your.file'].forEach(file => rmSync(file, {force: true}));
}

export function testPrep() {
	beforeEach(() => {
		cleanup();
		reset();
	});

	afterAll(() => {
		cleanup();
	});
}
