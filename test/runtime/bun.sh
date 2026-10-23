#!/usr/bin/env bash

# Runs the CLI tests with the rexreplace-bun package, where all commands use Bun

set -e

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

cleanup() {
	rm -rf ./tmp/runtime
	rm -f ./npm/rexreplace-bun/node_modules/rexreplace
	rmdir ./npm/rexreplace-bun/node_modules ./tmp 2> /dev/null || true
}
trap cleanup EXIT
cleanup

# rexreplace-bun must use the local build of rexreplace, not the published one
mkdir -p ./npm/rexreplace-bun/node_modules
ln -sfn ../../.. ./npm/rexreplace-bun/node_modules/rexreplace

# Install in ./tmp/runtime, so the global install on the machine is not changed
npm install --location=global --prefix ./tmp/runtime/rexreplace-bun ./npm/rexreplace-bun

export PATH="$PWD/tmp/runtime/rexreplace-bun/bin:$PATH"

# All three commands of rexreplace-bun use Bun, so the version ends with +bun
rr --version | grep -q '+bun$'
rexreplace --version | grep -q '+bun$'
rexreplace-bun --version | grep -q '+bun$'

echo "CLI tests of rexreplace-bun (Bun)"
RR="rexreplace-bun" bash test/cli/run.sh
RR="rexreplace-bun" bash test/cli/run.ai.sh
