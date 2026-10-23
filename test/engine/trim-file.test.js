import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {rr} from '../helper.js';

describe('--trim-file', () => {
	test('trims the content of the replacement file, like the line break at the end', async () => {
		fs.writeFileSync('footer.html', '<footer>\n');
		const config = {pipedData: 'a {{footer}} b', replacementFile: true};
		expect((await rr('\\{\\{footer\\}\\}', 'footer.html', config)).out).toBe('a <footer>\n b');
		expect((await rr('\\{\\{footer\\}\\}', 'footer.html', {...config, trimFile: true})).out).toBe(
			'a <footer> b'
		);
	});

	test('does not trim the piped data', async () => {
		fs.writeFileSync('footer.html', '<footer>\n');
		const config = {pipedData: ' {{footer}} \n', replacementFile: true, trimFile: true};
		expect((await rr('\\{\\{footer\\}\\}', 'footer.html', config)).out).toBe(' <footer> \n');
	});
});
