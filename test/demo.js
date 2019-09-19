const {exec} = require('child_process');

exec('find . -type f | wc -l', (err, stdout, stderr) => {
	if (err) {
		console.error(`exec error: ${err}`);
		return;
	}

	console.log(`Number of files ${stdout}`);
});

// echo a | node -r ts-node/register --inspect src/cli.ts a b

/*





printf abn | node -r ts-node/register --inspect  ./src/cli.ts 'b' _ my.file -o --replacement-pipe -dV
printf abn | node -r ts-node/register  ./src/cli.ts 'b' _ my.file -o --replacement-pipe -dV






*/
