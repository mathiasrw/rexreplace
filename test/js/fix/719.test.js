// https://github.com/mathiasrw/rexreplace/issues/719
// Data piped in together with files was not used, and nothing told about it.
import {describe, test, expect} from 'bun:test';
import {rr} from '../helper.js';

const warning = ' 🟡 Data is piped in, but no flag tells what to do with it. It is not used. \n\n';

// Run on my.file (with the content `foobar`) with `x` piped in
async function piped(flags = {}, replacement = '_') {
	await Bun.write('my.file', 'foobar');
	return rr('b', replacement, {includeGlob: ['my.file'], pipedData: 'x', ...flags});
}

describe('#719 a warning when piped data is not used', () => {
	test('is given when data is piped in and files are also given', async () => {
		expect(await piped()).toEqual({out: '', err: warning + 'my.file \n', exit: null});
		expect(await Bun.file('my.file').text()).toBe('foo_ar');
	});

	test.each(['quiet', 'quietTotal'])('is not shown with --%s', async (flag) => {
		expect((await piped({[flag]: true})).err).toBe('');
	});

	test('does not stop the run with --halt', async () => {
		expect(await piped({halt: true})).toEqual({
			out: '',
			err: warning + 'my.file \n',
			exit: null,
		});
		expect(await Bun.file('my.file').text()).toBe('foo_ar');
	});

	test('is not given when the piped data is used', async () => {
		expect((await piped({replacementPipe: true})).err).toBe('my.file \n');
		expect((await piped({replacementJs: true}, 'pipe')).err).toBe('my.file \n');
		expect(await Bun.file('my.file').text()).toBe('fooxar');
	});

	test.each([null, '', '\n'])('is not given when %j is piped in', async (pipedData) => {
		expect((await piped({pipedData})).err).toBe('my.file \n');
	});

	test('is not given when only data is piped in', async () => {
		expect(await rr('b', '_', {pipedData: 'foobar'})).toEqual({
			out: 'foo_ar',
			err: '',
			exit: null,
		});
	});
});
