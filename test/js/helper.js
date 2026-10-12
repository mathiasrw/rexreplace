// Preloaded by bunfig.toml before every test file.
import {spyOn, beforeEach, afterEach} from 'bun:test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {engine} from '../../src/engine.ts';

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

// Run the engine in this process (no CLI involved) with the defaults the CLI would give it.
// Returns what was sent to stdout (`out`) and stderr (`err`) plus the exit code if the engine wanted to stop the process (`exit`).
// Files are handled synchronously unless `voidAsync: false` or `voidBackup: true` is given, so the work is done when this returns.
export function rr(pattern, replacement, config = {}) {
	const result = {out: '', err: '', exit: null};
	const halt = {};

	const spies = [
		spyOn(process.stdout, 'write').mockImplementation((data) => {
			result.out += data;
			return true;
		}),
		spyOn(console, 'error').mockImplementation((...data) => {
			result.err += data.join(' ') + '\n';
		}),
		spyOn(process, 'exit').mockImplementation((code) => {
			result.exit = code;
			throw halt;
		}),
	];

	try {
		engine({
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
		});
	} catch (e) {
		if (e !== halt) {
			throw e;
		}
	} finally {
		spies.forEach((spy) => spy.mockRestore());
	}

	return result;
}

// The engine uses these when it handles files asynchronously. Each one starts the next from its callback.
// Count the callbacks that have not returned yet, so until() knows when the engine has done its last step.
let pending = 0;

['readFile', 'rename', 'writeFile', 'unlink'].forEach((name) => {
	const original = fs[name];

	fs[name] = (...args) => {
		const callback = args.pop();
		pending++;

		return original(...args, (...result) => {
			try {
				callback(...result);
			} finally {
				pending--;
			}
		});
	};
});

// Wait for what the engine does asynchronously (--void-backup and when `voidAsync: false` is given).
// It waits for `done` to be true and for the engine to have no more work, so nothing is printed or removed after the test.
// Use `quiet: true` for those runs as the output comes after rr() has returned.
export async function until(done) {
	const isDone = () => {
		try {
			return done();
		} catch (e) {
			return false;
		}
	};

	while (!isDone() || pending) {
		await new Promise((resolve) => setTimeout(resolve, 1));
	}
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
		int: (max) => Math.floor(next() * (max + 1)),
		pick: (list) => list[rnd.int(list.length - 1)],
		// String of min to max elements from alphabet (a string or an array of strings)
		text: (alphabet, min, max) =>
			Array.from({length: min + rnd.int(max - min)}, () =>
				rnd.pick(Array.from(alphabet))
			).join(''),
	};

	return rnd;
}
