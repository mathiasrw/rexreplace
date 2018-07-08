#!/usr/bin/env node



if ('6' <= process.versions.node) {
	require('./ES6/rexreplace.cli.bundle.js');
} else if ('0.12' <= process.versions.node) {
	require('./ES5/rexreplace.cli.bundle.js');
} else {
	console.error(
		'Your Node is old so this will run on a legacy version of RexReplace only supporting one single file per replacement and no options allowed. See https://www.npmjs.com/package/rreplace for more info.'
	);
	require('../legacy/rreplace.js');
}
