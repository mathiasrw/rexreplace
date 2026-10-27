# Copied code

RexReplace uses [Regex+](https://github.com/slevithan/regex) by Steven Levithan, from the npm packages [`regex`](https://www.npmjs.com/package/regex) and [`regex-utilities`](https://www.npmjs.com/package/regex-utilities). `regex` is a dependency, loaded when RexReplace runs. `regex-utilities` is an ES module only, so the build bundles it.

RexReplace runs the atomic groups, the possessive quantifiers and the subroutines of `regex` 6.1.0 itself, to know which groups they add. The first two are only in `regex/internals`, an ES module only, which the CommonJS build of RexReplace can not load, and the subroutines are not exported at all. So they are copied here, as they are upstream:

- `regex/atomic.js`, `regex/subroutines.js` and `regex/utils-internals.js`, unchanged.
- `regex/utils.js`, only the three parts of it that `subroutines.js` uses.

The license of `regex` (MIT) is in `regex/LICENSE`. Biome leaves this folder alone, so it stays easy to compare with upstream.

When `regex` exports these from a build that `require()` can load, import them from there, and delete this folder and its line in `biome.json`.
