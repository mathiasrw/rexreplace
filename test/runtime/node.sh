#!/usr/bin/env bash

# Runs the CLI tests with Node.js as runtime for the commands of rexreplace asking for Node.js

source "$( dirname "${BASH_SOURCE[0]}" )/common.sh"

install rexreplace .

cli_tests rexreplace rr node &&
	cli_tests rexreplace rexreplace node
