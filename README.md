
<!--h3 align="center">
    <br>
<img width="350" src="https://cloud.githubusercontent.com/assets/1063454/24127465/ed1a59a2-0e28-11e7-9546-160d7eb1d8b9.png" alt="RexReplace mascot Benny on the RexReplace logo" />
    <br>
    <br>

</h3-->



[![Build Status](https://travis-ci.org/mathiasrw/rexreplace.svg?branch=master)](https://travis-ci.org/mathiasrw/rexreplace)
[![npm version](https://badge.fury.io/js/rexreplace.svg)](https://www.npmjs.com/package/rexreplace)
[![OPEN open source software](https://img.shields.io/badge/Open--OSS-%E2%9C%94-brightgreen.svg)](https://open-oss.com)
[![ghit.me](https://ghit.me/badge.svg?repo=mathiasrw/rexreplace)](https://ghit.me/repo/mathiasrw/rexreplace)
[![bitHound Overall Score](https://www.bithound.io/github/mathiasrw/rexreplace/badges/score.svg)](https://www.bithound.io/github/mathiasrw/rexreplace)
[![NPM downloads](http://img.shields.io/npm/dm/rexreplace.svg?style=flat&label=npm%20downloads)](https://npm-stat.com/charts.html?package=rexreplace)





# RexReplace




RexReplace is a versatile tool for doing search-and-replaces in files from the command line - inspired by how developers often need to do quick fixes or one-liners for build scripts.     

Key features:

- Replacement can be dynamically generated by javascript code. 
- Files are given as [glob notation](https://www.tcl.tk/man/tcl8.5/tutorial/Tcl16a.html) so `docs/*.md` represents each markdown file in your `docs/` dir.
- No more brute forcing the right combination of `find`, `cat`, `sed`, `tr`, and `awk` to replace a text pattern in a bunch of files.

## Install
To use RexReplace from your command line

```bash
> npm install -g rexreplace
```

To use RexReplace from a npm build script

```bash
> npm install rexreplace --save-dev
```



## Examples

Let 'foobar' in myfile.md become 'xxxbar'

```bash
> rexreplace 'Foo' 'xxx' myfile.md
```

Short version of same command

```bash
> rr Foo xxx myfile.md
```


----

Let all markdown files in the `docs/` dir get headlines moved one level deeper

```bash
> rexreplace '^#' '##' docs/*.md			
```
 
----
Let the version number from package.json get into your distribution js files (use the string `VERSION_NUMER` in your source files).
   
```bash
> rexreplace 'VERSION_NUMBER' 'require('package.json').version' -J dist/*.js 
```



----

Let 'foobar' in myfile.md become 'barfoo' (backreferences to matching group) 

```bash
> rexreplace '(foo)(.*)' '$2$1' myfile.md
```


RexReplace normally treat `€` as an alias for `$` so the following will do the exact same

```bash
> rexreplace '(foo)(.*)' '€2€1' myfile.md  
```
  
----



 
## Usage 
```bash
> rexreplace pattern replacement [fileGlob|option]+
```

Hard for your fingers to write on your keyboard? We got you covered with the `rr` alias for `rexreplace`. 





 


### Options


####   -v, --version   
Print rexreplace version (can be given as only argument) [boolean]


####  -I, --void-ignore-case  
Void case insensitive search pattern.        [boolean]


####  -G, --void-global 
Void global search (work only with first match).
 
####  -M, --void-multiline   
 Void multiline search pattern. Makes ^ and $ match start/end of whole content rather than each line.
                                                                       [boolean]

####  -u, --unicode          
 Treat pattern as a sequence of unicode code points.
                                                                       [boolean]

####  -e, --encoding          
Encoding of files.                   [default: "utf8"]

#### -o, --output
Output the result instead of saving to file. Will also
                          output content even if no replacement have taken
                          place.                                       [boolean]

#### -q, --quiet   
Only display erros (no other info)           [boolean]

#### -Q, --quiet-total  
Never display erros or info                  [boolean]

#### -H, --halt   
Halt on first error         [boolean] [default: false]

#### -d, --debug   
Print debug info                             [boolean]

#### -€, --void-euro  
Void having '€' as alias for '$' in pattern and
                          replacement                                  [boolean]

####  -j, --replacement-js-dynamic  
Replacement is javascript source code. Will run
                                once for each match. Last statement will become
                                replacement for this match. The full
                                match will be avaiable as a javascript
                                _variable_ named $0 while each captured group
                                will be avaiable as $1, $2, $3, ... and so on.
                                At some point the $ char _will_ give you a
                                headache when used in commandlines, so use €0,
                                €1, €2, €3 ... instead. Purposefully implemented
                                the most insecure way possible to remove _any_
                                incentive to consider running code from an
                                untrusted person - that be anyone that is not
                                yourself.                              [boolean]


####  -J, --replacement-js   
       
Same as -j flag but Will run
                                _once_ and the output from last statement will
                                become replacement for all matches.
                                        [boolean]

####  -T, --trim-pipe               
Trim piped data before processing. If piped
                                data only consists of chars that can be trimmed
                                (new line, space, tabs...) it will be
                                considered an empty string .           [boolean]





#### -h, --help    
Display manual. (can be given as only argument)
                                                                       [boolean]                                                               


## Good to know 

### Features 

- Patterns are described as javascript notation regex
- Pattern defaults to global multiline case-insensitive search
- Supports regex lookaheads in pattern 
- Supports backreference to matching groups in the replacement 


### Limitations
- RexReplace reads each file fully into memory, so working on your 4Gb log files will probably not be ideal.
- For versions of Node prior to 6, please use version 2.2.x. For versions of Node prior to 0.12, please use [the legacy version of RexReplace called rreplace](https://www.npmjs.com/package/rreplace)

### Quirks
- Per default `€` is treated as an alias for `$` in the CLI input. The main reason is for you not to worry about how command line tools often have a special relationship with the `$` char. Your can escape your way out of this old love story, but it often pops up in unexpected ways. Use the `-€` flag if you need to search or replace the actual euro char. 

- Options can only be set after the replacement parameter. "_But I like to put my options as the first thing, so I know what I am doing_" I agree, but we must sometimes sacrifice habits for consistency.



### Priorities
- Flexibility regarding text pattern matching 
- Easy to filter what files to be treated
- Helpful interface
- Tests (if you know how to do a test cover report on javascript code  ran via the command line, please open an issue to let me know)


### Not a priority
- Speed. Obviously, speed is important, but to what extent does a 21-millisecond command really satisfy the user compared to a 294-millisecond command? See _test->speed_ for more info. 

```bash
> time cat README.md | sed 's/x/y/g'  > /dev/null
cat myfile  0,00s user 0,00s system 45% cpu 0,011 total
sed 's/x/y/g' > /dev/null  0,00s user 0,00s system 43% cpu 0,010 total
> time rr x y README.md -o > /dev/null 
rr x y myfile -o > /dev/null  0,21s user 0,04s system 86% cpu 0,294 total
```




## Test 

### Regression
All CLI end to end tests are defined in [test.sh](https://github.com/mathiasrw/rexreplace/blob/master/test/cli/run.sh) and all unit test are described in [`test/*.js`](https://github.com/mathiasrw/rexreplace/tree/master/test). After `git clone`'ing the repo and `npm install`'ing you can invoke them with:

```bash
> npm test
```

### Speed

_**tl;dr**:_ 
_Files over 5 Mb are faster with `rr` than with `sed` - but - it does not matter as any file under 25 Mb has less than 0.7 seconds in difference._

The speed test is initiated by `npm run test-speed`. The test takes files in different sizes and compares the processing time for RexReplace (`rr`) and the Unix tool `sed`. The test uses the sources of a website displaying [the book _1984_ by George Orwell](http://1984.surge.sh). The task for the tests is to remove all HTML tags by search-and-replace so only the final text is left. The source is 888Kb, so all files up to 500Kb are generated directly from the source, while larger files are created by combining the first 500Kb several times. Each test runs 10 times to even out any temporary workload fluctuations. 
Results from latest test run can always be seen in the [speed test log](https://github.com/mathiasrw/rexreplace/blob/master/test/speed/testlog.speed.md). 

<p align="center">
<img src="https://cloud.githubusercontent.com/assets/1063454/24081543/fc237d68-0d09-11e7-8c31-92a550589b53.png" alt="" />
</p>

The graph visualises speed as relative to fastest overall run (`sed` on a 1kb file). This chart also has [an interactive version in log scale](https://plot.ly/~mathiasrw/1.embed), so the details in the low end can be studied better. Interestingly files of 1Kb, 5Kb takes longer for `rr` than 10Kb files. 

Now, what is relevant to notice is how `sed` only takes 3.3 seconds longer for the 100Mb file - even if the difference looks drastic on the graph. 

```
Speed relative to fastest tool for each file size
---------------------------------------------------
Bytes    sed    rr    Time it took longer (seconds)
1          1    60    0,3    <= sed is 60x faster  
5          1    44    0,3
10         1    35    0,2
100        1    24    0,2
500        1     8    0,2
1000       1     5    0,2
5000       1     1    0,0    <= same speed for 5Mb file
10000      1     1    0,2
25000      2     1    0,7
50000      2     1    1,7
100000     3     1    3,3    <= rr is 3x faster
```

So even though the speed evolves very differently, there is only little practical use of the focus on speed for most use cases. Replacing in 10000 small files? Use RexReplace and go get a cup of coffee - or spend half an hour getting `sed` to work as you want it to and enjoy the thrilling few seconds it takes to do its magic.  

Please note that speeds might look very different when files get as large as the memory avaiable. 

## Rumours

### Inspiration

_.oO(What should "sed" have looked like by now?)_


### Future ideas

- Test-run with info outputted about what will happen (sets -t and does not change anything)
- Let search and replace be withing the names of the files (ask for overwriting. -Y = no questions)
- Let search and replace be within the path of the files (ask for overwriting. -Y = no questions)
- Piped data while having 1 globs = output is to be stored in this file (when no -rpo flags). Hmm. Could create misunderstandings. Might be better just to demand a `>`
- Piped data while having 2+ globs = error (when no -rpg flags)
- Let pattern, replacement, globs be piped
- Let Pattern, replacement, and globs come from file
- Let pattern, replacement, and glob be javascript code returning string as result
- Error != warning
- Debug != all debug
- Flag for sync or async read file handling. 
- Test if async or sync is best.
- Flag for simple string search (all other chars than [\n\r\t])
- Flag for plain string search litteral (no regex, no special chars, no escape chars)
- Check if https://github.com/eugeneware/replacestream is good to rely on
- Check if regex engine from spidermonkey can be wrapped in something that does not need node
- Implement in go, so all platforms can be supported with no need for node (might be based on)
- let https://github.com/dthree/vorpal deal with the interface? Or maybe https://www.npmjs.com/package/pretty-cli
- Expand speed test to compare all related projects
- Build step options into readme (`"[\s\S]+\nOptions:\n([\s\S]+?)\nExamples:[\s\S]+"`)
- Check if modular + compile is slower than minimonolit + require fs


## Related projects

There are many projects seeking to solve the same problem as RexReplace. Most lack the flexible CLI interface or are limited in how diverse the replacement can be. If our way does not suit you, we suggest you have a look at:

- [replace-in-file](https://www.npmjs.com/package/replace-in-file)
- [replace](https://www.npmjs.com/package/replace)
- [replace-x](https://www.npmjs.com/package/replace-x)
- [modify-filename](https://www.npmjs.com/package/modify-filename)
- [find-and-replace](https://www.npmjs.com/package/find-and-replace)


----


<img src="https://cloud.githubusercontent.com/assets/1063454/24103435/5a0e3746-0dd3-11e7-9f0e-fd8664348fbe.png" align="right" alt="RexReplace mascot Benny on the RexReplace logBo" />

Please note that RexReplace is an **OPEN open source project**. 
This means that individuals making significant and valuable contributions are given commit access to the project to contribute as they see fit. This project is more like an open wiki than a standard guarded open source project.

[![OPEN open source software](https://img.shields.io/badge/Open--OSS-%E2%9C%94-brightgreen.svg)](http://open-oss.com)


_<small>Icon inspired by <a href="http://www.freepik.com">Freepik</a> from <a href="http://www.flaticon.com">www.flaticon.com</a></small>_
