#!/usr/bin/env bash

# Runs the CLI tests with Bun as runtime.
# rexreplace-bun gets installed the way a global install is done, but into a temporary folder, so what is installed on the machine is left alone. The folder is removed again when done.

ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
PKG="$ROOT/npm/rexreplace-bun"
PREFIX="$(mktemp -d)"

teardown() {
	rm -rf "$PREFIX"
	rm -f "$PKG/node_modules/rexreplace"
	rmdir "$PKG/node_modules" 2> /dev/null
}
trap teardown EXIT

# rexreplace-bun depends on rexreplace in the exact same version. To have the local build tested instead of the published one it is linked in as that dependency before installing.
mkdir -p "$PKG/node_modules"
ln -sfn ../../.. "$PKG/node_modules/rexreplace"

npm install --location=global --prefix "$PREFIX" "$PKG" || exit 1
export PATH="$PREFIX/bin:$PATH"

# The version ends with +bun when Bun is the runtime
case "$(rexreplace --version)" in
	*+bun) ;;
	*)
		echo "rexreplace-bun is not running on Bun"
		exit 1
		;;
esac

bash "$ROOT/test/cli/run.sh" && bash "$ROOT/test/cli/run.ai.sh"
