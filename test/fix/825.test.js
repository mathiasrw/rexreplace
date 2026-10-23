// https://github.com/mathiasrw/rexreplace/issues/825
// A named group was a variable like _year, which could clash: with groups a and a_, _a_ was both a_ and a with a space,
// and a group named _require_ broke r().
import {describe, test, expect} from 'bun:test';
import {rr} from '../helper.js';

describe('#825 named groups in --js', () => {
	test('have rr_ in front, so they can not clash with what RexReplace uses', async () => {
		// With _ in front, the group _require with a space was __require_, which r() uses itself.
		// $1 makes the code run once per match, where the variables of the groups are made.
		const config = {pipedData: 'ab', replacementJs: true};
		expect((await rr('(?<_require>a)', '$1 + r("path").sep', config)).out).toBe('a/b');
	});

	test('can not end with _, as that is the name of another group with a space', async () => {
		expect(await rr('(?<a>\\d)(?<a_>\\w)', 'rr_a', {pipedData: '1x', replacementJs: true})).toEqual(
			{
				out: '',
				err: ' ❌ A named group can not end with _\n    a_\n    No further processing.\n\n',
				exit: 3,
			}
		);
	});

	test('can end with _ with --output-match, as the code is not run', async () => {
		const config = {pipedData: 'ab', replacementJs: true, outputMatch: true};
		expect((await rr('(?<a_>a)', 'x', config)).exit).toBe(null);
	});

	test('can end with _ without --js, as there are no variables then', async () => {
		expect((await rr('(?<a_>o)', 'x', {pipedData: 'foo'})).out).toBe('fxx');
	});
});
