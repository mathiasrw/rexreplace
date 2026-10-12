#!/usr/bin/env bash

# Run this after a release. It installs the newly published rexreplace-bun globally with Bun, and that installs the published rexreplace it depends on.
# It removes the global rexreplace. Run global.run.node.sh to get that back.

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

source $DIR/aserta.sh


cd "$(dirname "${BASH_SOURCE[0]}")/../.."

VERSION="$(node -p "require('./package.json').version")"

bun uninstall -g rexreplace rexreplace-bun
npm uninstall --location=global rexreplace rexreplace-bun

bun install -g rexreplace-bun@$VERSION

assert		 		"rr --version"    "$VERSION+bun"
echo 'foobar' > my.file
rr o x my.file
assert		 		"cat my.file"    "fxxbar"


assert		 		"rexreplace --version"    "$VERSION+bun"
echo 'foobar' > my.file
rexreplace o x my.file
assert		 		"cat my.file"    "fxxbar"


assert		 		"rexreplace-bun --version"    "$VERSION+bun"
echo 'foobar' > my.file
rexreplace-bun o x my.file
assert		 		"cat my.file"    "fxxbar"


rm my.file

bun uninstall -g rexreplace-bun


assert_end 			"rexreplace-bun global cli"
