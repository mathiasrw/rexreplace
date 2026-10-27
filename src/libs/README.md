# Copied code

RexReplace uses [Regex+](https://github.com/slevithan/regex) by Steven Levithan, from the npm packages [`regex`](https://www.npmjs.com/package/regex) and [`regex-utilities`](https://www.npmjs.com/package/regex-utilities), which are dependencies.

RexReplace runs the subroutines of `regex` 6.1.0 itself, to know which groups they add, and they are not exported. So they are copied here, as they are upstream, until upstream exports them:

- `regex/subroutines.js` and `regex/utils-internals.js`, unchanged.
- `regex/utils.js`, only the three parts of it that `subroutines.js` uses.

The license of `regex` (MIT) is in `regex/LICENSE`. Biome leaves this folder alone, so it stays easy to compare with upstream.

When `regex` exports `subroutines`, import it from `regex/internals`, and delete this folder and its line in `biome.json`.
