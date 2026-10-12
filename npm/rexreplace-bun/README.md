# rexreplace-bun

[RexReplace](https://www.npmjs.com/package/rexreplace) with [Bun](https://bun.sh) as the runtime instead of Node.js.

This package holds no code of its own. It depends on the exact same version of `rexreplace` and starts it with Bun, so everything in the [RexReplace documentation](https://github.com/mathiasrw/rexreplace#readme) applies.

### Installation

```bash
> bun install -g rexreplace-bun
```

It provides the same `rexreplace` and `rr` commands as `rexreplace`, so install one or the other globally - not both.

To run it without installing:

```bash
> bunx rexreplace-bun pattern replacement [fileGlob|option]+
```

### Good to know

- Bun must be installed.
- Regular expressions are run by the regex engine of Bun (JavaScriptCore) instead of the one in Node.js (V8). The two agree on everyday patterns, but can differ in edge cases.
- The version is always the same as the version of `rexreplace` it runs, and `rexreplace --version` adds `-bun` to it so you can see what runtime is in use.
- Starting up is a few milliseconds faster than with Node.js, and large files (tens of megabytes) are handled about twice as fast.
