# Copied code

RexReplace uses [Regex+](https://github.com/slevithan/regex) by Steven Levithan, from the npm packages [`regex`](https://www.npmjs.com/package/regex) and [`regex-utilities`](https://www.npmjs.com/package/regex-utilities). Both are dependencies, and the build bundles them, as they are ES modules only.

One part of `regex` 6.1.0 is not exported: the subroutines. So it is copied here, as it is upstream, until upstream exports it:

- `regex/subroutines.js` and `regex/utils-internals.js`, unchanged.
- `regex/utils.js`, only the three parts of it that `subroutines.js` uses.

The license of `regex` (MIT) is in `regex/LICENSE`. Biome leaves this folder alone, so it stays easy to compare with upstream.

When `regex` exports `subroutines`, import it from `regex/internals`, and delete this folder and its line in `biome.json`.
