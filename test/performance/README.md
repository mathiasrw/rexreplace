# Performance tests

These tests measure how fast RexReplace is. They are not part of `yarn test`, because the times depend on the machine and on what else it is doing. Run them by hand, and compare numbers from the same machine only.

Each test has its own folder with a `run.sh`. It builds rr from the working tree into a temp folder, runs [hyperfine](https://github.com/sharkdp/hyperfine), and ends with two tables. The first gives each time relative to the fastest in its row, and the second the seconds for one run. Both use the median, as one slow run from other work on the machine moves the mean. The runs start from the repo root, a usual place to run rr.

`shared` has what the tests have in common, the build of rr (`build.sh`), the check that each tool gives the same file (`check.sh`) and the tables (`table.js`).

Before the timing of each size, every command runs once, and the test stops if one fails or gives another file than the others. A tool that does other work, or no work, would else be timed for it. The file to change is in the ignored `tmp` folder of the repo and is given by a path from the repo, as rr 3 to 7 can not write to an absolute path outside the working folder (#726). They say nothing and end with exit code 0 (#728), so without the check they look fast on big files.

## tools

Compares rr with the other tools that replace in files, from the list of related projects in the README. Each tool removes the HTML tags of the book 1984 by George Orwell (`1984.html`) in place, on files from 1 KB to 100 MB.

```bash
bash test/performance/tools/run.sh
bash test/performance/tools/run.sh 1KB 10MB
```

The tools are rr on Node, rr on Bun, `sed`, `gsed`, `perl`, `sd`, `replace-in-file`, `replace-x` and `replace`. The ones from npm are installed in the temp folder for the run. `gsed` and `sd` are left out when they are not installed (`brew install gnu-sed sd`).

`sed` and `perl` read a line at a time, so a tag that goes over two lines is not removed. rr and the other tools read the whole file, so their pattern stops at a line break. That way all the tools do the same work, and the files end up the same.

A small file shows the start of each tool, and a big file shows the regex engine and the reading and writing of the file.

## readme-speed

Runs the speed test of the README again, so its numbers can be checked. rr runs against `sed` on the same sizes as the table there, from 1 KB to 100 MB, with the last release of each major of rr from npm, and with rr from the working tree on Node and on Bun.

```bash
bash test/performance/readme-speed/run.sh
bash test/performance/readme-speed/run.sh 1KB 10MB
```

The files are made as the README says. Up to 500 KB they are cut from the book, and a larger file is the first 500 KB put together again and again. Each command runs 10 times, as in the README. The pattern stops at a line break for rr, as in the tools test.

The releases are installed in the temp folder for the run. rr 6 needs `re2`, and the version it asks for does not build on a new Node, so a later `re2` stands in for it.

## yargs-vs-argmate

Compares the start of the CLI with yargs against the CLI of the working tree with argmate, on Node and on Bun. Most of a short run is the start, so this is where the parser of the flags shows.

```bash
bash test/performance/yargs-vs-argmate/run.sh
bash test/performance/yargs-vs-argmate/run.sh main
```

The yargs side is built from the last commit where `src/cli.ts` used yargs, or from the git ref given as the first argument. Each side runs with no flags, with many flags and for the help. A run uses `-S`, so no file is changed.

yargs reads every folder above the working folder to find a `package.json`. So under a big folder yargs is slower. In the temp folder of macOS, with tens of thousands of entries, it adds some 45 ms to each run.
