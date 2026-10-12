// https://github.com/mathiasrw/rexreplace/issues/692
// A single argument containing -v or -h printed the version or help. The checks live in the CLI layer, so the CLI is started as a separate process.
import {describe, test, expect} from 'bun:test';
import {spawnSync} from 'child_process';
import path from 'path';

const cli = path.resolve(import.meta.dir, '../../../src/cli.ts');

function run(...args) {
	const {stdout, stderr, status} = spawnSync(process.execPath, [cli, ...args], {
		encoding: 'utf8',
	});
	return {out: stdout, err: stderr, exit: status};
}

describe('#692 single argument', () => {
	const version = run('--version').out;

	test.each(['-v', '-version', '--version'])('%s prints only the version', (arg) => {
		const result = run(arg);
		expect(result.out).toBe(version);
		expect(result.out.trim()).toMatch(/^\S+$/);
		expect(result.exit).toBe(0);
	});

	test.each(['-h', '-help', '--help'])('%s prints the help with exit code 0', (arg) => {
		const result = run(arg);
		expect(result.out).toContain('Options:');
		expect(result.err).toBe('');
		expect(result.exit).toBe(0);
	});

	// -V is verbose and -H is halt: other flags, not a request for version or help
	test.each(['my-vile', '-V', 'o-ho', '-H', 'a-v', 'a-h', 'xversion', 'xhelp'])(
		'%s is a usage error: help on stderr, nothing on stdout, exit code 1',
		(arg) => {
			const result = run(arg);
			expect(result.out).toBe('');
			expect(result.err).toContain('Options:');
			expect(result.exit).toBe(1);
		}
	);
});
