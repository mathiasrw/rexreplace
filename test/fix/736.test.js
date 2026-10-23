// https://github.com/mathiasrw/rexreplace/issues/736
// stdin was read every time it was not a terminal, so a pipe that was open but never written to made the run wait forever.
// The flags that ask for the piped data are tested in test/cli/pipe.test.js.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {cli} from '../helper.js';

// Bun.spawn and not sh() from the helper: the test needs a pipe that stays open, and a pipe in a shell command ends

describe('#736 stdin is only read when the data is asked for', () => {
	test('files are changed without waiting for a pipe that is never closed', async () => {
		fs.writeFileSync('my.file', 'foobar');
		const proc = Bun.spawn([process.execPath, cli, 'o', 'x', 'my.file'], {
			cwd: process.cwd(),
			stdin: 'pipe',
			stderr: 'pipe',
		});

		const exit = await Promise.race([proc.exited, Bun.sleep(2000).then(() => 'still waiting')]);
		proc.kill();

		expect(exit).toBe(0);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('fxxbar');
	});
});
