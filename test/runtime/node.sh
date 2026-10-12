#!/usr/bin/env bash

# Runs the CLI tests with Node.js as runtime for each command of rexreplace

source "$( dirname "${BASH_SOURCE[0]}" )/common.sh"

install rexreplace "$ROOT"

cli_tests rexreplace rr node &&
	cli_tests rexreplace rexreplace node
