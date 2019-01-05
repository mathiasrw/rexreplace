<!--h3 align="center">
    <br>
<img width="350" src="https://cloud.githubusercontent.com/assets/1063454/24127465/ed1a59a2-0e28-11e7-9546-160d7eb1d8b9.png" alt="RexReplace mascot Benny on the RexReplace logo" />
    <br>
    <br>

</h3-->



[![Build Status](https://travis-ci.org/mathiasrw/rexreplace.svg?branch=master)](https://travis-ci.org/mathiasrw/rexreplace)
[![NPM downloads](http://img.shields.io/npm/dm/rexreplace.svg?style=flat&label=npm%20downloads)](https://npm-stat.com/charts.html?package=rexreplace) 
[![npm version](https://badge.fury.io/js/rexreplace.svg)](https://www.npmjs.com/package/rexreplace)
[![FOSSA Status](https://img.shields.io/badge/license-MIT-brightgreen.svg)](https://app.fossa.io/projects/git%2Bgithub.com%2Fmathiasrw%2Frexreplace?ref=badge_shield)
[![OPEN open source software](https://img.shields.io/badge/Open--OSS-%E2%9C%94-brightgreen.svg)](http://open-oss.com)
[![Greenkeeper badge](https://badges.greenkeeper.io/mathiasrw/rexreplace.svg)](https://greenkeeper.io/)

[![NPM downloads](https://img.shields.io/npm/dt/rexreplace.svg)](https://www.npmjs.com/package/rexreplace)

[![NPM version](https://img.shields.io/npm/v/rexreplace.svg)](https://www.npmjs.com/package/rexreplace)

[![License](https://img.shields.io/npm/l/rexreplace.svg?registry_uri=https%3A%2F%2Fregistry.npmjs.com&colorB=brightgreen)](https://www.npmjs.com/package/rexreplace)


# RexReplace

RexReplace is a versatile tool to search and replace text in files from the command line. Its inspired by how developers often need to do quick fixes or one-liners for build scripts.     

_No more brute-forcing the right combination of `find`, `cat`, `sed`, `tr`, and `awk` to replace a text pattern in the right files._

Key features:

- Easy and intuitive notation makes you trust what you are doing
- Replacement can be javascript code - giving you Turing complete flexibility
- Pinoint the exact files with [glob notation](https://www.tcl.tk/man/tcl8.5/tutorial/Tcl16a.html) (`docs/*.md` represents each markdown file in `docs/`)



## Install
To use RexReplace from your command line

```bash
> npm install -g rexreplace
```

To use RexReplace from an npm build script:

```bash
> npm install rexreplace --save-dev
```



## Examples

Let 'foobar' become 'xxxbar' in myfile.md 

```bash
> rexreplace 'Foo' 'xxx' myfile.md
```

Hard for your fingers to write on your keyboard? We got you covered with the `rr` alias for `rexreplace`

```bash
> rr Foo xxx myfile.md
```

It works with 

----

#### Catch the beginning 

Let all markdown files in the `docs/` dir get headlines moved one level deeper

```bash
> rexreplace '^#' '##' docs/*.md            
```
 
 ----

#### Using glob notation to pinpoint files

Fix a spell error in all javascript and typescript files in the folders `src/` and `test/` recursively. 

```bash
> rexreplace 'foubar' 'foobar' '{src,test}/**/*.{js,ts}'
```


----

#### Backreference to a matching group

Let 'foobar' become 'barfoo' in myfile.md  (using ) 

```bash
> rexreplace '(foo)(.*)' '$2$1' myfile.md
```


RexReplace normally treats `€` as an alias for `$` so the following will do the same as the previous example

```bash
> rexreplace '(foo)(.*)' '€2€1' myfile.md  
```

----

#### Dynamically generated content

Let the version number from package.json get into your distribution js files (use the string `VERSION` in your source files).
   
```bash
> rexreplace 'VERSION' 'require("./package.json").version' -j dist/*.js 
```

Require have been given the alias `r` and both are expanded to understand relative paths even without `./` prepended. As the file extension is not needed eighter you will get the same result writing: 

```bash
> rexreplace 'VERSION' 'r("package").version' -j dist/*.js 
```

----


#### Usefull examples !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

Add filename, creation time and file size as the first line in each file in `test-run`

```bash
> rexreplace '^' 'ctime_ + name_ + size\n' -j -M 'test-run/**'          
```


----


## Usage 
```bash
> rexreplace pattern replacement [fileGlob|option]+
```


Flag |  Effect
---- | ----
`-v` | **`--version`** Print rexreplace version (can be given as only argument)                                    [boolean]
`-V` | **`--verbose`** More chatty output                           [boolean]
`-I` | **`--void-ignore-case`** Void case insensitive search pattern.        [boolean]
`-G` | **`--void-global`** Void global search (stop looking after the first match). [boolean]
`-M` | **`--void-multiline`** Void multiline search pattern. Makes ^ and $ match start/end of whole content rather than each line. [boolean]
`-u` | **`--unicode`** Treat pattern as a sequence of unicode code points. [boolean]
`-e` | **`--encoding`** Encoding of files/piped data.        [default: "utf8"]
`-q` | **`--quiet`** Only display errors (no other info)          [boolean]
`-Q` | **`--quiet-total`** Never display errors or info                 [boolean]
`-H` | **`--halt`** Halt on first error         [boolean] [default: false]
`-d` | **`--debug`** Print debug info                             [boolean]
`-€` | **`--void-euro`** Void having `€` as alias for `$` in pattern and replacement parameters                       [boolean]
`-o` | **`--output`** Output the final result instead of saving to file. Will also output content even if no replacement has taken place.                                 [boolean]
`-A` | **`--void-async`** Handle files in a synchronous flow. Good to limit memory usage when handling large files.      [boolean]
`-B` | **`--void-backup`** Avoid temporary backing up file. Works async (independent of -A flag) and will speed up things but at one point data lives only in memory, and you will lose the content if the process is abrupted. [boolean]
`-b` | **`--keep-backup`** Keep a backup file of the original content.  [boolean]
`-m` | **`--output-match`** Output each match on a new line. Will not replace any content but you still need to provide a dummy value (like `_`) as replacement parameter. If the search pattern does not contain matching groups the full match will be outputted. If search pattern does contain matching groups only matching groups will be outputted (same line with no delimiter).     [boolean]
`-T` | **`--trim-pipe`** Trim piped data before processing. If piped data only consists of chars that can be trimmed (new line, space, tabs...) it will become an empty string. [boolean]
`-R` | **`--replacement-pipe`** Replacement will be piped in. You still need to provide a dummy value (like `_`) as replacement parameter.                                   [boolean]
`-j` | **`--replacement-js`** Treat replacement as javascript source code. The statement from the last expression will become the replacement string. Purposefully implemented the most insecure way possible to remove _any_ incentive to consider running code from an untrusted person - that be anyone that is not yourself. The full match will be available as a javascript variable named $0 while each captured group will be available as $1, $2, $3, ... and so on. At some point, the $ char _will_ give you a headache when used from the command line, so use €0, €1, €2, €3... instead. If the javascript source code references to the full match or a captured group the code will run once per match. Otherwise, it will run once per file. The code has access to the following variables: `require` with the alias `r` both expanded to understand relative path even if not starting with `./`, `fs` from node, `globs` from npm, `_cwd` current working dir, `_pipe` is the data piped into the command (null if no piped data), `_find` is the pattern searched for (the needle). `_text` is the full text being searched i.e. file content or piped data (the haystack). The following values are also available if working on a file (if data is being piped they are all set to an empty string): `_file` is the full path of the active file being searched (including full filename), `_path` is the full path without filename of the active file being searched, `_filename` is the full filename of the active file being searched, `_name` is the filename of the active file being searched with no extension, `_ext` is the extension of the filename including leading dot.                                 [boolean]
`-h` | **`--help`** Display help.                                [boolean]
## Good to know 

### Features 

- Patterns are described as javascript notation regex
- Pattern defaults to global multiline case-insensitive search
- Supports regex lookaheads in the pattern 
- Supports backreference to matching groups in the replacement 
- Data to be treated can be piped in 
- See the [release note](https://github.com/mathiasrw/rexreplace/releases) for a log of changes. Descriptions are given in latest patch version. 


### Limitations
- RexReplace reads each file fully into memory, so working on your 4Gb log files will probably not be ideal.
- For versions of Node prior to 6, please use version 2.2.x. For versions of Node prior to 0.12, please use [the legacy version of RexReplace called rreplace](https://www.npmjs.com/package/rreplace)

### Quirks
- Per default `€` is treated as an alias for `$` in the CLI input. The main reason is for you not to worry about how command line tools often have a special relationship with the `$` char. You can escape your way out of this old love story, but it often pops up in unexpected ways. Use the `-€` flag if you need to search or replace the actual euro char. 

- Options can only be set after the replacement parameter. "_But I like to put my options as the first thing, so I know what I am doing_" I agree, but we must sometimes sacrifice habits for consistency.



### Priorities
- Flexibility regarding text pattern matching 
- Easy to filter what files to be treated
- Helpful interface
- Tests (if you know how to do a test cover report on javascript code ran via the command line, please let me know)


### Not a priority
- Speed. Obviously, speed is important, but to what extent does a 0,29-second command really satisfy the user compared to a 294-millisecond command? See _test->speed_ for more info. 

```bash
> time cat README.md | sed 's/a/x/g'  > /dev/null
cat myfile  0,00s user 0,00s system 45% cpu 0,011 total
sed 's/a/x/g' > /dev/null  0,00s user 0,00s system 43% cpu 0,029 total
> time rr a x README.md -o > /dev/null 
rr x y myfile -o > /dev/null  0,21s user 0,04s system 86% cpu 0,294 total
```




## Test 

### Regression
All CLI end to end tests are defined in [test/cli/run.sh](https://github.com/mathiasrw/rexreplace/blob/master/test/cli/run.sh) and all unit test are described in [`test/*.js`](https://github.com/mathiasrw/rexreplace/tree/master/test). After `git clone`'ing the repo and `npm install`'ing you can invoke them with:

```bash
> npm test
```

### Speed

_**tl;dr**:_ 
_Files over 5 Mb are faster with `rr` than with `sed` - but - it does not matter as any file under 25 Mb has less than 0.7 seconds in difference._

The speed test is initiated by `npm run test-speed`. The test takes files in different sizes and compares the processing time for RexReplace (`rr`) and the Unix tool `sed`. The test uses the sources of a website displaying [the book _1984_ by George Orwell](http://1984.surge.sh). The task for the tests is to remove all HTML tags by search-and-replace, so only the final text is left. The source is 888Kb, so all files up to 500Kb are generated directly from the source, while larger files are created by combining the first 500Kb several times. Each test runs 10 times to even out any temporary workload fluctuations. 
Results from the latest speed test can always be seen in the [speed test log](https://github.com/mathiasrw/rexreplace/blob/master/test/speed/testlog.speed.md). 

<p align="center">
<img src="https://cloud.githubusercontent.com/assets/1063454/24081543/fc237d68-0d09-11e7-8c31-92a550589b53.png" alt="" />
</p>

The graph visualises speed as relative to fastest overall run (`sed` on a 1kb file). This chart also has [an interactive version in log scale](https://plot.ly/~mathiasrw/1.embed), so the details in the low end can be studied better. Interestingly files of 1Kb, 5Kb takes longer for `rr` than 10Kb files. 

Now, what is relevant to notice is how `sed` only takes 3.3 seconds longer for the 100Mb file - even if the difference looks drastic on the graph. 

```
Speed relative to fastest tool for each file size
---------------------------------------------------
Bytes    sed    rr    Time it took longer (seconds)
1          1    39    0,5    <= sed is 39x faster  
5          1    32    0,4     
10         1    27    0,4
100        1    19    0,3
500        1     7    0,3
1000       1     4    0,3
5000       1     1    0,0    <= same speed for 5Mb file
10000      2     1    0,3
25000      2     1    1,1
50000      3     1    3,1
100000     3     1    4,9    <= rr 3.1.0 is 3x faster
```

So even though the speed evolves very differently, there is only little practical use of the focus on speed for most use cases. Replacing in 10.000 small files? Use RexReplace and get yourself a cup of coffee - or spend half an hour getting `sed` to work as you want it to and enjoy the thrilling few seconds it takes to do its magic.

Please note that speeds might look very different when files get as large as the memory available. 

## Rumours

### Inspiration

_.oO(What should "sed" have looked like by now?)_


### Future ideas

- Add support to require hjson, jsonh, yaml, ini files directly
- Test-run with info outputted about what will happen (sets -t and does not change anything)
- Let search and replace be within the names of the files (ask for overwriting. -Y = no questions)
- Let search and replace be within the path of the files (ask for overwriting. -Y = no questions)
- Let pattern and globs be piped
- Let Pattern, replacement, and globs come from a file
- Let pattern and glob be javascript code returning a string as the result
- Flag for simple string search (all other chars than [\n\r\t])
- Auto string search / replace if no regex magic is used (and verify that speed is better)
- Make `echo 'a\"b' | rr '\"' '"'` work (needs `rr '\\"' '"'` = not intuitive)
- Error != warning
- Flag for String-literal (no regex, no special chars, no escape chars) to avoid backslashes or remembering which characters needs to be escaped
- Check if https://github.com/eugeneware/replacestream is good to rely on
- Check if regex engine from spider monkey can be wrapped in something that does not need node 
- Check if sd can be wrapped in a WASM module
- Set engine to RE2 https://www.npmjs.com/package/re2
- Set engine to run on streams with https://www.npmjs.com/package/replacestream
- Implement in go so that all platforms can be supported with no need for node (might be based on)
- Let https://github.com/dthree/vorpal deal with the interface? Or maybe https://www.npmjs.com/package/pretty-cli


## Related projects

Many projects are seeking to solve the same problem as RexReplace. I my oppinion they all lack the flexibility of the RexReplace CLI interface and diverse the replacement can be, but have other strong features. If our way does not suit you, we suggest you have a look at:

- [sd](https://github.com/chmln/sd) - Blazingly fast! 5.9x **faster** than RexReplace. Almost perfect. Using _"Good ol' unix philosophy to the rescue."_ for pinpointing files so not always easy. Get it via cargo for Rust.
- [replace-in-file](https://www.npmjs.com/package/replace-in-file) - same speed as RexReplace. Very good support to be used as a module for a node application. A bit cumbersome CLI notation for pinpointing files.  Get via npm. 
- [replace-x](https://www.npmjs.com/package/replace-x) - 3.8x slower than RexReplace. A bit cumbersome CLI notation for pinpointing files. Get it via npm.
- [replace](https://www.npmjs.com/package/replace) - 2.6x slower than RexReplace. Very chatty default output. A bit more cumbersome CLI notation for pinpointing files. Get it via npm.


----


<img src="https://cloud.githubusercontent.com/assets/1063454/24103435/5a0e3746-0dd3-11e7-9f0e-fd8664348fbe.png" align="right" alt="RexReplace mascot Benny on the RexReplace logBo" />

Please note that RexReplace is an **OPEN open source software** project. 
This means that individuals making significant and valuable contributions are given commit access to the project to contribute as they see fit. This project is more like an open wiki than a standard guarded open source project.

[![OPEN open source software](https://img.shields.io/badge/Open--OSS-%E2%9C%94-brightgreen.svg)](http://open-oss.com) 


_<small>Icon inspired by <a href="http://www.freepik.com">Freepik</a> from <a href="http://www.flaticon.com">www.flaticon.com</a></small>_


## License
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fmathiasrw%2Frexreplace.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fmathiasrw%2Frexreplace?ref=badge_large)
