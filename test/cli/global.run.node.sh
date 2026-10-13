#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

source $DIR/aserta.sh


cd "$(dirname "${BASH_SOURCE[0]}")/../.."

bun uninstall -g rexreplace rexreplace-bun
npm uninstall --location=global rexreplace rexreplace-bun

npm install --location=global .

assert_matches 		"rr --version"    "(dev|[0-9])$"
echo 'foobar' > my.file
rr o x my.file
assert		 		"cat my.file"    "fxxbar"


assert_matches		"rexreplace --version"    "(dev|[0-9])$"
echo 'foobar' > my.file
rexreplace o x my.file
assert		 		"cat my.file"    "fxxbar"


assert_matches		"rexreplace-bun --version"    "(dev|[0-9])\+bun$"
echo 'foobar' > my.file
rexreplace-bun o x my.file
assert		 		"cat my.file"    "fxxbar"


rm my.file


assert_end 			"rexreplace global cli"
