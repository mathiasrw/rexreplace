#!/usr/bin/env bash

# Installs rexreplace-bun globally, so the CLI tests get run with Bun as runtime.
# rexreplace-bun depends on rexreplace in the exact same version. To have the local build tested instead of the published one it is linked in as that dependency before installing.

ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
PKG="$ROOT/npm/rexreplace-bun"

mkdir -p "$PKG/node_modules"
ln -sfn ../../.. "$PKG/node_modules/rexreplace"

npm uninstall --location=global rexreplace rexreplace-bun
npm install --location=global "$PKG" || exit 1

# The version ends with +bun when Bun is the runtime
case "$(rexreplace --version)" in
	*+bun) ;;
	*)
		echo "rexreplace-bun is not running on Bun"
		exit 1
		;;
esac
