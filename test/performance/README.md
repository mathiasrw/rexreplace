# Performance tests

These tests measure how fast RexReplace is. They are not part of `yarn test`, because the times depend on the machine and on what else it is doing. Run them by hand, and compare numbers from the same machine only.

Each test has its own folder with a `run.sh`. It builds rr from the working tree into a temp folder, runs [hyperfine](https://github.com/sharkdp/hyperfine), and ends with two tables. The first gives each time relative to the fastest in its row, and the second the seconds for one run. Both use the median, as one slow run from other work on the machine moves the mean. The runs start from the repo root, a usual place to run rr.

`shared` has what the tests have in common, the build of rr (`build.sh`), the check that each tool gives the same file (`check.sh`) and the tables (`table.js`). The text to change is the book 1984 by George Orwell, in `tools/1984.html`.

Before the timing of each size, every command runs once, and the test stops if one fails or gives another file than the others. A tool that does other work, or no work, would else be timed for it. The file to change is in the ignored `tmp` folder of the repo and is given by a path from the repo, as rr is most often run on files under the working folder.

## engines

Compares the regex engines of rr, and what the flags u and v cost. rr from the working tree runs on Node and on Bun, on files from 1 KB to 100 MB.

```bash
bash test/performance/engines/run.sh
bash test/performance/engines/run.sh 1KB 10MB
```

The engines are `rr`, the default, `runtime`, the native engine of the runtime, and `regex+`, which uses the flag v. `rr` and `runtime` each run with the default flags, with the flag u (`-u`), and with the flag v. Each row is one runtime, so the 1.00x is the fastest engine on that runtime.

Each size runs with two patterns. One removes the HTML tags, so it matches often. The other looks for a tag that ends in `~>`, which is not in the book, so it never matches and the file stays the same. Both try at each `<` and read the tag, so they do the same work, apart from the replacing.

`results-nov-2026.md` was measured while the flag u was on by default, so its `rr` is with u and its `rr -U` is without.
