#!/usr/bin/env bash

# Runs the CLI tests with Bun as runtime for each command of both rexreplace and rexreplace-bun

source "$( dirname "${BASH_SOURCE[0]}" )/common.sh"

PKG=npm/rexreplace-bun

# rexreplace-bun depends on rexreplace in the exact same version. To have the local build tested instead of the published one it is linked in as that dependency before installing.
unlink_local() {
	rm -f "./$PKG/node_modules/rexreplace"
	rmdir "./$PKG/node_modules" 2> /dev/null
}
trap 'unlink_local; teardown' EXIT

mkdir -p "./$PKG/node_modules"
ln -sfn ../../.. "./$PKG/node_modules/rexreplace"

install rexreplace .
install rexreplace-bun "./$PKG"

# `rr` and `rexreplace` from rexreplace ask for `node`, so let that be Bun (this is how `bunx --bun rexreplace` does it)
mkdir -p "./$TMP/node-is-bun"
ln -sfn "$(command -v bun)" "./$TMP/node-is-bun/node"

PATH="$ROOT/$TMP/node-is-bun:$PATH" cli_tests rexreplace rr bun &&
	PATH="$ROOT/$TMP/node-is-bun:$PATH" cli_tests rexreplace rexreplace bun &&
	cli_tests rexreplace rexreplace-bun bun &&
	cli_tests rexreplace-bun rr bun &&
	cli_tests rexreplace-bun rexreplace bun &&
	cli_tests rexreplace-bun rexreplace-bun bun
