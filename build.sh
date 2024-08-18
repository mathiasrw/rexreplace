#!/bin/bash

# Exit on any error
set -e

# Reset bin/ dir
rm -fr bin/
mkdir bin/

printf "\n\n# Bun"
command -v bun &> /dev/null || (echo "Please install Bun"; exit 1; )
bun build src/env/bun.ts --target=bun --outfile bin/rexreplace-cli.bun.js
chmod +x bin/rexreplace-cli.bun.js

bun build src/env/bun.ts --target=bun --outfile bin/rexreplace-cli.bun.min.js --minify
chmod +x bin/rexreplace-cli.bun.min.js

printf "\n\n# Node"
command -v node &> /dev/null || ( echo "Please install Node"; exit 1; )
bun build src/env/node.ts --target=node --outfile bin/rexreplace-cli.node.js
chmod +x bin/rexreplace-cli.node.js

bun build src/env/node.ts --target=node --outfile bin/rexreplace-cli.node.min.js --minify
chmod +x bin/rexreplace-cli.node.min.js

printf "\n\n# Deno skipped\n"
#command -v deno &> /dev/null || (echo "Please install Deno"; exit 1; )

# Bundle
#deno bundle src/env/deno.ts bin/rexreplace-cli.deno.js
#chmod +x bin/rexreplace-cli.deno.js

# Minify
#deno run --allow-read --allow-write https://deno.land/x/terser@1.0.2/cli.ts bin/rexreplace-cli.deno.js -o bin/rexreplace-cli.deno.min.js
#chmod +x bin/rexreplace-cli.deno.min.js

printf "\n\n# Inserting version number\n"
bunx --bun rexreplace@7 PACKAGE_VERSION 'r("package.json").version' -j 'bin/*.js' 

echo ""
echo ""
echo "Build done. Files saved to ./bin/"
echo ""
echo ""