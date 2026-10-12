# rexreplace-bun

[RexReplace](https://www.npmjs.com/package/rexreplace) with [Bun](https://bun.sh) as the runtime.

This package has no code of its own. It starts the same version of `rexreplace` with Bun. Read the [RexReplace documentation](https://github.com/mathiasrw/rexreplace#readme) to learn how to use it.

### Installation

```bash
> bun install -g rexreplace-bun
```

The commands are `rexreplace`, `rr` and `rexreplace-bun`. Do not install `rexreplace` and `rexreplace-bun` globally at the same time.

To use it without an installation:

```bash
> bunx rexreplace-bun pattern replacement [fileGlob|option]+
```

### Good to know

- You must have Bun.
- The version is the version of `rexreplace` with `+bun` added (`7.1.14+bun`).
- The regex engine is JavaScriptCore (Node has V8). The result can be different for unusual patterns.
- Bun starts a few milliseconds faster than Node. Large files (tens of megabytes) take half the time.
