#!/usr/bin/env node

if ('6' <= process.versions.node) {
	module.exports = require('./ES6/rexreplace.core.bundle.js');
} else if ('0.12' <= process.versions.node) {
	module.exports = require('./ES5/rexreplace.core.bundle.js');
} else {
	throw 'Only Node v0.12+ is supported';
}
