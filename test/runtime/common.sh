#!/usr/bin/env bash

# Shared by the scripts running the CLI tests with a specific runtime.
# Everything is placed in a temporary folder, so what is installed on the machine is left alone. The folder is removed again when done.

ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
TMP="$(mktemp -d)"

teardown() {
	rm -rf "$TMP"
}
trap teardown EXIT

# Installs a package the way a global install is done
# install <package> <folder of package>
install() {
	npm install --location=global --prefix "$TMP/$1" "$2" || exit 1
}

# Runs the CLI tests with one of the commands of an installed package.
# The tests call `rexreplace`, so that is what the command is made available as.
# cli_tests <package> <command> <expected runtime: node|bun>
cli_tests() {
	local as="$TMP/as/$1/$2"
	mkdir -p "$as"
	ln -sfn "$TMP/$1/bin/$2" "$as/rexreplace"

	echo
	echo "CLI tests of \`$2\` from $1 with $3 as runtime"

	(
		export PATH="$as:$PATH"

		# The version ends with +bun when Bun is the runtime
		case "$(rexreplace --version)" in
			'') echo "\`$2\` from $1 can not run" && exit 1 ;;
			*+bun) [ "$3" = bun ] || { echo "\`$2\` from $1 is running on Bun" && exit 1; } ;;
			*) [ "$3" = node ] || { echo "\`$2\` from $1 is not running on Bun" && exit 1; } ;;
		esac

		bash "$ROOT/test/cli/run.sh" && bash "$ROOT/test/cli/run.ai.sh"
	)
}
