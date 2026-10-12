import {describe, test, expect} from 'bun:test';
import {version} from '../../src/engine.ts';

describe('--version', () => {
	test('the engine has a version that is filled in when building', () => {
		expect(version).toBe('PACKAGE_VERSION');
	});

	test.todo('printing the version is done by src/cli.ts and is tested in test/cli/run.sh');
});
