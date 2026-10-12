// Gives rexreplace-bun the same version as rexreplace and makes it depend on exactly that version.
// Run by `yarn version` (and so by `yarn release`) right after the version of rexreplace has been bumped.
const fs = require('fs');
const path = require('path');
const {version} = require('../package.json');

const file = path.join(__dirname, 'rexreplace-bun', 'package.json');
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));

pkg.version = version;
pkg.dependencies.rexreplace = version;

fs.writeFileSync(file, JSON.stringify(pkg, null, '\t') + '\n');
