// https://github.com/mathiasrw/rexreplace/issues/736
// stdin was read every time it was not a terminal, so a pipe that was open but never written to made the run wait forever.
// The flags that ask for the piped data are tested in test/cli/run.sh.
import {describe, test, expect} from 'bun:test';
import path from 'path';

const cli = path.resolve(import.meta.dir, '../../../src/cli.ts');

describe('#736 stdin is only read when the data is asked for', () => {
	test('files are changed without waiting for a pipe that is never closed', async () => {
		await Bun.write('my.file', 'foobar');
		const proc = Bun.spawn([process.execPath, cli, 'o', 'x', 'my.file'], {
			cwd: process.cwd(),
			stdin: 'pipe',
			stderr: 'pipe',
		});

		const exit = await Promise.race([proc.exited, Bun.sleep(2000).then(() => 'still waiting')]);
		proc.kill();

		expect(exit).toBe(0);
		expect(await Bun.file('my.file').text()).toBe('fxxbar');
	});
});
