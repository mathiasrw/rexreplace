#!/usr/bin/env bash

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

echo "CLI tests of rr from rexreplace"
rr --version
RR="rr" bash test/cli/run.sh
RR="rr" bash test/cli/run.ai.sh
