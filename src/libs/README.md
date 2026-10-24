# Copied libraries

These are copies of other packages, bundled into RexReplace, so they are not runtime dependencies.
Keep them as they are upstream, so they are easy to compare. Biome leaves this folder alone.

| Folder | Package | Upstream |
| --- | --- | --- |
| `regex/` | [`regex`](https://www.npmjs.com/package/regex) 6.1.0, the `src/` folder | https://github.com/slevithan/regex |
| `regex-utilities/` | [`regex-utilities`](https://www.npmjs.com/package/regex-utilities) 2.3.0, `src/index.js` | https://github.com/slevithan/regex-utilities |

Both are MIT, and their `LICENSE` files are next to the code.

## Changes from upstream

Changes 2 and 3 are marked with a `// rexreplace patch:` comment.

1. `regex/*.js` import `regex-utilities` as `../regex-utilities/index.js`, as the build leaves bare imports out of the bundle.
2. `regex/internals.js` also exports `subroutines`. Asked for upstream.
3. `rewrite()` in `regex/regex.js` also gives `hiddenCaptures`, the numbers of the groups Regex+ added, so RexReplace can skip them without `RegExpSubclass`, which makes `.replace()` 3 to 5 times slower.

## Removal plan

When upstream exports `subroutines`:

1. Add `regex` as a dependency.
2. Import from `regex/internals` and `regex` in place of `./libs/regex/internals.js` and `./libs/regex/regex.js`.
3. If `rewrite()` does not give `hiddenCaptures` upstream, ask for it first, as change 3 is still needed.
4. Delete `src/libs/` and its line in `biome.json`. The tests must pass without changes.
