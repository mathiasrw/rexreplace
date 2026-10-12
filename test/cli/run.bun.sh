#!/usr/bin/env bash

# Runs the CLI tests with rexreplace-bun, so the built command gets tested with Bun as runtime.
# It is set up like a global install, but with the local build of rexreplace as the dependency instead of a published one.

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT="$( cd "$DIR/../.." && pwd )"

PREFIX="$(mktemp -d)"
trap 'rm -rf "$PREFIX"' EXIT

mkdir -p "$PREFIX/bin" "$PREFIX/node_modules"
cp -r "$ROOT/npm/rexreplace-bun" "$PREFIX/node_modules/rexreplace-bun"
ln -s "$ROOT" "$PREFIX/node_modules/rexreplace"
ln -s "$PREFIX/node_modules/rexreplace-bun/index.js" "$PREFIX/bin/rexreplace"

export PATH="$PREFIX/bin:$PATH"

# The version ends with +bun when Bun is the runtime
case "$(rexreplace --version)" in
	*+bun) ;;
	*)
		echo "rexreplace-bun is not running on Bun"
		exit 1
		;;
esac

bash "$DIR/run.sh"
