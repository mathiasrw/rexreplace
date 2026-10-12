import {describe, test, expect} from 'bun:test';
import {version} from '../../src/engine.ts';
import pkg from '../../package.json';

describe('--version', () => {
	test('the engine has the version from package.json', () => {
		expect(version).toBe(pkg.version);
	});

	test.todo('printing the version is done by src/cli.ts and is tested in test/cli/run.sh');
});
