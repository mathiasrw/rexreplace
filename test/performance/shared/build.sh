# Builds the CLI of a source tree for Node and for Bun, as node.mjs and bun.mjs in a folder.
# The packages are external, so the folder gets a node_modules from the repo.
# .mjs as the folder has no package.json that says the files are ES modules.
#   build_rr <source tree> <folder>
build_rr() {
	mkdir -p "$2"
	ln -sfn "$ROOT/node_modules" "$2/node_modules"
	(cd "$1" && bun build src/cli.node.ts --target=node --format=esm --packages=external --outfile="$2/node.mjs" > /dev/null)
	(cd "$1" && bun build src/cli.bun.ts --target=bun --format=esm --packages=external --outfile="$2/bun.mjs" > /dev/null)
}
