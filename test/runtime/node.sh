#!/usr/bin/env bash

# Runs the CLI tests with Node.js as runtime.
# rexreplace gets installed the way a global install is done, but into a temporary folder, so what is installed on the machine is left alone. The folder is removed again when done.

ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
PREFIX="$(mktemp -d)"

teardown() {
	rm -rf "$PREFIX"
}
trap teardown EXIT

npm install --location=global --prefix "$PREFIX" "$ROOT" || exit 1
export PATH="$PREFIX/bin:$PATH"

# The version ends with +bun when Bun is the runtime
case "$(rexreplace --version)" in
	*+bun)
		echo "rexreplace is not running on Node.js"
		exit 1
		;;
esac

bash "$ROOT/test/cli/run.sh" && bash "$ROOT/test/cli/run.ai.sh"
