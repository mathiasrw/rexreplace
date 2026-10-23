# Dev guide

How we like the code in RexReplace to be.

## The code

- **Slim and simple over features.** If a feature makes the code complicated, we drop it instead of building it.
- **Beautiful code: strict, lean, focused.** Each function does one thing. No extra options or "just in case" code.
- **Read like the code around it.** Use the same names, idioms and amount of comments as the code next to it.
- **Comments say why, not what.** Write them in plain, simple English. Leave the comment out if the code already says it.
- **No sloppy shortcuts.** If two cases need different calls, write a plain `if`/`else` instead of one call that only half fits both.
- **Everything is printed with `write()` in `src/output.ts`,** so `--nl` knows how each stream ends.
- **The engine never touches the process.** It resolves with the status report of the run, or throws a panic when the run can not go on. Only `src/cli.ts` reads `argv` and stdin, sets the exit code and ends the process.
- **stdout is the result.** That is the names of the affected files, or the content from `--output`, `--output-match` or piped data. Everything else goes to stderr, so the result can always be piped.

## Telling what is going on

All output goes through `src/output.ts`. Pick the function by who the message is for:

| Function | Shown when | For | Example |
| --- | --- | --- | --- |
| `print(item, delimiter, tail, stream)` | Always | The result. Puts the delimiter after each item, or only between them without a tail. Without a delimiter it is a line break, unless the item already ends with one. | A name, the content of a file, a match |
| `printDone()` | At the end of a run, also when it is stopped | Ends stdout and stderr with a line break when `--nl` is set | |
| `info(name)` | Unless `--quiet` | The name of an affected file. stdout, or stderr when stdout has content. | `a.md` |
| `warn(msg)` | Unless `--quiet` | Something is likely a mistake, or there is nothing to do, but the run goes on. Starts with 🟡. Also added to `status.warnings`. | `0 files found` |
| `error(msg, data)` | Unless `--quiet-total` | Something went wrong. Starts with ❌. The run goes on, unless `--halt` is set: then a panic is thrown. Also added to `status.errors`, so the CLI gives the exit code 2. | `File not found: a.md` |
| `checkFailed(text)` | Unless `--quiet-total` | A check from `--expect-*` that is not met. An error, also in `status.checks`, so the CLI gives the exit code 1 when the failed checks are the only errors. | `Expected a diff, but nothing was changed` |
| `panic(msg, data, help)` | Unless `--quiet-total` | Something went wrong and the run can not go on. Starts with ❌, ends with `No further processing.`, and throws a panic, so the CLI exits with 3. Also added to `status.errors`. | `No data piped into replacement` |
| `chat(msg)` | `--verbose`, also with `--quiet`, but not with `--quiet-total` | The user: what happens to each file. Only ever to stderr. Also kept in `engine.steps` of the status report. | `Open sync: a.md`, `Nothing changed in: a.md` |

- What the run did is in the status report: the engine resolves with it, and `--status` prints it. So there is no extra debug output to print along the way.
- `--debug` prints the status report, with what went into the engine and what it did, and hides the rest, except the content of `--output` and the matches of `--output-match`.
- `warn()`, `error()`, `checkFailed()` and `panic()` add to the status report as they go, also when the quiet flags hide what they print.
- The exit code is 0 when the run is done, 1 when a check from `--expect-*` is not met, 2 when a file gave an error, and 3 for a panic or wrong flags. See Exit codes in the README.

## Layers

Each part of a run is a stack of layers: the pattern, the replacement and the files on the way in, and what is printed on the way out. They are told in "Hairy details" in the README. Use them as a guiding principle:

- To understand what happens in a run.
- To write tests: one for each layer, and for the ways they combine.
- To challenge a new flag: it should be a layer, or change one layer, and not need its own rules for how it works with the other flags.

## Tests

- **Tests are strict, lean and focused too.** One thing per test, and the name of the test says what it is.
- Expect the full result where it matters (`{out, err, exit}` from `rr()`), so nothing extra slips through. Use `rrStatus()` for the status of the same run.
- A known bug is a `test.todo('BUG #<issue>: ...')` until it is fixed. Then it becomes a real test.
- The folder tells what is tested, so a file is named after the feature: `test/engine/<feature>.test.js` tests the engine with `rr()`, and `test/cli/<feature>.test.js` tests the CLI by running it with Bun's `$` shell, like ``sh($`bun ${cli} o x my.file`)``.
- A test for an issue goes in `test/fix/<issue>.test.js`. It tests the issue with whatever it takes: the engine with `rr()`, the CLI with `sh()`, or both.
- `test/cli/run.sh` is a demo of how RexReplace is used: a few clear examples for each feature. Checks of many combinations go in `test/cli/<feature>.test.js`.
- Handle files in tests with the sync functions of `fs`, like `fs.writeFileSync` and `fs.readFileSync`, so there is no `await` for files. Each test writes the files it uses itself, so you can see them next to the command.
- Names in tests say what they hold, like `expectedOutput`, not `named`.
- Async work can finish in any order. Do not expect an order the code does not promise.

## Issues and pull requests

Write in plain, simple English, with sections like `## Today`, `## Change`, `## To decide`, `## Good to know` and `## Reference`.
