// --trim is --trim-pipe and --trim-file together
import {describe, test, expect} from 'bun:test';
import fs from 'fs';
import {$} from 'bun';
import {cli, sh} from '../helper.js';

describe('--trim', () => {
	test('trims the piped data and the content of the replacement file', async () => {
		fs.writeFileSync('footer.html', '<footer>\n');
		fs.writeFileSync('page.html', '{{footer}}\n');
		const command = $`echo ' footer.html ' | bun ${cli} '\{\{footer\}\}' _ page.html -R --replacement-file --trim -o`;
		expect((await sh(command)).out).toBe('<footer>\n');
	});
});
