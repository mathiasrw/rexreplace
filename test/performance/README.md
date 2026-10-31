# Performance tests

These tests measure how fast RexReplace is. They are not part of `yarn test`, because the times depend on the machine and on what else it is doing. Run them by hand, and compare numbers from the same machine only.

Each test has its own folder with a `run.sh`. It builds rr from the working tree into a temp folder, runs [hyperfine](https://github.com/sharkdp/hyperfine) and prints the results. The runs start from the repo root, a usual place to run rr.

## tools

Compares rr with other tools that replace in files. Each tool removes the HTML tags of the book 1984 by George Orwell (`1984.html`) in place, on files of 1 KB, 10 KB, 100 KB, 1 MB, 10 MB and 100 MB.

```bash
bash test/performance/tools/run.sh
bash test/performance/tools/run.sh 1KB 10MB
```

The tools are rr on Node, rr on Bun, `sed`, `gsed`, `perl`, `sd` and `replace-in-file`. A tool that is not installed is left out.

`sed` and `perl` read a line at a time, so a tag that goes over two lines is not removed. rr and the other tools read the whole file, so their pattern stops at a line break. That way all the tools do the same work, and the files end up the same.

A small file shows the start of each tool, and a big file shows the regex engine and the reading and writing of the file.

## yargs-vs-argmate

Compares the start of the CLI with yargs against the CLI of the working tree with argmate, on Node and on Bun. Most of a short run is the start, so this is where the parser of the flags shows.

```bash
bash test/performance/yargs-vs-argmate/run.sh
bash test/performance/yargs-vs-argmate/run.sh main
```

The yargs side is built from the last commit where `src/cli.ts` used yargs, or from the git ref given as the first argument. Each side runs with no flags, with many flags and for the help. A run uses `-S`, so no file is changed.

yargs reads every folder above the working folder to find a `package.json`. So under a big folder yargs is slower. In the temp folder of macOS, with tens of thousands of entries, it adds some 45 ms to each run.
