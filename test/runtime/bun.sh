#!/usr/bin/env bash

# Runs the CLI tests with `bun run` on rexreplace and on rexreplace-bun

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
npm install --location=global --prefix ./tmp/runtime/rexreplace .
npm install --location=global --prefix ./tmp/runtime/rexreplace-bun ./npm/rexreplace-bun

# The commands of rexreplace
export PATH="$PWD/tmp/runtime/rexreplace/bin:$PATH"

echo "CLI tests of rr from rexreplace (it asks for Node, so Bun starts it with Node)"
bun run rr --version
RR="bun run rr" bash test/cli/run.sh
RR="bun run rr" bash test/cli/run.ai.sh

echo "CLI tests of rexreplace-bun from rexreplace"
bun run rexreplace-bun --version
RR="bun run rexreplace-bun" bash test/cli/run.sh
RR="bun run rexreplace-bun" bash test/cli/run.ai.sh

# The commands of rexreplace-bun
export PATH="$PWD/tmp/runtime/rexreplace-bun/bin:$PATH"

echo "CLI tests of rr from rexreplace-bun"
bun run rr --version
RR="bun run rr" bash test/cli/run.sh
RR="bun run rr" bash test/cli/run.ai.sh

echo "CLI tests of rexreplace-bun from rexreplace-bun"
bun run rexreplace-bun --version
RR="bun run rexreplace-bun" bash test/cli/run.sh
RR="bun run rexreplace-bun" bash test/cli/run.ai.sh

# rexreplace-bun must use Bun. The version then ends with +bun.
bun run rr --version | grep -q '+bun$'
