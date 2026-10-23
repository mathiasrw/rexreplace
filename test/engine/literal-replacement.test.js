import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('--literal-replacement', () => {
	test('uses the replacement as it is, with no meaning for $', async () => {
		const config = {pipedData: 'PRICE', literalReplacement: true};
		expect((await rr('(PRICE)', 'only $1.99', config)).out).toBe('only $1.99');
		expect((await rr('(PRICE)', "$& $$ $` $'", config)).out).toBe("$& $$ $` $'");
	});

	test('without it $1 is the group', async () => {
		expect((await rr('(PRICE)', 'only $1.99', {pipedData: 'PRICE'})).out).toBe('only PRICE.99');
	});

	test('works the same for a replacement from --replacement-pipe', async () => {
		fs.writeFileSync('my.file', 'PRICE');
		const config = {
			includeGlob: ['my.file'],
			pipedData: '$1.99',
			replacementPipe: true,
			literalReplacement: true,
		};
		await rr('(PRICE)', '_', config);
		expect(fs.readFileSync('my.file', 'utf8')).toBe('$1.99');
	});

	test('changes nothing for --js, as the value of the code is already used as it is', async () => {
		const config = {pipedData: 'foo', replacementJs: true};
		expect((await rr('(o)', '"[$1]" + $1', config)).out).toBe('f[$1]o[$1]o');
		expect((await rr('(o)', '"[$1]" + $1', {...config, literalReplacement: true})).out).toBe(
			'f[$1]o[$1]o'
		);
	});

	test('works with --rename', async () => {
		fs.writeFileSync('a.md', 'foo');
		const config = {includeGlob: ['a.md'], rename: true, literalReplacement: true};
		expect((await rr('^(a)', '$1-$$', config)).out).toBe('$1-$$.md\n');
	});
});
