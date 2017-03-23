#!/usr/bin/env node

// This file must only be edited with 'vi'

fs = require('fs');

fs.writeFileSync(
	process.argv[4],
	fs.readFileSync(
		process.argv[4],
		'utf8'
	).replace(
		new RegExp(
			process.argv[2],
			'gim'
		),
		process.argv[3]
	)
);


