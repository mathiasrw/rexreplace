// https://github.com/mathiasrw/rexreplace/issues/789
// With --halt and the async flow, the engine threw the panic, but the workers went on taking new files.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import os from 'os';
import {rr} from '../helper.js';

const workers = Math.max(16, os.availableParallelism() * 2);

describe('#789 a panic with --halt', () => {
	test('stops the workers from starting new files', async () => {
		const names = Array.from({length: workers * 10}, (_, i) => `${String(i).padStart(4, '0')}.txt`);
		names.forEach(name => fs.writeFileSync(name, 'foo'));
		fs.chmodSync(names[0], 0);
		const result = await rr('foo', 'bar', {includeGlob: ['*.txt'], voidAsync: false, halt: true});
		expect(result.exit).toBe(3);
		// The files that were already in work when the panic came are finished before the engine stops, and no new file is started
		const changed = () =>
			names.slice(1).filter(name => 'bar' === fs.readFileSync(name, 'utf8')).length;
		const atStop = changed();
		expect(atStop).toBeLessThan(workers);
		await Bun.sleep(300);
		expect(changed()).toBe(atStop);
	});
});
