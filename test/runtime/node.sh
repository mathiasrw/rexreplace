#!/usr/bin/env bash

# Runs the CLI tests with the `rexreplace` command, which uses Node

set -e

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

cleanup() {
	rm -rf ./tmp/runtime
	rmdir ./tmp 2> /dev/null || true
}
trap cleanup EXIT
cleanup

# Install in ./tmp/runtime, so the global install on the machine is not changed
npm install --location=global --prefix ./tmp/runtime/rexreplace .

export PATH="$PWD/tmp/runtime/rexreplace/bin:$PATH"

# The package has three commands: rr and rexreplace use Node, and rexreplace-bun uses Bun
rr --version | grep -qv '+bun$'
rexreplace --version | grep -qv '+bun$'
rexreplace-bun --version | grep -q '+bun$'

echo "CLI tests of rexreplace (Node)"
RR="rexreplace" bash test/cli/run.sh
RR="rexreplace" bash test/cli/run.ai.sh
