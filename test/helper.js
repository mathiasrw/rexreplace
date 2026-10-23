// Preloaded by bunfig.toml before every test file.
import {spyOn, beforeEach, afterEach} from 'bun:test';
import {$} from 'bun';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {engine} from '../src/engine.ts';
import {alias} from '../src/alias.ts';

// Every test runs in its own empty directory
const root = process.cwd();
let dir;

beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rexreplace-'));
	process.chdir(dir);
});

afterEach(() => {
	process.chdir(root);
	fs.rmSync(dir, {recursive: true, force: true});
});

// Run the engine in this process (no CLI involved) with the defaults and the `€` and `§` aliases the CLI would give it.
// Gives what was sent to stdout (`out`) and stderr (`err`) plus the exit code the CLI would give (`exit`).
// Files are handled one at a time unless `voidAsync: false` is given, so the output comes in the same order on every run.
export async function rr(pattern, replacement, config = {}) {
	return (await run(pattern, replacement, config)).result;
}

// The same run as rr(), but gives the status the engine resolves with (or the status of a panic)
export async function rrStatus(pattern, replacement, config = {}) {
	return (await run(pattern, replacement, config)).status;
}

async function run(pattern, replacement, config) {
	const result = {out: '', err: '', exit: null};
	let status;

	const spies = [
		spyOn(process.stdout, 'write').mockImplementation(data => {
			result.out += data;
			return true;
		}),
		spyOn(console, 'error').mockImplementation((...data) => {
			result.err += data.join(' ') + '\n';
		}),
		spyOn(process.stderr, 'write').mockImplementation(data => {
			result.err += data;
			return true;
		}),
		// Only the CLI acts on the process
		spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('The engine must not end the process');
		}),
	];

	try {
		const options = {
			engine: 'default',
			encoding: 'utf8',
			pipedData: null,
			includeGlob: [],
			excludeGlob: [],
			excludeRe: [],
			voidAsync: true,
			pattern,
			replacement,
			...config,
		};
		alias(options);
		status = await engine(options);
		// Like the CLI, an error gives the exit code 1 when the run is done
		if (status.errors.length) {
			result.exit = 1;
		}
	} catch (e) {
		// Like the CLI, a panic stops the run with the exit code 1
		if (!e?.panic) {
			throw e;
		}
		status = e.status;
		result.exit = 1;
	} finally {
		spies.forEach(spy => spy.mockRestore());
	}

	return {result, status};
}

const cliPath = path.join(import.meta.dir, '../src/cli.ts');

// Run the CLI with Bun in a shell, like a user would. `input` is piped in, so stdin is never a terminal.
// Gives what was sent to stdout (`out`) and stderr (`err`), and the exit code (`exit`).
export async function cli(args, input = '') {
	const result = await $`${process.execPath} ${cliPath} ${args} < ${new Response(input)}`
		.nothrow()
		.quiet();
	return {out: result.stdout.toString(), err: result.stderr.toString(), exit: result.exitCode};
}

// What the content of the files gives by default: a line break after each item, unless it already ends with one
export function ended(...items) {
	return items.map(item => (item.endsWith('\n') ? item : item + '\n')).join('');
}

// Fuzz tests get new input on every run. Set RR_FUZZ_SEED to repeat a run.
const fuzzSeed = Number(process.env.RR_FUZZ_SEED) || Math.floor(Math.random() * 0xffffffff);
let fuzzSeedShown = false;

// Pseudo random input for fuzz tests. Give each test its own `id` so the tests do not get the same input.
export function random(id) {
	if (!fuzzSeedShown) {
		console.log(`Fuzz seed: ${fuzzSeed} (repeat this run with RR_FUZZ_SEED=${fuzzSeed})`);
		fuzzSeedShown = true;
	}

	let seed = fuzzSeed + id;

	const next = () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};

	const rnd = {
		int: max => Math.floor(next() * (max + 1)),
		pick: list => list[rnd.int(list.length - 1)],
		// String of min to max elements from alphabet (a string or an array of strings)
		text: (alphabet, min, max) =>
			Array.from({length: min + rnd.int(max - min)}, () => rnd.pick(Array.from(alphabet))).join(''),
	};

	return rnd;
}
