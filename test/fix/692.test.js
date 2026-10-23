// https://github.com/mathiasrw/rexreplace/issues/692
// A single argument containing -v or -h printed the version or help. The checks live in the CLI, so the CLI is run.
import {describe, test, expect} from 'bun:test';
import {$} from 'bun';
import {cli, sh} from '../helper.js';

describe('#692 a single argument', () => {
	test.each(['-v', '-version', '--version'])('%s prints only the version', async arg => {
		const result = await sh($`bun ${cli} ${arg}`);
		expect(result).toEqual({out: (await sh($`bun ${cli} --version`)).out, err: '', exit: 0});
		expect(result.out).toMatch(/^\S+\n$/);
	});

	test.each(['-h', '-help', '--help'])('%s prints the help to stdout', async arg => {
		const result = await sh($`bun ${cli} ${arg}`);
		expect(result.out).toContain('Options:');
		expect(result.err).toBe('');
		expect(result.exit).toBe(0);
	});

	// -V is verbose and -H is halt: other flags, not a request for the version or the help
	test.each(['my-vile', '-V', 'o-ho', '-H', 'a-v', 'a-h', 'xversion', 'xhelp'])(
		'%s is wrong use: the help goes to stderr, nothing to stdout, and the exit code is 3',
		async arg => {
			const result = await sh($`bun ${cli} ${arg}`);
			expect(result.out).toBe('');
			expect(result.err).toContain('Options:');
			expect(result.exit).toBe(3);
		}
	);
});
