// Writes the table of options in the README from the config of the CLI, so the README and the help say the same.
// Run by `yarn prerelease`.
import fs from 'fs';
import path from 'path';
import {argInfo} from '../../argmate/src/argMate.ts';
import {argConfig} from '../src/options.ts';

const re = {
	// From the first row under the headline Usage to the next headline, as a row can break over lines
	optionsTable: /(\n## Usage\n[^]*?\n)\|[^]*?\n(?=\n## )/,
};

const file = path.join(import.meta.dir, '..', 'README.md');
const help = argInfo({config: argConfig, format: 'markdown', showIntro: false, showOutro: false});

// Only the table, as the README has its own headline for it
const table = help.slice(help.indexOf('|')).trim() + '\n';

const readme = fs.readFileSync(file, 'utf8');
if (!re.optionsTable.test(readme)) {
	throw new Error('No table of options under the headline Usage in README.md');
}

// A function, as the table has `$1` and `$&` that a replacement string would read
fs.writeFileSync(
	file,
	readme.replace(re.optionsTable, (all, before) => before + table)
);
