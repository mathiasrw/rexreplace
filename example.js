import Bun from 'bun';

let my = Bun.file('my.file');

await Bun.write(my, 'meeega');
await Bun.write(my, 'mee333ega');

// console.log(await my.text());

console.log(await Bun.$`ls *.file.* | wc -l`.nothrow().text() | 0)

import { globSync } from 'glob';
const lefiles = globSync('/Users/mwulff/git/CL/marketing-cloud/process/**/*.*', {
	nodir: true, // Only match files
});
console.log(lefiles.length);


let file = Bun.Glob('/Users/mwulff/git/CL/marketing-cloud/process/**/*.*');

const files = file.scanSync({
	dot: true,
	absolute: true,
	followSymlinks: true,
	throwErrorOnBrokenSymlink: true,
	onlyFiles: true
});


const filesArray = [...files];
console.log(filesArray.length);




//*/
//await Bun.$`echo "Hello, world!" > ${my}`

//console.log(await Bun.$`cat ${my}`.text())

/*
import { text } from 'node:stream/consumers';

if (!process.stdin.isTTY) {
	const input = await text(process.stdin);
	console.log(input);
} else {
	console.log("No input provided via stdin.");
}
//*/