/*import Bun from 'bun';

let my = Bun.file('my.file');

Bun.write(my, 'meeega');
Bun.write(my, 'mee333ega');

console.log(await my.text());
*/
//await Bun.$`echo "Hello, world!" > ${my}`

//console.log(await Bun.$`cat ${my}`.text())

import { text } from 'node:stream/consumers';

if (!process.stdin.isTTY) {
	const input = await text(process.stdin);
	console.log(input);
} else {
	console.log("No input provided via stdin.");
}
