// Prints the results of hyperfine as two markdown tables, one row for each JSON file of `hyperfine --export-json`.
// The name of the file is the name of the row, and the names of the commands are the columns.
// The median, as one slow run from other work on the machine moves the mean.
//   node table.js <json>...
import {readFileSync} from 'node:fs';
import {basename} from 'node:path';

const rows = process.argv.slice(2).map(file => ({
	name: basename(file, '.json'),
	results: JSON.parse(readFileSync(file, 'utf8')).results,
}));
const columns = [...new Set(rows.flatMap(row => row.results.map(result => result.command)))];

function table(title, cell) {
	console.log(`\n${title}\n`);
	console.log(`| | ${columns.join(' | ')} |`);
	console.log(`|---|${columns.map(() => '---:').join('|')}|`);
	for (const {name, results} of rows) {
		const fastest = Math.min(...results.map(result => result.median));
		const cells = columns.map(column => {
			const result = results.find(result => result.command === column);
			return result ? cell(result.median, fastest) : '';
		});
		console.log(`| ${name} | ${cells.join(' | ')} |`);
	}
}

// The same number of decimals in each table, so the numbers line up and compare
table(
	'Time relative to the fastest in the row',
	(median, fastest) => (median / fastest).toFixed(2) + 'x'
);
table('Seconds for one run', median => median.toFixed(3));
