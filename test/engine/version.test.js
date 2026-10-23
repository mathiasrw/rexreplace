import {describe, test, expect} from 'bun:test';
import {version} from '../../src/engine.ts';
import pkg from '../../package.json';
import pkgBun from '../../npm/rexreplace-bun/package.json';

describe('--version', () => {
	test('the engine has the version from package.json', () => {
		expect(version).toBe(pkg.version);
	});

	test('rexreplace-bun has the same version marked with +bun and depends on exactly that version', () => {
		expect(pkgBun.version).toBe(pkg.version + '+bun');
		expect(pkgBun.dependencies.rexreplace).toBe(pkg.version);
	});
});
