// https://github.com/mathiasrw/rexreplace/issues/814
// The numbers of #791 were made as code in front of the code of --js, which made each match slow to run.
// Now they are given to the code as values, and $i is counted when the code runs for a match, without a search of its own.
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

const content = name => fs.readFileSync(name, 'utf8');

describe('#814 the numbers of --js', () => {
	test('skip a file with no match for $i and $c', async () => {
		['a.txt', 'b.txt', 'c.txt'].forEach(name =>
			fs.writeFileSync(name, 'b.txt' === name ? 'x' : 'o')
		);
		await rr('o', '$i + "/" + $c', {includeGlob: ['*.txt'], replacementJs: true});
		expect(['a.txt', 'b.txt', 'c.txt'].map(content)).toEqual(['1/1', 'x', '2/2']);
	});
});
