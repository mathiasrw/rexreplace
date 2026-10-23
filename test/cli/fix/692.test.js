// https://github.com/mathiasrw/rexreplace/issues/692
// A single argument containing -v or -h printed the version or help. The checks live in the CLI layer, so the CLI is started as a separate process.
import {describe, test, expect} from 'bun:test';
import {cli} from '../../helper.js';

describe('#692 single argument', () => {
	test.each(['-v', '-version', '--version'])('%s prints only the version', async arg => {
		const result = await cli([arg]);
		expect(result.out).toBe((await cli(['--version'])).out);
		expect(result.out.trim()).toMatch(/^\S+$/);
		expect(result.exit).toBe(0);
	});

	test.each(['-h', '-help', '--help'])('%s prints the help with exit code 0', async arg => {
		const result = await cli([arg]);
		expect(result.out).toContain('Options:');
		expect(result.err).toBe('');
		expect(result.exit).toBe(0);
	});

	// -V is verbose and -H is halt: other flags, not a request for version or help
	test.each(['my-vile', '-V', 'o-ho', '-H', 'a-v', 'a-h', 'xversion', 'xhelp'])(
		'%s is a usage error: help on stderr, nothing on stdout, exit code 1',
		async arg => {
			const result = await cli([arg]);
			expect(result.out).toBe('');
			expect(result.err).toContain('Options:');
			expect(result.exit).toBe(1);
		}
	);
});
