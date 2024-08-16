#!/bin/bash

rm -fr bin/
mkdir bin/

# Bun
bun build src/env/bun.ts --target=bun --outfile bin/rexreplace-cli.bun.js
chmod +x bin/rexreplace-cli.bun.js

bun build src/env/bun.ts --target=bun --outfile bin/rexreplace-cli.bun.min.js --minify
chmod +x bin/rexreplace-cli.bun.min.js

# Node
bun build src/env/node.ts --target=node --outfile bin/rexreplace-cli.node.js
chmod +x bin/rexreplace-cli.node.js

bun build src/env/node.ts --target=node --outfile bin/rexreplace-cli.node.min.js --minify
chmod +x bin/rexreplace-cli.node.min.js

# Deno
#bunx esbuild ./src/env/deno.ts --bundle --platform=neutral --format=iife --outfile=./bin/rexreplace-cli.deno.js
#chmod +x ./bin/rexreplace-cli.deno.js

#bunx esbuild ./src/env/deno.ts --bundle --platform=neutral --format=iife --outfile=./bin/rexreplace-cli.min.deno.js --minify
#chmod +x ./bin/rexreplace-cli.min.deno.js

echo "Building to bin/ complete..."
