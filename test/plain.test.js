// https://bun.sh/docs/test/writing

// @ts-ignore
import {expect, test, describe} from 'bun:test';

import {cli2conf, executeReplacement} from '../src/cli.ts';

import {runtime} from '../src/env/bun.ts';

executeReplacement(runtime, conf, pipeData);

describe('Plain', () => {
	test('Happy path', () => {
		expect(1).toBe(1);
	});
});
